import json
import requests
import re
# =========================
# File paths
# =========================
INPUT_FILE = "../LLama Input/Feature_2_input.json"
OUTPUT_FILE_REPORT = "../Llama Output/Feature_2_output.json"
OUTPUT_FILE_QA = "../Llama Output/Feature_2_Qoutput.json"

# =========================
# Load JSON input
# =========================
def load_input():
    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ File not found: {INPUT_FILE}")
        return None
    except json.JSONDecodeError:
        print("❌ Invalid JSON format")
        return None

def parse_llm_output(text):
    sections = {}

    # -----------------------------------
    # UNIVERSAL SECTION PARSER (FIXED)
    # -----------------------------------
    pattern = r"\[SECTION:\s*([^\]]+)\]\s*(.*?)(?=\n\s*\[SECTION:|\Z)"

    matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)

    for name, content in matches:
        key = name.strip().lower()
        sections[key] = content.strip()

    structured = {}

    # -------------------------
    # Q&A MODE
    # -------------------------
    if "answer" in sections:
        structured["answer"] = sections.get("answer", "")

        insights_raw = sections.get("supporting_insights", "")
        structured["supporting_insights"] = [
            line.strip("•-* ").strip()
            for line in insights_raw.split("\n")
            if line.strip()
        ]

        return structured

    # -------------------------
    # REPORT MODE
    # -------------------------

    structured["summary"] = sections.get("summary", "")

    # HEALTH SCORE (now just raw passthrough + light extraction)
    health_raw = sections.get("health_score", "")
    structured["health_score"] = {
        "score": (
            int(m.group(1))
            if (m := re.search(r"\b(\d{2,3})\b", health_raw))
            else None
        ),
        "raw": health_raw.strip()
    }

    # ALERTS (pure structural split, no assumptions about format)
    alerts_raw = sections.get("alerts", "")
    alerts = []

    for line in alerts_raw.split("\n"):
        line = line.strip()
        if not line:
            continue

        line = re.sub(r"\*\*", "", line)  # remove bold markdown

        alerts.append(line)

    structured["alerts"] = alerts

    # RISKS / OPPORTUNITIES / OTHERS (generic bullet extractor)
    def extract_bullets(text):
        return [
            re.sub(r"^[\*\-\•]\s*", "", line).strip()
            for line in text.split("\n")
            if line.strip()
        ]

    structured["risks"] = extract_bullets(sections.get("risks", ""))
    structured["opportunities"] = extract_bullets(sections.get("opportunities", ""))

    # RECOMMENDED ACTIONS
    actions_raw = sections.get("recommended_actions", "")
    structured["recommended_actions"] = [
        re.sub(r"^\d+\.\s*", "", line).strip()
        for line in actions_raw.split("\n")
        if re.match(r"^\d+\.", line.strip())
    ]

    structured["spending_patterns"] = sections.get("spending_patterns", "")

    return structured

# Build prompt
def build_finance_prompt(data):
    question = data.get("question", "").strip()

    base_prompt = f"""
You are a financial and behavioral spending analysis assistant.

INPUT JSON:
{json.dumps(data, indent=2)}

CRITICAL RULES:
1. Only use values explicitly present in the JSON.
2. Do NOT fabricate data.
3. Keep language simple and direct.
"""

    # MODE 1: No question (auto page load)
    if not question:
        return base_prompt + """

Your task is to generate a full financial report.

Follow this EXACT format:

[SECTION: SUMMARY]
- Provide a short overview of the user's overall financial situation.
- Mention key figures like income, expenses, net cash flow, and general financial health if available.
- Keep it clear and easy to read.

[SECTION: HEALTH_SCORE]
- Explain the user's financial health score in simple terms.
- Include the score if provided.
- Briefly describe what the score indicates.

[SECTION: ALERTS]
- List any important financial alerts or warnings.
- Use bullet points for each alert.
- If no alerts exist, state that clearly.

[SECTION: SPENDING_PATTERNS]
- Summarize how the user spends money overall.
- Break down key spending categories in bullet points if available.
- Highlight any noticeable patterns.

[SECTION: RISKS]
- List potential financial risks based on the data.
- Keep each point short and direct.

[SECTION: OPPORTUNITIES]
- List areas where the user could improve their financial situation.
- Focus on practical and realistic improvements.

[SECTION: RECOMMENDED_ACTIONS]
- Provide a short list of helpful next steps.
- Keep actions clear and easy to follow.
- No need for strict ordering unless naturally obvious.

END OF REPORT
"""

    # MODE 2: Question asked
    else:
        return base_prompt + f"""

The user has asked the following question:

"{question}"

Your task:
- Answer the question directly using ONLY the provided data
- Be concise and focused
- Do NOT generate the full report
- Do NOT include sections unless needed

OUTPUT FORMAT:

[SECTION: ANSWER]
- Direct answer to the question
- Include supporting numbers from the data
- Keep it under 5 sentences

[SECTION: SUPPORTING_INSIGHTS]
- Bullet points of relevant supporting observations

END OF RESPONSE
"""

# Call Ollama
def get_analysis(prompt):
    url = "http://localhost:11434/api/generate"

    payload = {
        "model": "llama3.2",
        "prompt": prompt,
        "stream": False
    }

    response = requests.post(url, json=payload)

    if response.status_code != 200:
        raise Exception(f"Ollama error: {response.text}")

    return response.json()["response"]

# Save output
def save_output(raw_text, output_path):
    parsed = parse_llm_output(raw_text)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2)

    print(f"💾 Saved structured output to {output_path}")

# Main flow
def run():
    data = load_input()
    if not data:
        return

    question = data.get("question", "").strip()
    has_question = bool(question)

    print("🔍 Generating financial summary...\n")

    prompt = build_finance_prompt(data)
    result = get_analysis(prompt)

    print("=== LLM OUTPUT ===\n")
    print(result)

    # Route output based on mode
    if has_question:
        save_output(result, OUTPUT_FILE_QA)
    else:
        save_output(result, OUTPUT_FILE_REPORT)


if __name__ == "__main__":
    run()