import json
import re
import os

from fastapi import FastAPI
from pydantic import BaseModel
from groq import Groq

# ================= FASTAPI =================
app = FastAPI()

# ================= FILE PATHS =================
INPUT_FILE = "../Llama Input/Feature_3_input.json"
OUTPUT_FILE = "../Llama Output/Feature_3_output.json"

# ================= CONFIG =================
MODEL_NAME = "llama-3.1-8b-instant"

# ================= GROQ CLIENT =================
client = Groq(
    api_key=os.environ.get("GROQ_API_KEY")
)

# ================= REQUEST MODEL =================
class PortfolioRequest(BaseModel):
    data: dict


# ================= LOAD INPUT =================
def load_input():

    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    except FileNotFoundError:
        print(f"❌ Could not find {INPUT_FILE}")

    except json.JSONDecodeError:
        print("❌ Invalid JSON")

    return None


# ================= BUILD PROMPT =================
def _build_market_context_block(market_context: dict) -> str:
    if not market_context:
        return ""

    lines = ["\n=== LIVE MARKET DATA ==="]

    ticker_data = market_context.get("ticker_data", {})
    for sym, td in ticker_data.items():
        lines.append(f"\n{sym}:")
        if td.get("current_price"):
            lines.append(f"  Current price:   ${td['current_price']}")
        if td.get("one_year_cagr") is not None:
            lines.append(f"  1-year CAGR:     {td['one_year_cagr']}%")
        if td.get("volatility_pct") is not None:
            lines.append(f"  Annualised vol:  {td['volatility_pct']}%")
        if td.get("pe_ratio"):
            lines.append(f"  P/E ratio:       {td['pe_ratio']}")
        if td.get("sector"):
            lines.append(f"  Sector:          {td['sector']}")
        if td.get("fifty_two_week_high") and td.get("fifty_two_week_low"):
            lines.append(f"  52-week range:   ${td['fifty_two_week_low']} – ${td['fifty_two_week_high']}")

    projection = market_context.get("hypothetical_projection")
    if projection:
        lines.append(f"\n=== HYPOTHETICAL PROJECTION ===")
        lines.append(f"If ${projection['invested']:,.2f} were invested in {projection['symbol']} today:")
        lines.append(f"  Units bought:      {projection['units_bought']} @ ${projection['current_price']}")
        lines.append(f"  Projected value:   ${projection['projected_value']:,.2f} after {projection['projected_years']} years")
        lines.append(f"  Projected gain:    ${projection['projected_gain']:,.2f} ({projection['projected_gain_pct']:+.2f}%)")
        lines.append(f"  Based on 1yr CAGR: {projection['based_on_cagr_pct']}%")
        lines.append(f"  Note: {projection['note']}")

    hist = market_context.get("historical_performance")
    if hist:
        lines.append(f"\n=== HISTORICAL SCENARIO: IF BOUGHT IN {hist['year']} ===")
        lines.append(f"Total cost if purchased in {hist['year']}: ${hist['total_cost_in_year']:,.2f}")
        lines.append(f"Current value today:                      ${hist['total_current_value']:,.2f}")
        lines.append(f"Total profit / loss:                      ${hist['total_profit_loss']:,.2f}")
        lines.append(f"Total return:                             {hist['total_return_pct']:+.2f}%")
        lines.append("\nPer-holding breakdown:")
        for h in hist["holdings"]:
            lines.append(
                f"  {h['symbol']}: bought at ${h['price_in_year']} → now ${h['current_price']} "
                f"({h['quantity']} units) | P&L: ${h['profit_loss']:,.2f} ({h['return_pct']:+.2f}%)"
            )
        if hist.get("skipped_symbols"):
            lines.append(f"  (No data available for: {', '.join(hist['skipped_symbols'])})")
        lines.append(f"  Note: {hist['note']}")

    news = market_context.get("news", {})
    company_news = news.get("company", {})
    market_news  = news.get("market", [])

    if company_news:
        lines.append("\n=== RECENT COMPANY NEWS ===")
        for sym, articles in company_news.items():
            if articles:
                lines.append(f"\n{sym} headlines:")
                for a in articles:
                    lines.append(f"  - {a['headline']}")
                    if a.get("summary"):
                        lines.append(f"    {a['summary']}")

    if market_news:
        lines.append("\n=== GENERAL MARKET NEWS ===")
        for a in market_news:
            lines.append(f"  - {a['headline']}")
            if a.get("summary"):
                lines.append(f"    {a['summary']}")

    return "\n".join(lines)


