import json
import requests
import re
# =========================
# File paths
# =========================
INPUT_FILE = "../LLama Input/Feature_2_input.json"
OUTPUT_FILE = "../Llama Output/Feature_2_output.json"

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
    pattern = r"\[SECTION: (.*?)\]\n(.*?)(?=\n\[SECTION:|\nEND OF REPORT|$)"
    matches = re.findall(pattern, text, re.DOTALL)

    for name, content in matches:
        key = name.strip().lower()
        sections[key] = content.strip()

    # --- Optional deeper parsing per section ---
    structured = {}

    # SUMMARY
    structured["summary"] = sections.get("summary", "")

    # HEALTH SCORE
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

    # ALERTS
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

    # RISKS / OPPORTUNITIES (bullet lists)
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
    prompt = f"""
You are a financial and behavioral spending analysis assistant.

You will be given a JSON input containing financial summary data, including:
- Account metadata
- Health score (overall financial health indicator)
- Alerts (warnings or notable events)
- Spending patterns (categories, trends, anomalies)

INPUT JSON:
{json.dumps(data, indent=2)}

Your task is to analyze the data and produce a structured, clear, and actionable report.

CRITICAL RULES:
1. Only use values explicitly present in the JSON. Do NOT guess or infer missing numbers.
2. Do NOT fabricate trends, categories, or financial values.
3. Focus only on what is observable in the data.
4. Keep language simple and direct.
5. Do NOT ask questions or request clarification.
6. Prioritize insights from:
   - Health score
   - Alerts
   - Spending patterns

OUTPUT FORMAT (STRICT — follow exactly):

[SECTION: SUMMARY]
- Provide 2–4 sentences describing overall financial condition
- Must reference health score and observable spending behavior

[SECTION: HEALTH_SCORE]
- Score: <value from JSON>
- Interpretation: <what the score indicates>
- Trend: <Improving | Stable | Declining | Unknown (if not supported by data)>

[SECTION: ALERTS]
- If no alerts: "No alerts present"
- Otherwise list each alert as:
  - Alert: <alert name or description>
    Meaning: <practical explanation>
    Urgency: <Low | Medium | High (only if implied by data)>

[SECTION: SPENDING_PATTERNS]
- Overview: <1–2 sentence summary>
- Key Categories:
  - <Category>: <observation>
- Anomalies:
  - <Only include if explicitly present in data>

[SECTION: RISKS]
- Bullet list of risks directly supported by the data
- If none: "No significant risks identified"

[SECTION: OPPORTUNITIES]
- Bullet list of improvements or optimizations
- Must be grounded in observed data

[SECTION: RECOMMENDED_ACTIONS]
1. <Most urgent corrective action>
2. <Important cost or risk reduction action>
3. <Medium-term improvement action>
4. <Optional optimization>

END OF REPORT
"""
    return prompt

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
def save_output(raw_text):
    parsed = parse_llm_output(raw_text)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2)

    print(f"💾 Saved structured output to {OUTPUT_FILE}")

# Main flow
def run():
    data = load_input()
    if not data:
        return

    print("🔍 Generating financial summary...\n")

    prompt = build_finance_prompt(data)
    result = get_analysis(prompt)

    print("=== LLM OUTPUT ===\n")
    print(result)

    save_output(result)


if __name__ == "__main__":
    run()