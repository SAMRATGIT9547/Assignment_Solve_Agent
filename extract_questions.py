import sys
import os
import pdfplumber
import re

def extract_questions_from_pdf(pdf_path):
    questions = []
    current_question = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += '\n' + text

        lines = full_text.splitlines()

        for line in lines:
            line = line.strip()

            # Detect new question start (Q1, 1. or 1))
            if re.match(r'(Q[\.\s]?\d{1,2}[\.\)]?|^\d{1,2}[\.\)])[\s\S]*?(?=(?:\nQ[\.\s]?\d{1,2}[\.\)]?|^\n?\d{1,2}[\.\)]|\Z))', line):
                if current_question:
                    questions.append(current_question.strip())
                current_question = line
            else:
                # Append line to the ongoing question block
                if current_question:
                    current_question += ' ' + line

        if current_question:
            questions.append(current_question.strip())

        return questions

    except Exception as e:
        return [f"Error reading PDF: {e}"]

def save_questions_to_file(questions, output_path):
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, question in enumerate(questions, 1):
            f.write(f"Q{i}: {question.strip()}\n\n")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_questions.py <pdf_path>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_file = os.path.splitext(pdf_path)[0] + "_questions.txt"

    questions = extract_questions_from_pdf(pdf_path)
    save_questions_to_file(questions, output_file)

    print(f"✅ Extracted {len(questions)} question(s). Saved to: {output_file}")