# ================= ONBOARDING PROFILE → DIRECTIVES =================
_STYLE_DIRECTIVES = {
    "technical": (
        "Write as an investment analyst. Use precise financial vocabulary "
        "(CAGR, annualised volatility, concentration risk, Sharpe-style framing, "
        "drawdown, rebalancing thresholds, weighting deltas). Quantify wherever "
        "possible — prefer numbers, ratios, and percentages over generic phrasing."
    ),
    "simple": (
        "Explain in plain, conversational English. Avoid jargon; when a financial "
        "term is unavoidable, define it in one short clause. Prefer analogies and "
        "round numbers over precise decimals."
    ),
}

_EXPERIENCE_DIRECTIVES = {
    "beginner":     "Assume the user is new to investing. Build context before recommendations.",
    "intermediate": "Assume working knowledge of asset classes and portfolio basics.",
    "advanced":     "Assume the user understands portfolio theory, risk metrics, and market mechanics. Skip definitions.",
}

def _capital_directive(amount):
    """Map the user's stated investment capital ($ value, 0 – 500,000) to a
    framing directive for the LLM. The tiers loosely mirror the previous
    low / moderate / high buckets but scale with reported capital."""
    try:
        value = float(amount)
    except (TypeError, ValueError):
        return None
    if value < 25_000:
        tier = "limited"
        guidance = (
            "Treat the user as having limited investable capital. Emphasise "
            "fundamentals (emergency fund, low-cost broad-market exposure) and "
            "avoid recommending capital-intensive strategies."
        )
    elif value < 150_000:
        tier = "moderate"
        guidance = (
            "Assume standard personal-finance literacy and a moderate capital "
            "base. Diversification and tax-aware framing are appropriate."
        )
    else:
        tier = "substantial"
        guidance = (
            "Assume a substantial capital base and strong personal-finance "
            "literacy. Advanced allocation, risk-budgeting, and tax framing "
            "are fair game."
        )
    return f"reported capital ${value:,.0f} ({tier}): {guidance}"


def _build_onboarding_block(onboarding):
    """Translate the onboarding profile into explicit instructions for the LLM.

    Returned text is empty when no profile is available, so the prompt degrades
    gracefully for users who skipped onboarding."""
    if not onboarding or not onboarding.get("available"):
        return ""

    style       = (onboarding.get("communicationStyle") or "").lower()
    experience  = (onboarding.get("experienceLevel")    or "").lower()
    capital     = onboarding.get("investmentCapital")
    strategies  = onboarding.get("investmentStrategies") or []
    horizon     = onboarding.get("timeHorizon") or ""
    interests   = onboarding.get("assetInterests") or []
    age         = onboarding.get("age")

    lines = [
        "=== USER PROFILE (from onboarding) — adapt every section to this ===",
        "When the user asks about THEIR profile (experience level, age, investment "
        "capital, strategies, horizon, asset interests, communication style), the "
        "literal facts below are the ground truth — quote them verbatim in "
        "QUESTION_RESPONSE. Do not paraphrase, restate as ranges, or substitute "
        "portfolio totals for these values.",
        "",
        "PROFILE FACTS (verbatim):",
        f"- age: {age if age is not None else 'unspecified'}",
        f"- experienceLevel: {experience or 'unspecified'}",
        f"- investmentCapital: ${(capital or 0):,}",
        f"- communicationStyle: {style or 'unspecified'}",
        f"- investmentStrategies: {', '.join(strategies) if strategies else 'unspecified'}",
        f"- timeHorizon: {horizon or 'unspecified'}",
        f"- assetInterests: {', '.join(interests) if interests else 'unspecified'}",
        "",
        "PROFILE-DRIVEN STYLE DIRECTIVES:",
    ]

    style_directive = _STYLE_DIRECTIVES.get(style)
    if style_directive:
        lines.append(f"Communication style ({style}): {style_directive}")

    exp_directive = _EXPERIENCE_DIRECTIVES.get(experience)
    if exp_directive:
        lines.append(f"Experience ({experience}): {exp_directive}")

    cap_directive = _capital_directive(capital)
    if cap_directive:
        lines.append(f"Investment capital — {cap_directive}")

    if strategies:
        lines.append(
            f"Stated strategies: {', '.join(strategies)}. Bias NEXT_STEPS toward "
            "suggestions compatible with these styles; do not push moves that "
            "contradict them (e.g., no day-trading tactics for a buy_and_hold or "
            "index investor)."
        )

    if horizon:
        lines.append(
            f"Time horizon: '{horizon}'. Frame recommendations accordingly — short "
            "horizons emphasise liquidity and volatility; long horizons emphasise "
            "compounding and drawdown tolerance."
        )

    if interests:
        lines.append(
            f"Asset interests: {', '.join(interests)}. Prefer suggestions within "
            "these classes; do not push assets the user did not select."
        )

    lines.append(
        "You MAY include at most ONE bullet in NEXT_STEPS that falls outside the "
        "user's stated strategy or asset interests if it is genuinely material — "
        "prefix that bullet with 'Outside your stated style:' so it is clearly flagged."
    )

    return "\n".join(lines)


