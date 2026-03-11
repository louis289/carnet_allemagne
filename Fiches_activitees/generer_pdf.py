import json
import os
import io
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit

def draw_wrapped_text(c, text, x, y, max_width, line_height=14):
    """Dessine du texte qui revient à la ligne si besoin."""
    c.setFont("Helvetica", 10)
    lines = text.split('\n')
    current_y = y
    
    for paragraph in lines:
        wrapped_lines = simpleSplit(paragraph, 'Helvetica', 10, max_width)
        for line in wrapped_lines:
            c.drawString(x, current_y, line)
            current_y -= line_height
    return current_y

def fill_pdf(base_pdf_path, output_pdf_path, fiche_data):
    reader = PdfReader(base_pdf_path)
    writer = PdfWriter()

    # --- PAGE 1 ---
    packet1 = io.BytesIO()
    c1 = canvas.Canvas(packet1, pagesize=A4)
    # L'A4 fait environ 595 x 842 points (x de 0 à 595, y de 0 à 842)
    # X=0, Y=0 est en bas à gauche de la page
    
    # Coordonnées estimées (à ajuster si besoin)
    c1.setFont("Helvetica-Bold", 14)
    c1.drawString(200, 750, fiche_data.get("titre", "")) # Titre en haut
    
    c1.setFont("Helvetica", 10)
    c1.drawString(150, 725, fiche_data.get("type_de_jeu", ""))
    
    c1.drawString(150, 705, fiche_data.get("element_preponderant", ""))
    
    # Objectifs peut être une liste, on la convertit en texte
    objectifs = "\n".join(fiche_data.get("objectifs_ppdb", []))
    draw_wrapped_text(c1, objectifs, 320, 705, 250)
    
    c1.drawString(100, 680, fiche_data.get("duree", ""))
    
    draw_wrapped_text(c1, fiche_data.get("materiel", ""), 100, 640, 450)
    
    draw_wrapped_text(c1, fiche_data.get("but_du_jeu", ""), 60, 560, 480)
    
    # Déroulement est souvent une liste
    deroulement = "\n".join(fiche_data.get("deroulement", []))
    draw_wrapped_text(c1, deroulement, 60, 480, 480)
    
    c1.save()
    packet1.seek(0)
    
    # Fusion page 1
    new_pdf_page1 = PdfReader(packet1)
    page1 = reader.pages[0]
    page1.merge_page(new_pdf_page1.pages[0])
    writer.add_page(page1)
    
    # --- PAGE 2 ---
    if len(reader.pages) > 1:
        packet2 = io.BytesIO()
        c2 = canvas.Canvas(packet2, pagesize=A4)
        
        c2.setFont("Helvetica-Bold", 12)
        c2.drawString(60, 750, "Imaginaire possible :")
        c2.setFont("Helvetica", 10)
        draw_wrapped_text(c2, fiche_data.get("imaginaire", ""), 60, 730, 480)
        
        c2.setFont("Helvetica-Bold", 12)
        c2.drawString(60, 650, "Mécanique pédagogique de linguistique :")
        c2.setFont("Helvetica", 10)
        draw_wrapped_text(c2, fiche_data.get("mecanique_recolte_expressions", ""), 60, 630, 480)
        
        c2.save()
        packet2.seek(0)
        
        new_pdf_page2 = PdfReader(packet2)
        page2 = reader.pages[1]
        page2.merge_page(new_pdf_page2.pages[0])
        writer.add_page(page2)

    # Sauvegarde du nouveau document
    with open(output_pdf_path, "wb") as outputStream:
        writer.write(outputStream)

def main():
    json_path = "fiches_conçues.json"
    pdf_base = "Ressources/Fiche-dactivite-Vaillants1.pdf"
    output_dir = "Fiches_Générées"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with open(json_path, "r", encoding="utf-8") as f:
        fiches = json.load(f)

    for i, fiche in enumerate(fiches):
        titre_propre = fiche["titre"].replace(" ", "_").replace(":", "").replace("/", "")
        output_name = os.path.join(output_dir, f"Fiche_{i+1}_{titre_propre}.pdf")
        
        print(f"Génération de {output_name}...")
        fill_pdf(pdf_base, output_name, fiche)
        
    print("Terminé ! Toutes les fiches ont été générées dans le dossier :", output_dir)

if __name__ == "__main__":
    main()
