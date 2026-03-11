import PyPDF2
import sys
import glob
import os

def pdf_to_text(pdf_path):
    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            
            output_path = pdf_path + ".txt"
            with open(output_path, 'w', encoding='utf-8') as out:
                out.write(text)
            print(f"Extraction successful: {output_path}")
    except Exception as e:
        print(f"Error on {pdf_path}: {e}")

if __name__ == '__main__':
    for f in glob.glob('*.pdf'):
        pdf_to_text(f)
