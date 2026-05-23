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


def build_prompt(data, user_question=None, memories=None):

    question_block      = ""
    memory_block        = ""
    market_context_block = ""

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

    # Strip raw JSON down — exclude heavy fields the LLM doesn't need
    portfolio_json = {k: v for k, v in data.items() if k != "market_context"}

    return f"""
You are a financial portfolio assistant with access to live market data and recent news.

IMPORTANT RULES:
- Use the portfolio JSON, live market data, and news provided below
- Do NOT invent data or prices
- Keep responses concise and use plain English
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
Write a short portfolio summary (2-3 sentences).

[SECTION: PROS]
- List portfolio strengths
- Max 5 bullets

[SECTION: CONS]
- List portfolio weaknesses or risks
- Max 5 bullets

[SECTION: NEXT_STEPS]
- List practical recommendations based on the portfolio and any market data provided
- Max 5 bullets
- Must always include at least 1 bullet

[SECTION: QUESTION_RESPONSE]
If a question was provided, answer it directly using the live market data and news above.
Reference specific headlines or data points where relevant.
Keep under 200 words.

Otherwise write:
No question provided.

[SECTION: SOURCES]
- List which portfolio fields were used
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
        "sources": clean_bullets(sections.get("sources", ""))
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