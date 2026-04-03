import ollama
import json
import re
# Get user question
def get_user_question():
    print("=== Financial What-If Analysis Tool ===\n")
    return input("Enter your what-if finance question:\n> ")

# Send question directly to Ollama
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

    End the response after the "Next Steps" section; do not add any additional generic conclusions.
    """

    response = ollama.chat(
        model="llama3.2",
        messages=[{"role": "user", "content": prompt}],
        options={
            "num_predict": 1500  # increase output length
        }
    )

    return response.message.content

# output parse
def parse_output(text):
    sections = {
        "analysis_short": "",
        "analysis_detailed": "",
        "positives": [],
        "negatives": [],
        "next_steps": []
    }



    # Split sections
    parts = re.split(r"=== .* ===", text)

    if len(parts) >= 3:
        sections["analysis_short"] = clean_text(parts[1].strip())
        sections["analysis_detailed"] = clean_text(parts[2].strip())

    # Extract lists
    def extract_list(section_name):
        # Match section headers with optional extra text like "(Priority Order)"
        pattern = rf"{section_name}.*?:\s*(.*?)(\n\n|\Z)"
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

        if match:
            lines = match.group(1).strip().split("\n")

            cleaned = []
            for line in lines:
                line = line.strip()

                # Remove bullets or numbering (e.g., "-", "1.", etc.)
                line = re.sub(r"^[-*\d.\s]+", "", line)

                if line:
                    cleaned.append(clean_text(line))

            return cleaned

        return []

    sections["positives"] = extract_list("Positives")
    sections["negatives"] = extract_list("Negatives")
    sections["next_steps"] = extract_list("Next Steps")

    return sections

def clean_text(text):
    # Replace newlines and excessive whitespace
    return " ".join(text.split())

# output parse
# save as json
def save_to_json(data):
    filename = "Llama Output/analysis_output.json"
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)
    print(f"\n💾 Saved structured output to {filename}")
# save as json

# Main flow
def run():
    user_question = get_user_question()

    print("\n🔍 Generating analysis...\n")
    analysis = get_analysis(user_question)

    print("=== Analysis Output ===\n")
    print(analysis)

    # NEW: Parse + Save
    structured = parse_output(analysis)
    save_to_json(structured)


if __name__ == "__main__":
    run()