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

    # Regex to capture each section block
    pattern = r"\[SECTION: (.*?)\]\n(.*?)(?=\n\[SECTION:|\nEND OF REPORT|\nEND OF RESPONSE|$)"
    matches = re.findall(pattern, text, re.DOTALL)

    for name, content in matches:
        key = name.strip().lower()
        sections[key] = content.strip()

    structured = {}

    # -------------------------
    # ✅ Q&A MODE DETECTION
    # -------------------------
    if "answer" in sections:
        structured["answer"] = sections.get("answer", "")

        insights_raw = sections.get("supporting_insights", "")
        structured["supporting_insights"] = [
            line.strip("•- ").strip()
            for line in insights_raw.split("\n")
            if line.strip()
        ]

        return structured  # 🔥 EARLY RETURN for Q&A mode

    # -------------------------
    # 📊 REPORT MODE (existing logic)
    # -------------------------

    structured["summary"] = sections.get("summary", "")

    health_raw = sections.get("health_score", "")
    health = {}

    score_match = re.search(r"Score:\s*(\d+)", health_raw)
    interp_match = re.search(r"Interpretation:\s*(.*)", health_raw)
    trend_match = re.search(r"Trend:\s*(.*)", health_raw)

    if score_match:
        health["score"] = int(score_match.group(1))
    if interp_match:
        health["interpretation"] = interp_match.group(1).strip()
    if trend_match:
        health["trend"] = trend_match.group(1).strip()

    structured["health_score"] = health

    alerts_raw = sections.get("alerts", "")
    alerts = []

    alert_pattern = r"- Alert:\s*(.*?)\n\s*Meaning:\s*(.*?)\n\s*Urgency:\s*(.*)"
    for match in re.findall(alert_pattern, alerts_raw):
        alerts.append({
            "alert": match[0].strip(),
            "meaning": match[1].strip(),
            "urgency": match[2].strip()
        })

    if not alerts and "No alerts" in alerts_raw:
        alerts = []

    structured["alerts"] = alerts

    def extract_bullets(text):
        return [line.strip("•- ").strip() for line in text.split("\n") if line.strip()]

    structured["risks"] = extract_bullets(sections.get("risks", ""))
    structured["opportunities"] = extract_bullets(sections.get("opportunities", ""))

    actions_raw = sections.get("recommended_actions", "")
    actions = []

    for line in actions_raw.split("\n"):
        match = re.match(r"\d+\.\s*(.*)", line.strip())
        if match:
            actions.append(match.group(1).strip())

    structured["recommended_actions"] = actions
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

    # -------------------------
    # MODE 1: No question (auto page load)
    # -------------------------
    if not question:
        return base_prompt + """

Your task is to generate a full financial report.

Follow this EXACT format:

[SECTION: SUMMARY]
...

[SECTION: HEALTH_SCORE]
...

[SECTION: ALERTS]
...

[SECTION: SPENDING_PATTERNS]
...

[SECTION: RISKS]
...

[SECTION: OPPORTUNITIES]
...

[SECTION: RECOMMENDED_ACTIONS]
...

END OF REPORT
"""

    # -------------------------
    # MODE 2: Question asked
    # -------------------------
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