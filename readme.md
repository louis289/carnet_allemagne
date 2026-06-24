# Carnet de Survie Linguistique Scout — Bundeslager 2026

## 🏕️ Contexte du Projet
Création d'un carnet de survie linguistique multilingue (Français, Allemand, Anglais) conçu pour les scouts ("vaillants et pios", jeunes de 12 à 16 ans) des **EDLN** (Éclaireurs Luthériens du Nord).
L'objectif est de leur fournir des bases solides pour communiquer avec les autres lors d'un grand camp scout en Allemagne (bivouac mélangeant une unité de 250 Français avec environ 6000 scouts allemands).

## 🎯 Objectifs et Ton
- **Cible :** 100% axé sur la "bulle scoute". Le tutoiement est de rigueur et le vocabulaire est adapté aux adolescents.
- **Format :** Des phrases toujours simples, courtes et directes (maximum 10 à 12 mots).

---

## 📂 Architecture du Projet

Le dépôt est composé de plusieurs modules intégrés autour d'un portail web unique :

```
├── JSON/                         # Base de données des expressions linguistiques (.json)
├── Web_PDF_Generator/            # Portail web unifié (Carnet + Éditeur interactif de fiches)
├── GENERATEUR_FICHES_ACTIVITE/   # Application de bureau Python (CustomTkinter) de conception assistée par IA
├── Fiches_activitees/            # Gabarits et scripts de compilation ReportLab pour les fiches
│   ├── Fiches_Générées/          # Fiches PDF compilées en sortie
│   └── fiches_conçues.json       # Fichier JSON contenant les fiches d'activités
├── server.js                     # Serveur Node.js central servant le portail et les API
├── audit.js                      # Script de nettoyage automatique des tags grammaticales
├── fix_json.js                   # Script de correction structurelle des JSON
└── readme.md                     # Cette documentation
```

---

## 🛠️ Description des Composants & Utilisation

### 1. Base de données Linguistique (`/JSON/`)
Les expressions sont réparties dans 12 catégories principales (Politesse, Nourriture, Drague, Urgences, etc.).
Une **règle de formatage grammatical stricte** lie les mots équivalents d'une langue à l'autre via des balises numériques pour faciliter l'apprentissage visuel :
- `[N1]...[/N1]` : Noms, pronoms ou groupes nominaux.
- `[V1]...[/V1]` : Verbes (conjugués ou infinitif).
- `[A1]...[/A1]` : Adjectifs ou adverbes importants.

Chaque traduction comporte le texte cible et sa prononciation francisée.

### 2. Le Portail Unique EDLN (`http://localhost:9090/`)
Toutes les applications web du projet sont centralisées et servies via le script `server.js` racine.

* **Lancement du Portail Unique** :
  À la racine du projet, lancez :
  ```bash
  node server.js
  ```
  Ouvrez ensuite `http://localhost:9090/` dans votre navigateur.

* **📖 Générateur de Carnet Scout** :
  * Accessible via l'onglet principal du portail.
  * Il charge dynamiquement les expressions linguistiques du dossier `/JSON/`, applique la mise en page sous forme de cartes d'expression A4 Paysage, calcule un sommaire automatique et gère le gabarit pour la reliure spirale.
  * Pour exporter en PDF : `Ctrl + P` (ou `Cmd + P`), configurez en **A4 Paysage**, marges à **Aucune** et activez les **Graphiques d'arrière-plan**.

* **📋 Générateur & Éditeur Interactif de Fiches d'Activités** :
  * Accessible via le second onglet du portail.
  * Permet d'importer un fichier JSON contenant vos fiches d'activité, de les modifier de manière interactive via un formulaire (Titre, Imaginaire, Objectifs PPDB, Déroulement sous forme d'étapes, etc.), d'ajouter de nouvelles fiches ou de supprimer des fiches existantes.
  * **Téléchargement JSON** : Exporte instantanément la configuration éditée.
  * **Génération PDF** : Lance en arrière-plan la compilation ReportLab des fiches d'activité modifiées en appelant le script Python et affiche des boutons de téléchargement direct des PDFs générés.

### 3. Concepteur Intelligent de Fiches d'Activité (`/GENERATEUR_FICHES_ACTIVITE/`)
Une application de bureau interactive en Python (CustomTkinter) pour concevoir pas à pas ses fiches d'activité guidé par une IA locale (Ollama) ou distante (OpenAI, Groq, Mistral) qui intègre la lecture des PPDB officielles.
* **Lancement local** :
  ```bash
  cd GENERATEUR_FICHES_ACTIVITE
  pip install -r requirements.txt
  python app.py
  ```

### 4. Outil d'Audit et d'Édition du Lexique
* Le mode audit est accessible sur le portail unique à l'adresse `http://localhost:9090/Web_PDF_Generator/audit.html` (ou en cliquant sur le bouton 🔍 en haut à droite du portail). Il permet de relire et modifier directement les traductions et les balises grammaticales au sein des fichiers JSON de lexique.

### 5. Scripts de traitement (Racine)
* `node audit.js` : Supprime les balises grammaticales abusives sur les expressions figées.
* `node fix_json.js` : Effectue des correctifs structurels ciblés sur les fichiers JSON du lexique.