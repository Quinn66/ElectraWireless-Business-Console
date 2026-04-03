import ollama
import json
import re
import os

# =============================
# 📥 Load question from JSON
# =============================
def get_user_question():
    folder = "Llama Input"
    filepath = os.path.join(folder, "Input.json")

    if not os.path.exists(filepath):
        raise FileNotFoundError(f"❌ Input file not found: {filepath}")

    with open(filepath, "r") as f:
        data = json.load(f)

    user_question = data.get("question")

    if not user_question:
        raise ValueError("❌ 'question' field missing in Input.json")

    print("=== Financial What-If Analysis Tool ===\n")
    print(f"📥 Loaded question:\n> {user_question}\n")

    return user_question


# =============================
# 🤖 Send to Ollama
# =============================
def get_analysis(user_question):
    prompt = f"""
    You are a financial analysis assistant.

    User question:
    "{user_question}"

    Your goal is to provide a concise, actionable analysis
    that could be used to model financial impact or generate
    relevant search queries for further research.

    Rules:

    1. Only use numbers if they are explicitly given by the user.
    2. If no numeric information is provided, describe general trends only.
    3. Do NOT fabricate any data or estimates.
    4. Use clear, simple language (no jargon or acronyms).
    5. Do NOT ask for clarification.

    Output structure:

    === Analysis (Short Summary) ===
    - 2–3 concise sentences summarizing the overall impact

    === Analysis (Detailed) ===
    - A more detailed explanation of expected impact
    - Explain key drivers (costs, revenue, demand, efficiency, etc.)
    - Highlight cause-and-effect relationships clearly

    === Suggestions ===

    Positives:
    - List 2–3 potential benefits

    Negatives:
    - List 2–3 potential risks or downsides

    Next Steps (Priority Order):
    1. Highest priority action
    2. Second priority action
    3. Third priority action
    4. Lowest priority action (if applicable)

    End the response after the "Next Steps" section.
    """

    response = ollama.chat(
        model="llama3.2",
        messages=[{"role": "user", "content": prompt}],
        options={
            "num_predict": 1500
        }
    )

    return response.message.content


# =============================
# 🧹 Clean text
# =============================
def clean_text(text):
    return " ".join(text.split())


# =============================
# 🧠 Parse output
# =============================
def parse_output(text):
    sections = {
        "analysis_short": "",
        "analysis_detailed": "",
        "positives": [],
        "negatives": [],
        "next_steps": []
    }

    parts = re.split(r"=== .* ===", text)

    if len(parts) >= 3:
        sections["analysis_short"] = clean_text(parts[1].strip())
        sections["analysis_detailed"] = clean_text(parts[2].strip())

    def extract_list(section_name):
        pattern = rf"{section_name}.*?:\s*(.*?)(\n\n|\Z)"
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

        if match:
            lines = match.group(1).strip().split("\n")

            cleaned = []
            for line in lines:
                line = line.strip()
                line = re.sub(r"^[-*\d.\s]+", "", line)

                if line:
                    cleaned.append(clean_text(line))

            return cleaned

        return []

    sections["positives"] = extract_list("Positives")
    sections["negatives"] = extract_list("Negatives")
    sections["next_steps"] = extract_list("Next Steps")

    return sections


# =============================
# 💾 Save JSON
# =============================
def save_to_json(data):
    folder = "Llama Output"
    os.makedirs(folder, exist_ok=True)  # ensure folder exists

    filepath = os.path.join(folder, "analysis_output.json")

    with open(filepath, "w") as f:
        json.dump(data, f, indent=4)

    print(f"\n💾 Saved structured output to {filepath}")


# =============================
# 🚀 Main flow
# =============================
def run():
    user_question = get_user_question()

    print("\n🔍 Generating analysis...\n")
    analysis = get_analysis(user_question)

    print("=== Analysis Output ===\n")
    print(analysis)

    structured = parse_output(analysis)
    save_to_json(structured)


if __name__ == "__main__":
    run()