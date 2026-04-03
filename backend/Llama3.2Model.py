import ollama

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

    === Analysis ===
    - Brief explanation of expected impact
    - Explain how key factors affect outcomes

    === Suggestions ===

    Positives:
    - List 2–3 potential benefits

    Negatives:
    - List 2–3 potential risks or downsides

    Next Steps:
    - List 2–4 practical actions the user could take
    - Focus on improving decision-making or reducing risk

    End the response after the "Next Steps" section; do not add any additional generic conclusions.
    """

    response = ollama.chat(
        model="llama3.2",
        messages=[{"role": "user", "content": prompt}]
    )

    return response.message.content

# Main flow
def run():
    user_question = get_user_question()

    print("\n🔍 Generating analysis...\n")
    analysis = get_analysis(user_question)

    print("=== Analysis Output ===\n")
    print(analysis)


if __name__ == "__main__":
    run()