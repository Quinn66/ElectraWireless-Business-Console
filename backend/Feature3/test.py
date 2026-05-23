import json
import re
import time
from F3Insight_memory import retrieve_memories_by_intent, store_memories_batch
import os
from groq import Groq
from csv_analyzer import run as analyze_ticker

DATA_DIR = "ydata"

os.makedirs(DATA_DIR, exist_ok=True)
api_key = os.getenv("GROQ_API_KEY")

client = Groq(api_key=api_key)

# ================= FILE PATHS =================
INPUT_FILE = "../Llama Input/Feature_3_input.json"
OUTPUT_FILE = "../Llama Output/Feature_3_output.json"

# ================= CONFIG =================
MODEL_NAME = "llama3.1:8b"

EXPECTED_SECTIONS = [
    "summary",
    "pros",
    "cons",
    "next_steps",
    "question_response",
    "sources"
]

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

# 
def extract_stocks_only(data, user_question=None):

    prompt = f"""
You are a STRICT stock ticker extraction system.

USER QUESTION:
{user_question}

TASK:
Convert all mentioned companies into VALID Yahoo Finance ticker symbols.

RULES:
- Output ONLY valid Yahoo Finance tickers
- NEVER output company names
- NEVER output misspellings
- If unsure, guess the correct major ticker
- If no stocks → output NONE
- One ticker per line
- No explanations

FORMAT:
[SECTION: STOCKS]
<TICKER>
<TICKER>
"""

    res = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "Return ONLY STOCKS section."},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    return res.choices[0].message.content.strip()
# 
def extract_stock_lines(text):
    lines = []
    capture = False

    for line in text.split("\n"):
        line = line.strip()

        if line.lower().startswith("[section: stocks]"):
            capture = True
            continue

        if capture:
            if line.startswith("[SECTION:"):
                break

            if line and line.upper() != "NONE":
                lines.append(line)

    return lines
# 


def normalize_ticker(t):
    t = t.strip().upper()

    # simple crypto mapping
    if t == "BTC":
        return "BTC-USD"
    if t == "ETH":
        return "ETH-USD"

    return t


# def run_yfinance(stock_list):
#     results = []
#     print("\n🔧 YFINANCE LIVE MODE:")
#     for s in stock_list:
#         ticker = normalize_ticker(s)
#         try:
#             data = analyze_ticker(ticker)
#             if not data:
#                 raise ValueError("No data returned")
#             print("-", ticker)
#             results.append(data)
#         except Exception as e:
#             results.append({
#                 "ticker": ticker,
#                 "error": str(e)
#             })

#     return results
# 
# ================= BUILD PROMPT =================
def build_prompt(data, memories=None, user_question=None):
    question_block = ""

    if user_question:
        question_block = f"""

USER QUESTION:
{user_question}
"""
        
    memory_block = ""

    if memories:
        memory_block = "\n\n".join(memories)

    return f"""
You are a financial portfolio assistant.

RELEVANT PAST CONVERSATIONS:
{memory_block}

Your task is to analyze the provided portfolio JSON.

IMPORTANT RULES:
- Use provided JSON AND STOCK MARKET DATA if available
- Do NOT invent data
- Keep responses concise
- Use plain English
- Do NOT include disclaimers
- If information cannot be determined, say so
- Bullet points must start with "-"

INPUT JSON:
{json.dumps(data, indent=2)}

{question_block}

STRICT OUTPUT FORMAT:
- Section headers MUST match EXACTLY
- No extra sections
- No markdown headings

[SECTION: SUMMARY]
Write a short portfolio summary.

[SECTION: PROS]
- List portfolio strengths
- Max 5 bullets

[SECTION: CONS]
- List portfolio weaknesses or risks
- Max 5 bullets

[SECTION: NEXT_STEPS]
- List practical recommendations
- Max 5 bullets

[SECTION: QUESTION_RESPONSE]
Answer the following question without repeating the question
{user_question if user_question else "NO QUESTION PROVIDED"}
Answer ONLY if QUESTION is not "NO QUESTION PROVIDED".
If it is, respond with "No question provided."
If a question was provided:
Answer it directly in under 120 words.

[SECTION: SOURCES]
- List which datasets were used if any
"""


# ================= LOCAL OLLAMA =================
def get_analysis(prompt):

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a financial portfolio assistant."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2
        )

        return response.choices[0].message.content

    except Exception as e:
        print(f"❌ Groq request error: {e}")
        return ""


# ================= GENERIC SECTION PARSER =================
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


# ================= STRUCTURED PARSER =================
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


