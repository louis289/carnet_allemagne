# Carnet de Survie Linguistique Scout

## 🏕️ Contexte du Projet
Création d'un carnet de survie linguistique multilingue (Français, Allemand, Anglais) conçu pour les scouts ("vaillants et pios", jeunes de 12 à 16 ans). 
L'objectif est de leur fournir des bases solides pour communiquer avec les autres lors d'un camp scout en Allemagne (bivouac mélangeant une unité de 250 Français avec environ 6000 scouts allemands).

## 🎯 Objectifs et Ton
- **Cible :** 100% axé sur la "bulle scoute". Le tutoiement est de rigueur et le vocabulaire est adapté aux adolescents.
- **Format :** Des phrases toujours simples, courtes et directes (maximum 10 à 12 mots).

## 🗂️ Catégories du Carnet
Le carnet est divisé en plusieurs grandes catégories :
1. Politesse et rencontres
2. Nourriture et repas
3. Organisation et concours
4. Orientation et déplacements
5. Drague et amitiés
6. Vie de camp, installations et jeux
7. Voyage
8. Expressions françaises
9. Expressions anglaises
10. Expressions allemandes
11. Citations (meme, film, livre)

Chaque catégorie comporte des cas pratiques avec de multiples phrases et une liste de vocabulaire spécifique.

## 🛠️ Structure des Données (JSON)
Les expressions sont stockées dans des fichiers JSON (voir `JSON/consignes/exemple.json`).
Une **règle de formatage grammatical stricte** est appliquée pour lier les mots entre les différentes langues afin d'aider à la compréhension et l'apprentissage :
- Les mots sont balisés avec un chiffre pour que le mot équivalent ait le même numéro dans chaque langue.
- `[N1]...[/N1]` : Noms, pronoms ou groupes nominaux.
- `[V1]...[/V1]` : Verbes (conjugués ou à l'infinitif).
- `[A1]...[/A1]` : Adjectifs ou adverbes importants.

Pour chaque langue cible (Allemand, Anglais), la traduction **et la prononciation francisée** (elle aussi balisée) sont fournies.

## 📂 Architecture du Projet
- `/JSON/` : Contient les données linguistiques structurées et les consignes (prompts) de génération.
- `/Web_PDF_Generator/` : Futur composant pour générer le carnet visuel ou PDF (en cours d'élaboration).