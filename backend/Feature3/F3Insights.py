import json
import re
import requests

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


# ================= BUILD PROMPT =================
def build_prompt(data, user_question=None):

    question_block = ""

    if user_question:
        question_block = f"""

USER QUESTION:
{user_question}
"""

    return f"""
You are a financial portfolio assistant.

Your task is to analyze the provided portfolio JSON.

IMPORTANT RULES:
- ONLY use the provided JSON
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
If a question was provided:
Answer it directly in under 120 words.

Otherwise write:
No question provided.

[SECTION: SOURCES]
- List which portfolio fields were used
"""


# ================= LOCAL OLLAMA =================
def get_analysis(prompt):

    url = "http://localhost:11434/api/generate"

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }

    try:
        response = requests.post(url, json=payload)

        if response.status_code != 200:
            print("❌ Ollama request failed")
            print(response.text)
            return ""

        return response.json().get("response", "")

    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
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


# ================= MAIN =================
def run():

    data = load_input()

    if not data:
        return

    print("🔍 Generating analysis...\n")

    # Future frontend textbox input
    user_question = None

    prompt = build_prompt(data, user_question)

    raw_output = get_analysis(prompt)

    print("=== RAW LLM OUTPUT ===\n")
    print(raw_output)

    parsed = parse_output(raw_output)

    # print("\n=== PARSED OUTPUT ===\n")
    # print(json.dumps(parsed, indent=2))

    save_output(parsed)


if __name__ == "__main__":
    run()