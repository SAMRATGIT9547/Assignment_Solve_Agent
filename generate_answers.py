import sys
import os
import openai
from fpdf import FPDF

# 🔑 Set your OpenAI API key here or use an environment variable
def generate_answer(question):
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",  # or "gpt-3.5-turbo"
            messages=[
                {"role": "system", "content": "You are a helpful AI tutor."},
                {"role": "user", "content": f"Answer the following question in detail:\n\n{question}"}
            ],
            temperature=0.7,
            max_tokens=600
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"[Error generating answer: {e}]"

def generate_pdf(qa_pairs, output_path):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    for i, (q, a) in enumerate(qa_pairs, 1):
        pdf.multi_cell(0, 10, f"Q{i}: {q}\n\nA{i}: {a}\n\n", border=0)

    pdf.output(output_path)
    print(f"✅ Answer PDF saved as: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python generate_answers.py <questions_txt_path>")
        sys.exit(1)

    questions_file = sys.argv[1]
    if not os.path.exists(questions_file):
        print("❌ File not found.")
        sys.exit(1)

    with open(questions_file, 'r', encoding='utf-8') as f:
        # Assumes questions are in format: Q1: <question>, Q2: <question>, ...
        questions = [line.strip().split(":", 1)[1].strip() for line in f if line.strip().startswith("Q")]

    qa_pairs = []
    for question in questions:
        print(f"🔍 Generating answer for: {question}")
        answer = generate_answer(question)
        qa_pairs.append((question, answer))

    output_pdf = os.path.splitext(questions_file)[0] + "_answers.pdf"
    generate_pdf(qa_pairs, output_pdf)