def build_memory_fact(parsed):

    summary = parsed.get("summary", "").strip()

    pros = parsed.get("pros", [])
    cons = parsed.get("cons", [])
    next_steps = parsed.get("next_steps", [])
    question_response = parsed.get("question_response", "").strip()
    sources = parsed.get("sources", [])

    key_strengths = ", ".join(pros[:2]) if pros else "none identified"
    key_risks = ", ".join(cons[:2]) if cons else "none identified"
    key_actions = ", ".join(next_steps[:2]) if next_steps else "none identified"
    key_sources = ", ".join(sources[:2]) if sources else "none identified"

    memory_text = f"""
Portfolio insight: {summary}
Key strengths: {key_strengths}
Key risks: {key_risks}
Recommended actions: {key_actions}
User question response: {question_response}
Data sources used: {key_sources}
""".strip()

    return memory_text

def store_sectioned_memories(user_question, parsed):

    base = user_question or "portfolio analysis"

    memories = []

    # 1. SUMMARY (single memory)
    if parsed.get("summary"):
        memories.append({
            "user": base + " summary",
            "assistant": parsed["summary"],
            "section": "summary"
        })

    # 2. PROS (single block memory)
    if parsed.get("pros"):
        pros_block = "\n".join(parsed["pros"])
        memories.append({
            "user": base + " pros",
            "assistant": pros_block,
            "section": "pros"
        })

    # 3. CONS (single block memory)
    if parsed.get("cons"):
        cons_block = "\n".join(parsed["cons"])
        memories.append({
            "user": base + " cons",
            "assistant": cons_block,
            "section": "cons"
        })

    # 4. NEXT STEPS (single block memory)
    if parsed.get("next_steps"):
        next_block = "\n".join(parsed["next_steps"])
        memories.append({
            "user": base + " next_steps",
            "assistant": next_block,
            "section": "next_steps"
        })

    # 5. RESPONSE (single memory)
    if parsed.get("question_response"):
        memories.append({
            "user": base + " response",
            "assistant": parsed["question_response"],
            "section": "response"
        })

    if memories:
        store_memories_batch(memories)

def detect_intent(question):

    q = question.lower()

    if any(x in q for x in ["risk", "reduce", "safe", "loss"]):
        return "cons"

    if any(x in q for x in ["next", "what should", "do", "improve"]):
        return "next_steps"

    if any(x in q for x in ["performance", "how is", "portfolio"]):
        return "summary"

    return "general"

# ================= MAIN =================
def run():
    start = time.perf_counter()

    data = load_input()
    if not data:
        return

    print("🔍 Generating analysis...\n")

    user_question = data.get("question", None)

    # STEP 2: STOCK EXTRACTION
    stock_section = extract_stocks_only(data, user_question)

    print("\n=== STOCK EXTRACTION ===")
    print(stock_section)

    stocks = extract_stock_lines(stock_section)
    print("\n🔧 YFINANCE LIVE MODE:")
    csv_analysis_data = analyze_ticker(stocks)

    # ================= MEMORY RETRIEVAL =================
    user_question = data.get("question", None)

    intent = detect_intent(user_question or "")
    query = user_question or "portfolio analysis"

    memories = retrieve_memories_by_intent(
        query=query,
        intent=intent
    )

    print("\n=== CONTEXT MEMORIES ===")
    if memories:
        for i, m in enumerate(memories):
            print(f"\n--- MEMORY {i+1} ---")
            print(m)
    else:
        print("No memories retrieved")

    # STEP 4: MAIN LLM ANALYSIS
    # ================= LOAD CSV ANALYSIS JSON =================
    csv_analysis_path = os.path.join(DATA_DIR, "csv_analysis_output.json")
    csv_analysis_data = []

    if os.path.exists(csv_analysis_path):
        with open(csv_analysis_path, "r", encoding="utf-8") as f:
            csv_analysis_data = json.load(f)

    # ================= BUILD FINAL PROMPT =================
    prompt = build_prompt(
        data,
        memories,
        user_question
    ) + f"""

    STOCK MARKET DATA ANALYSIS:
    {json.dumps(csv_analysis_data, indent=2)}

    IMPORTANT:
    - Use this stock market data when answering stock-related questions
    - Compare stock performance using change_pct
    - Mention stronger performers when relevant
    - Use ticker performance trends when suggesting additions to portfolio
    """

    raw_output = get_analysis(prompt)

    print("\n=== FINAL ANALYSIS ===")
    print(raw_output)

    parsed = parse_output(raw_output)
    save_output(parsed)

    store_sectioned_memories(user_question, parsed)

    print("\nTOTAL TIME:", time.perf_counter() - start)


if __name__ == "__main__":
    run()