def build_prompt(data, user_question=None, memories=None):

    question_block       = ""
    memory_block         = ""
    market_context_block = ""
    onboarding_block     = ""

    if user_question:
        question_block = f"""

USER QUESTION:
{user_question}
"""

    if memories:
        joined = "\n\n---\n\n".join(memories)
        memory_block = f"""

MEMORY CONTEXT (previous conversations with this user — use this to personalise your response):
{joined}
"""

    market_context = data.pop("market_context", None) or {}
    if market_context:
        market_context_block = _build_market_context_block(market_context)

    onboarding_profile = data.get("onboarding") or {}
    onboarding_directives = _build_onboarding_block(onboarding_profile)
    if onboarding_directives:
        onboarding_block = f"\n{onboarding_directives}\n"

    # Tone rule defers to the onboarding profile when one is available; otherwise
    # fall back to the historical "plain English" default.
    tone_rule = (
        "Keep responses concise. Tone, depth, and vocabulary MUST follow the USER PROFILE above."
        if onboarding_directives
        else "Keep responses concise and use plain English"
    )

    # Strip raw JSON down — exclude heavy fields the LLM doesn't need
    portfolio_json = {k: v for k, v in data.items() if k != "market_context"}

    return f"""
You are a financial portfolio assistant with access to live market data and recent news.
{onboarding_block}
IMPORTANT RULES:
- Use the portfolio JSON, live market data, and news provided below
- Do NOT invent data or prices
- {tone_rule}
- Do NOT include disclaimers
- Bullet points must start with "-"
- If market data or news is present, reference it directly in your answer
- If a hypothetical projection is provided, use those exact numbers
- When citing news, always state which company the headline is actually about — never attribute a story about Company X to Company Y even if Company Y is mentioned in the article

PORTFOLIO DATA:
{json.dumps(portfolio_json, indent=2)}
{market_context_block}
{memory_block}
{question_block}

STRICT OUTPUT FORMAT:
- Section headers MUST match EXACTLY
- No extra sections
- No markdown headings

[SECTION: SUMMARY]
Write a short portfolio summary (2-3 sentences) in the tone dictated by the USER PROFILE.
Open with one clause that names the user's experience level AND one other profile fact
(strategy, horizon, OR capital) — e.g. "As a beginner buy-and-hold investor with
$50,000 of capital, your portfolio …". Use the literal values from PROFILE FACTS.

[SECTION: PROS]
- List portfolio strengths
- Max 5 bullets
- At least one bullet must reference how a strength aligns with a PROFILE FACTS value
  (strategy, horizon, asset interest, capital, or experience level)

[SECTION: CONS]
- List portfolio weaknesses or risks
- Max 5 bullets
- At least one bullet must reference how a weakness conflicts with a PROFILE FACTS value
  (e.g. exposure exceeds the user's capital, strategy mismatch, horizon mismatch)

[SECTION: NEXT_STEPS]
- List practical recommendations based on the portfolio and any market data provided
- Max 5 bullets
- Must always include at least 1 bullet
- Every bullet must respect the user's stated strategies, time horizon, asset interests,
  and capital — name the specific PROFILE FACTS value the bullet is honouring
  (e.g. "(fits buy_and_hold)", "(within $50,000 capital)")

[SECTION: QUESTION_RESPONSE]
If a question was provided, answer it directly. Choose your source based on what the
question is asking about:
- Profile questions ("what is my experience level / age / capital / strategy / horizon / interests")
  → quote the matching PROFILE FACTS value verbatim from the USER PROFILE block.
  Do NOT answer with a portfolio summary or paraphrase the value.
- Portfolio questions → use the PORTFOLIO DATA, live market data, and news; reference
  specific holdings, headlines, or data points where relevant.
- Hypotheticals → use any provided projection numbers exactly.
Keep under 200 words.

Otherwise write:
No question provided.

[SECTION: SOURCES]
- List which portfolio fields were used
- If the USER PROFILE shaped the response, include "onboarding" in this list
"""


