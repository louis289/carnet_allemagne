# ============================================================
# Générateur de Fiches d'Activité EDLN - Docker
# ============================================================
# 
# Ce Dockerfile crée une image avec l'application Python + GUI.
# Pour afficher l'interface sur Windows, vous avez besoin de :
#
#   1. Installer VcXsrv : https://sourceforge.net/projects/vcxsrv/
#   2. Lancer XLaunch : cocher "Disable access control"
#   3. Récupérer votre IP WSL2 : ipconfig → IP de l'adaptateur WSL
#   4. Lancer : docker-compose up generateur
#
# OU utiliser le mode recommandé : docker-compose up ollama
# et lancer app.py localement en pointant sur http://localhost:11434
# ============================================================

FROM python:3.12-slim

# Dépendances système pour Tkinter / CustomTkinter + rendu PDF
RUN apt-get update && apt-get install -y \
    python3-tk \
    tk-dev \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libxft2 \
    fontconfig \
    fonts-dejavu-core \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les dépendances Python
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code et les ressources
COPY app.py ./
COPY generer_pdf.py ./
COPY pdf_layout_config.json ./
COPY Ressources/ ./Ressources/

# Variable d'environnement pour le display X11 (passée au runtime)
ENV DISPLAY=:0
ENV OLLAMA_HOST=http://ollama:11434

# Volume pour les fiches générées
VOLUME ["/app/Fiches_Générées", "/app/fiches_conçues.json"]

CMD ["python3", "app.py"]
