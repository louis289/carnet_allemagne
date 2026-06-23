# Carnet de Survie Linguistique Scout — Bundeslager 2026

## 🏕️ Contexte du Projet
Création d'un carnet de survie linguistique multilingue (Français, Allemand, Anglais) conçu pour les scouts ("vaillants et pios", jeunes de 12 à 16 ans) des **EDLN** (Éclaireurs Luthériens du Nord).
L'objectif est de leur fournir des bases solides pour communiquer avec les autres lors d'un grand camp scout en Allemagne (bivouac mélangeant une unité de 250 Français avec environ 6000 scouts allemands).

## 🎯 Objectifs et Ton
- **Cible :** 100% axé sur la "bulle scoute". Le tutoiement est de rigueur et le vocabulaire est adapté aux adolescents.
- **Format :** Des phrases toujours simples, courtes et directes (maximum 10 à 12 mots).

---

## 📂 Architecture du Projet

Le dépôt est composé de plusieurs modules indépendants et d'outils complémentaires :

```
├── JSON/                         # Base de données des expressions linguistiques (.json)
├── Web_PDF_Generator/            # Générateur web statique pour imprimer le livret final
├── GENERATEUR_FICHES_ACTIVITE/   # Application de bureau Python (CustomTkinter) pour fiches d'activité avec Ollama
├── Fiches_activitees/            # Ressources et gabarits pour les fiches d'activité
├── Fiches_Générées/              # Dossier de sortie des fiches d'activité générées
├── audite/                       # Interface web Node.js pour réviser et corriger les JSON
├── audit.js                      # Script Node de nettoyage automatique des tags grammaticales
├── fix_json.js                   # Script Node de re-structuration et correction des JSON
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

### 2. Le Générateur de Livret Final (`/Web_PDF_Generator/`)
C'est le composant principal de mise en page visuelle du carnet de survie au format A4 Paysage.
- **Fonctionnement** : Il charge dynamiquement les fichiers JSON, les trie par ordre alphabétique, calcule une pagination intelligente (maximum 4 cartes d'expressions par page, ou moins pour les cartes longues), génère un sommaire indexé automatique et applique la charte graphique officielle EDLN (Couleurs HSL, polices Cabin Sketch & Open Sans, logos et cadre décoratif).
- **Ajustement Automatique** : Intègre un script d'ajustement dynamique de mise en page qui force les prononciations sur une seule ligne (en réduisant leur taille de police si besoin) et redimensionne proportionnellement le texte et l'espacement des pages pour empêcher tout débordement lors de l'impression.
- **Lancement** : 
  1. Ouvrez le dossier dans VS Code.
  2. Lancez `index.html` avec l'extension **Live Server** (requis pour le chargement des fichiers JSON via `fetch`).
  3. Pour générer le PDF, utilisez la fonction d'impression du navigateur (`Ctrl + P` ou `Cmd + P`), configurez en **A4 Paysage**, marges à **Aucune** et activez les **Graphiques d'arrière-plan**.

### 3. Générateur de Fiches d'Activité Scout (`/GENERATEUR_FICHES_ACTIVITE/`)
Une application de bureau interactive moderne développée en Python (CustomTkinter) pour guider la conception de fiches d'activité selon les 5 temps pédagogiques EDLN (Sensibilisation, Règles, Déroulement, Dénouement, Bilan).
- **Fonctionnalités** :
  - Chat interactif avec un assistant virtuel (via Ollama local ou API Cloud compatible OpenAI/Mistral/Groq).
  - Lecture automatique des documents PDF de branche (PPDB) pour injecter le contexte pédagogique officiel.
  - Outil de mise au propre du bloc-note.
  - Génération de fiche finale structurée au format JSON et compilation automatique en PDF via ReportLab.
- **Lancement local** :
  ```bash
  cd GENERATEUR_FICHES_ACTIVITE
  pip install -r requirements.txt
  python app.py
  ```
- **Lancement Docker (Facultatif)** : Un `Dockerfile` et un `docker-compose.yml` sont fournis pour exécuter l'application dans un environnement isolé ou conteneurisé.

### 4. Outil d'Audit et d'Édition (`/audite/`)
Un mini-serveur local avec interface web pour réviser et modifier facilement les expressions directement dans les fichiers JSON.
- **Lancement** :
  ```bash
  cd audite
  node server.js
  ```
  Ouvrez ensuite `http://localhost:3000` dans votre navigateur.

### 5. Scripts de traitement (Racine)
- `node audit.js` : Supprime les balises grammaticales abusives sur les expressions figées (ex: s'il te plaît, please, etc.) et insère la source littéraire des citations de cinéma/pop-culture dans le JSON.
- `node fix_json.js` : Effectue des correctifs ciblés sur les structures JSON (renommage de sections, regroupement des citations par œuvre originale, correction de fautes ou expressions spécifiques).