# ================= GROQ CALL =================
def get_analysis(prompt):

    try:

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=1200
        )

        return response.choices[0].message.content

    except Exception as e:
        print(f"❌ Groq request failed: {e}")
        return ""


# ================= SECTION EXTRACTION =================
def extract_sections(text):

    pattern = r"\[SECTION:\s*([^\]]+)\]\s*(.*?)(?=\n\s*\[SECTION:|\Z)"

    matches = re.findall(
        pattern,
        text,
        re.DOTALL | re.IGNORECASE
    )

    sections = {}

    for name, content in matches:
        key = name.strip().lower()
        sections[key] = content.strip()

    return sections


# ================= BULLET CLEANER =================
def clean_bullets(text):

    bullets = []

    for line in text.split("\n"):

        line = line.strip()

        if not line:
            continue

        cleaned = re.sub(r"^[\-\*\•]\s*", "", line)

        bullets.append(cleaned)

    return bullets


# ================= PARSER =================
def parse_output(text):

    sections = extract_sections(text)

    structured = {
        "summary": sections.get("summary", ""),
        "pros": clean_bullets(sections.get("pros", "")),
        "cons": clean_bullets(sections.get("cons", "")),
        "next_steps": clean_bullets(sections.get("next_steps", "")),
        "question_response": sections.get("question_response", ""),
        "sources": clean_bullets(sections.get("sources", "")),
        "profile_context": "",   # populated downstream by main.py
    }

    return structured


# ================= SAVE OUTPUT =================
def save_output(parsed_data):

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(parsed_data, f, indent=2)

    print(f"💾 Saved to {OUTPUT_FILE}")


# ================= FASTAPI ROUTE =================
@app.post("/pf/portfolio-analysis")
def portfolio_analysis(request: PortfolioRequest):

    data = request.data

    user_question = data.get("question", "").strip()

    if not user_question:
        user_question = None

    print("🔍 FastAPI /pf/portfolio-analysis called...")

    prompt = build_prompt(data, user_question)

    raw_output = get_analysis(prompt)

    structured = parse_output(raw_output)

    save_output(structured)

    return structured


# ================= CLI RUN =================
def run():

    data = load_input()

    if not data:
        return

    user_question = data.get("question", "").strip()

    if not user_question:
        user_question = None

    print("🔍 Generating portfolio analysis...\n")

    prompt = build_prompt(data, user_question)

    raw_output = get_analysis(prompt)

    print("=== RAW LLM OUTPUT ===\n")
    print(raw_output)

    parsed = parse_output(raw_output)

    print("\n=== PARSED OUTPUT ===\n")
    print(json.dumps(parsed, indent=2))

    save_output(parsed)


if __name__ == "__main__":
    run()