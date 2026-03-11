import json
import os
import io
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit

def draw_wrapped_text(c, text, x, y, max_width, font_name="Helvetica", font_size=10, line_height=None, align="left"):
    """Dessine du texte qui revient à la ligne si besoin."""
    if line_height is None:
        line_height = font_size * 1.4
    
    c.setFont(font_name, font_size)
    lines = text.split('\n')
    current_y = y
    
    for paragraph in lines:
        wrapped_lines = simpleSplit(paragraph, font_name, font_size, max_width)
        for line in wrapped_lines:
            if align == "center":
                text_width = c.stringWidth(line, font_name, font_size)
                draw_x = x + (max_width - text_width) / 2
            elif align == "right":
                text_width = c.stringWidth(line, font_name, font_size)
                draw_x = x + max_width - text_width
            else:
                draw_x = x
            c.drawString(draw_x, current_y, line)
            current_y -= line_height
    return current_y

def fill_pdf(base_pdf_path, output_pdf_path, fiche_data, config):
    reader = PdfReader(base_pdf_path)
    writer = PdfWriter()
    
    # Nous allons créer un canvas séparé par page
    pages_canvas = {}
    
    # Répartir les dessins par page
    for field_name, field_config in config.items():
        page_num = field_config.get("page", 1) - 1 # 0-indexed for PyPDF2
        if page_num < 0 or page_num >= len(reader.pages):
            continue # Page introuvable
            
        if page_num not in pages_canvas:
            packet = io.BytesIO()
            pages_canvas[page_num] = {
                "packet": packet,
                "canvas": canvas.Canvas(packet, pagesize=A4)
            }
        
        c = pages_canvas[page_num]["canvas"]
        
        # Récupérer les données
        if field_name == "type_de_jeu_et_titre":
            type_jeu = fiche_data.get("type_de_jeu", "")
            titre = fiche_data.get("titre", "")
            data = f"{type_jeu} : {titre}"
        else:
            data = fiche_data.get(field_name, "")
            
        if isinstance(data, list):
            data = "\n".join(data) # Joindre les listes avec sauts de ligne
            
        x = field_config.get("x", 0)
        y = field_config.get("y", 0)
        width = field_config.get("width", 500)
        font = field_config.get("font", "Helvetica")
        size = field_config.get("size", 10)
        bg_color = field_config.get("bg_color", "")
        align = field_config.get("align", "left")
        
        if bg_color:
            try:
                bg = bg_color.lstrip('#')
                r, g, b = tuple(int(bg[i:i+2], 16)/255.0 for i in (0, 2, 4))
                c.setFillColorRGB(r, g, b)
                
                # Calcul de la hauteur de la boîte de fond
                if "height" in field_config:
                    box_height = field_config["height"]
                else:
                    lines = field_config.get("lines", 1)
                    line_height = size * 1.4
                    box_height = line_height * lines
                    
                box_top = y + size
                box_bottom = box_top - box_height
                
                # Dessin du rectangle (sans bordure)
                c.rect(x - 2, box_bottom, width + 4, box_height, stroke=0, fill=1)
                
                # Remettre à zero (noir) pour le texte
                c.setFillColorRGB(0, 0, 0)
            except Exception as e:
                print(f"Erreur rendu couleur: {e}")
        
        # On va toujours wrapper (si pas utile ça n'aura pas d'impact si width est grand)
        draw_wrapped_text(c, str(data), x, y, width, font_name=font, font_size=size, align=align)

    # Sauvegarder tous les canvas créés
    for page_num, data in pages_canvas.items():
        data["canvas"].save()
        data["packet"].seek(0)
        
    # Fusionner chaque page du doc de base
    for page_num in range(len(reader.pages)):
        page = reader.pages[page_num]
        
        # Si on a écrit quelque chose pour cette page, on fusionne
        if page_num in pages_canvas:
            new_pdf = PdfReader(pages_canvas[page_num]["packet"])
            page.merge_page(new_pdf.pages[0])
            
        writer.add_page(page)

    # Sauvegarde finale
    with open(output_pdf_path, "wb") as outputStream:
        writer.write(outputStream)

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "fiches_conçues.json")
    config_path = os.path.join(script_dir, "pdf_layout_config.json")
    pdf_base = os.path.join(script_dir, "Ressources/Fiche-dactivite-Vaillants1.pdf")
    output_dir = os.path.join(script_dir, "Fiches_Générées")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with open(json_path, "r", encoding="utf-8") as f:
        fiches = json.load(f)
        
    # Charger la configuration de positionnement
    if not os.path.exists(config_path):
        print("Fichier de configuration introuvable:", config_path)
        return
        
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    for i, fiche in enumerate(fiches):
        titre_propre = fiche["titre"].replace(" ", "_").replace(":", "").replace("/", "")
        output_name = os.path.join(output_dir, f"Fiche_{i+1}_{titre_propre}.pdf")
        
        print(f"Génération de {output_name}...")
        fill_pdf(pdf_base, output_name, fiche, config)
        
    print("Terminé ! Toutes les fiches ont été générées dans le dossier :", output_dir)

if __name__ == "__main__":
    main()
