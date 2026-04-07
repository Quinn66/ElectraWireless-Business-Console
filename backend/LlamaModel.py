import os
import json
import re
from groq import Groq
from fastapi import FastAPI
from pydantic import BaseModel

# =========================
# FastAPI setup
# =========================
app = FastAPI()

class QuestionRequest(BaseModel):
    question: str

# =========================
# FastAPI endpoint
# =========================
@app.post("/analyze")
def analyze(request: QuestionRequest):
    # Use your existing get_analysis() + parse_output()
    analysis = get_analysis(request.question)
    structured = parse_output(analysis)
    return structured

# Get user question
def get_user_question():
    print("=== Financial What-If Analysis Tool (JSON Input) ===\n")

    filename = "Llama Input/input.json"

    try:
        with open(filename, "r") as f:
            data = json.load(f)

        question = data.get("question", "").strip()

        if not question:
            raise ValueError("No 'question' field found in JSON.")

        return question

    except FileNotFoundError:
        print(f"❌ File not found: {filename}")
        return ""

    except json.JSONDecodeError:
        print("❌ Invalid JSON format.")
        return ""

    except Exception as e:
        print(f"❌ Error: {e}")
        return ""

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

    End the response after the "Next Steps" section make sure to include the next steps section aswell; do not add any additional generic conclusions.
    """

    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1500,
    )

    return response.choices[0].message.content

# output parse
# =========================
# Output parse (robust version using hard anchor for Next Steps)
# =========================
def parse_output(text):
    sections = {
        "analysis_short": "",
        "analysis_detailed": "",
        "positives": [],
        "negatives": [],
        "next_steps": []
    }

    current_section = None

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Detect section headers
        if line.startswith("==="):
            if "Short Summary" in line:
                current_section = "analysis_short"
            elif "Detailed" in line:
                current_section = "analysis_detailed"
            elif "Next Steps" in line:
                current_section = "next_steps"
            else:
                current_section = None
            continue

        # Detect keyword-based sections for Positives/Negatives
        # Detect keyword-based sections
        if line.startswith("Positives:"):
            current_section = "positives"
            continue
        elif line.startswith("Negatives:"):
            current_section = "negatives"
            continue
        elif line.startswith("Next Steps"):
            current_section = "next_steps"
            continue

        # Append content to the appropriate section
        if current_section in ["analysis_short", "analysis_detailed"]:
            sections[current_section] += (" " + line if sections[current_section] else line)
        elif current_section in ["positives", "negatives", "next_steps"]:
            # Remove bullets, numbers, or dashes at the start
            line_clean = re.sub(r"^[-*\d.\s]+", "", line)
            if line_clean:
                sections[current_section].append(clean_text(line_clean))

    # Final cleanup: remove extra spaces
    sections["analysis_short"] = clean_text(sections["analysis_short"])
    sections["analysis_detailed"] = clean_text(sections["analysis_detailed"])

    return sections

    # old method to be removed just reference
    # # Extract lists
    # def extract_list(section_name):
    #     # Match section headers with optional extra text like "(Priority Order)"
    #     pattern = rf"{section_name}.*?:\s*(.*?)(\n\n|\Z)"
    #     match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

    #     if match:
    #         lines = match.group(1).strip().split("\n")

    #         cleaned = []
    #         for line in lines:
    #             line = line.strip()

    #             # Remove bullets or numbering (e.g., "-", "1.", etc.)
    #             line = re.sub(r"^[-*\d.\s]+", "", line)

    #             if line:
    #                 cleaned.append(clean_text(line))

    #         return cleaned

    #     return []

    # sections["positives"] = extract_list("Positives")
    # sections["negatives"] = extract_list("Negatives")
    # sections["next_steps"] = extract_list("Next Steps")

    # return sections

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