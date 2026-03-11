import PyPDF2
import os

pdf_path = "c:/Users/ghigl/Desktop/EDLN GLOP/carnet_allemagne/Fiches_activitees/Ressources/Fiche-dactivite-Vaillants1.pdf"
try:
    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        fields = reader.get_fields()
        if fields:
            print("Fields found:")
            for k, v in fields.items():
                print(f"{k}: {v}")
        else:
            print("No form fields found in the PDF.")
except Exception as e:
    print(f"Error: {e}")
