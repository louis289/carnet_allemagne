const jsonFiles = [
    '../JSON/1_urgences.json',
    '../JSON/2_salutations_et_politesse.json',
    '../JSON/3_repas_et_vie_quotidienne.json',
    '../JSON/4_au_camp.json',
    '../JSON/5_activites_et_jeux.json',
    '../JSON/6_chants.json',
    '../JSON/7_nature_et_environnement.json',
    '../JSON/8_valeurs_scoutes.json',
    '../JSON/9_materiel_de_camping.json',
    '../JSON/10_services_du_camp.json',
    '../JSON/11_pleine_conscience.json',
    '../JSON/12_forum_et_cercles_de_parole.json',
    '../JSON/13_emotions_et_expressions.json',
    '../JSON/14_vocabulaire_du_bula.json',
    '../JSON/15_creer_du_lien.json'
];

// Icône Micro/Dictaphone en émojis
const iconMic = "🔊";

// Fonction pour parser les balises grammaticales [N1]...[/N1], [V1], [A1]
function parseGrammar(text) {
    if (!text) return "";
    return text.replace(/\[([NVA])(\d+)\](.*?)\[\/\1\2\]/g, (match, type, index, innerText) => {
        return `<span class="grammar grammar-${type}">${innerText}<span class="index">${index}</span></span>`;
    });
}

function createPageElement() {
    const page = document.createElement('div');
    page.className = 'page';
    return page;
}

async function loadAndBuild() {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading">Chargement et génération du carnet...</div>';

    let categories = [];
    for (let url of jsonFiles) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data && data.carnet_scout) {
                    categories.push(data.carnet_scout);
                }
            } else {
                console.warn(`Impossible de charger ${url} - Serveur web requis.`);
            }
        } catch (e) {
            console.error(`Erreur réseau sur ${url}`, e);
        }
    }

    if (categories.length === 0) {
        app.innerHTML = '<div class="loading" style="color:red">Erreur : Aucun fichier JSON n\'a pu être chargé. Utilisez un serveur HTTP local (ex: extension VSCode "Live Server" ou python -m http.server).</div>';
        return;
    }

    app.innerHTML = ''; // Clear loading

    // --- 0. TRI ALPHABETIQUE ---
    categories.forEach(cat => {
        // Triage des "cas" par ordre alphabétique sur le nom du cas
        cat.cas.sort((a, b) => a.nom_du_cas.localeCompare(b.nom_du_cas, 'fr', { sensitivity: 'base' }));

        // Pour chaque cas, on trie les expressions par ordre alphabétique du français brut
        cat.cas.forEach(casItem => {
            casItem.expressions.sort((a, b) => {
                // Retirer les balises grammatiques pour le tri
                const frA = a.francais.replace(/\[\/?([NVA])(\d+)?\]/g, '').trim();
                const frB = b.francais.replace(/\[\/?([NVA])(\d+)?\]/g, '').trim();
                return frA.localeCompare(frB, 'fr', { sensitivity: 'base' });
            });
        });
    });

    // --- 1. PREPARATION DES PAGES DE CONTENU AVEC PAGINATION AU NIVEAU DES EXPRESSIONS ---
    const contentPages = [];
    const MAX_SLOTS = 4; // Contrainte par défaut : 4 cartes max par page (2x2)
    let currentSlots = 0;
    let currentCategories = new Set();
    let currentBlocks = [];

    const pushCurrentPage = () => {
        if (currentBlocks.length > 0) {
            contentPages.push({
                categorie: Array.from(currentCategories).join(' / '),
                blocks: currentBlocks
            });
            currentSlots = 0;
            currentCategories = new Set();
            currentBlocks = [];
        }
    };

    const getCardSize = (expr) => {
        const cleanStr = (str) => str ? str.replace(/\[\/?([NVA])(\d+)?\]/g, '').trim() : '';
        let maxLen = cleanStr(expr.francais).length;
        if (expr.allemand) {
            maxLen = Math.max(maxLen, cleanStr(expr.allemand.texte).length, cleanStr(expr.allemand.prononciation_FR).length);
        }
        if (expr.anglais) {
            maxLen = Math.max(maxLen, cleanStr(expr.anglais.texte).length, cleanStr(expr.anglais.prononciation_FR).length);
        }

        if (maxLen > 70) return 4;
        if (maxLen > 38) return 2;
        return 1;
    };

    categories.forEach(cat => {
        cat.cas.forEach(casItem => {

            // Un seul Cas (titre) par page ! Si on change de cas et que la page est entamée, on tourne la page.
            if (currentSlots > 0) {
                pushCurrentPage();
            }

            let currentBlockData = {
                nom_du_cas: casItem.nom_du_cas,
                expressions: []
            };

            currentCategories.add(cat.categorie);

            casItem.expressions.forEach(expr => {
                let cardSize = getCardSize(expr);
                let slotsNeeded = cardSize;
                let wastedSlots = 0;

                if (cardSize === 2 && currentSlots % 2 !== 0) {
                    wastedSlots = 1;
                } else if (cardSize === 4 && currentSlots > 0) {
                    wastedSlots = MAX_SLOTS - currentSlots;
                }

                // Dès qu'on dépasse le budget de base
                if (currentSlots + wastedSlots + slotsNeeded > MAX_SLOTS) {
                    if (currentBlockData.expressions.length > 0) {
                        currentBlocks.push(currentBlockData);
                    }
                    pushCurrentPage();
                    currentCategories.add(cat.categorie);
                    currentBlockData = {
                        nom_du_cas: "", // Pas de titre répétitif 
                        expressions: []
                    };
                    wastedSlots = 0;
                }

                expr.sizeClass = cardSize === 4 ? "span-4" : (cardSize === 2 ? "span-2" : "");
                currentBlockData.expressions.push(expr);
                currentSlots += wastedSlots + slotsNeeded;
            });

            if (currentBlockData.expressions.length > 0) {
                currentBlocks.push(currentBlockData);
            }
        });
    });
    pushCurrentPage(); // Placer les derniers

    // --- 2. PREPARATION DU SOMMAIRE ---
    const tocEntries = [];
    categories.forEach(cat => {
        tocEntries.push({ type: 'cat', title: cat.categorie });
        cat.cas.forEach(casItem => {
            tocEntries.push({
                type: 'cas',
                title: casItem.nom_du_cas,
                refCategory: cat.categorie
            });
        });
    });

    const MAX_TOC_LINES = 14; // Environ 10 lignes visuelles maximum par page
    const tocPagesArray = [];
    let currentTocPage = [];
    let linesOnCurrentPage = 0;

    for (let i = 0; i < tocEntries.length; i++) {
        let entry = tocEntries[i];

        // Une catégorie coûte ~2 lignes (titre gras + marges), un "cas" coûte 0.5 ligne puisqu'ils sont sur 2 colonnes
        let lineCost = entry.type === 'cat' ? 2 : 0.5;

        if (linesOnCurrentPage + lineCost > MAX_TOC_LINES && currentTocPage.length > 0) {
            // Si c'est une catégorie toute seule en bas de page, on la repousse direct
            if (entry.type === 'cat' && linesOnCurrentPage + lineCost > MAX_TOC_LINES - 1) {
                // do nothing, let it trigger the new page
            }
            tocPagesArray.push(currentTocPage);
            currentTocPage = [];
            linesOnCurrentPage = 0;
        }

        currentTocPage.push(entry);
        linesOnCurrentPage += lineCost;
    }
    if (currentTocPage.length > 0) {
        tocPagesArray.push(currentTocPage);
    }

    // --- 3. CALCUL DES NUMEROS DE PAGE ---
    const tocStartPage = 3; // 1 = Garde, 2 = Vide
    const contentStartPage = tocStartPage + tocPagesArray.length;

    const getPageForCas = (categoryName, casTitle) => {
        const index = contentPages.findIndex(p => p.categorie.includes(categoryName) && p.blocks.some(c => c.nom_du_cas.startsWith(casTitle)));
        return contentStartPage + index;
    };

    // --- 4. RENDU HTML ---

    // Page de garde
    const coverPage = createPageElement();
    coverPage.classList.add('page-cover');
    // On ajoute l'encart avec les logos
    coverPage.innerHTML = `
        <div class="logos-container" style="display: flex; gap: 30px; margin-bottom: 15px; align-items: center; justify-content: center; height: 100px;">
            <img src="logo_edln.png" alt="Logo EDLN" style="max-height: 100%; width: auto; object-fit: contain;">
            <img src="logo_bula.jpeg" alt="Logo Bundeslager" style="max-height: 100%; width: auto; object-fit: contain; border-radius: 10px;">
        </div>
        <h2 class="title-font" style="margin-bottom: 5px;">Carnet de survie linguistique</h2>
        <h1 class="title-font" style="margin-top: 5px;">Bundeslager 2026</h1>
        
        <div class="identite-proprietaire">
            <strong style="color:var(--edln-yellow)">Ce carnet appartient à :</strong>
            <p><strong>Nom / Prénom :</strong> </p>
        </div>
    `;
    app.appendChild(coverPage);

    // Page vide
    const blankPage = createPageElement();
    app.appendChild(blankPage);

    // Rendu des pages de Sommaire
    let currentPageNum = tocStartPage;
    tocPagesArray.forEach((entries, index) => {
        const tocPage = createPageElement();
        tocPage.classList.add('page-toc');
        let html = `<h2 class="title-font">Sommaire ${index + 1}/${tocPagesArray.length}</h2><div class="toc-content">`;

        let i = 0;
        while (i < entries.length) {
            if (entries[i].type === 'cat') {
                html += `<div class="toc-cat">${entries[i].title}</div>`;
                i++;

                // Rassembler tous les "cas" de cette catégorie pour CETTE page
                let casItems = [];
                while (i < entries.length && entries[i].type === 'cas') {
                    casItems.push(entries[i]);
                    i++;
                }

                if (casItems.length > 0) {
                    const half = Math.ceil(casItems.length / 2);
                    const leftItems = casItems.slice(0, half);
                    const rightItems = casItems.slice(half);

                    html += `<div class="toc-columns">`;
                    html += `<div class="toc-col">`;
                    leftItems.forEach(entry => {
                        const pageNum = getPageForCas(entry.refCategory, entry.title);
                        html += `<div class="toc-cas"><span>${entry.title}</span> <span class="dots"></span> <span style="font-weight:bold">${pageNum}</span></div>`;
                    });
                    html += `</div><div class="toc-col">`;
                    rightItems.forEach(entry => {
                        const pageNum = getPageForCas(entry.refCategory, entry.title);
                        html += `<div class="toc-cas"><span>${entry.title}</span> <span class="dots"></span> <span style="font-weight:bold">${pageNum}</span></div>`;
                    });
                    html += `</div></div>`;
                }
            } else {
                // Continuation des cas d'une catégorie de la page précédente
                let casItems = [];
                while (i < entries.length && entries[i].type === 'cas') {
                    casItems.push(entries[i]);
                    i++;
                }

                if (casItems.length > 0) {
                    const half = Math.ceil(casItems.length / 2);
                    const leftItems = casItems.slice(0, half);
                    const rightItems = casItems.slice(half);

                    html += `<div class="toc-columns" style="margin-top: 3mm;">`;
                    html += `<div class="toc-col">`;
                    leftItems.forEach(entry => {
                        const pageNum = getPageForCas(entry.refCategory, entry.title);
                        html += `<div class="toc-cas"><span>${entry.title}</span> <span class="dots"></span> <span style="font-weight:bold">${pageNum}</span></div>`;
                    });
                    html += `</div><div class="toc-col">`;
                    rightItems.forEach(entry => {
                        const pageNum = getPageForCas(entry.refCategory, entry.title);
                        html += `<div class="toc-cas"><span>${entry.title}</span> <span class="dots"></span> <span style="font-weight:bold">${pageNum}</span></div>`;
                    });
                    html += `</div></div>`;
                }
            }
        }

        html += `</div>`;
        html += `<div class="page-number">${currentPageNum}</div>`;
        tocPage.innerHTML = html;
        app.appendChild(tocPage);
        currentPageNum++;
    });

    // Rendu des pages de Contenu
    contentPages.forEach((pageData, index) => {
        const contentPage = createPageElement();

        let html = `
            <div class="page-category-label">${pageData.categorie}</div>
            <div class="page-number">${contentStartPage + index}</div>
            <div class="page-content-wrapper">
        `;

        // Pour chaque "bloc" (cas) de la page
        pageData.blocks.forEach(block => {
            html += `<div class="cas-container">`;
            if (block.nom_du_cas) {
                html += `<h2 class="cas-title">${block.nom_du_cas}</h2>`;
            }
            html += `<div class="cards-grid">`;

            // Pour chaque expression
            block.expressions.forEach(expr => {
                html += `<div class="expression-card ${expr.sizeClass || ''}">`;
                html += `   <div class="expression-fr">${parseGrammar(expr.francais)}</div>`;

                // Allemand
                if (expr.allemand) {
                    html += `   <div class="traduction">
                                    <div class="lang">DE</div>
                                    <div class="content">
                                        <span class="texte">${parseGrammar(expr.allemand.texte)}</span>
                                        <span class="prononciation">
                                            <span class="icon-dictaphone">${iconMic}</span>
                                            <span style="flex:1;">${parseGrammar(expr.allemand.prononciation_FR)}</span>
                                        </span>
                                    </div>
                                </div>`;
                }

                // Anglais
                if (expr.anglais) {
                    html += `   <div class="traduction">
                                    <div class="lang">EN</div>
                                    <div class="content">
                                        <span class="texte">${parseGrammar(expr.anglais.texte)}</span>
                                        <span class="prononciation">
                                        <span class="icon-dictaphone">${iconMic}</span>
                                            <span style="flex:1;">${parseGrammar(expr.anglais.prononciation_FR)}</span>
                                        </span>
                                    </div>
                                </div>`;
                }

                html += `</div>`;
            });

            html += `</div>`; // fin cards-grid
            html += `</div>`; // fin cas-container
        });

        html += `</div>`; // fin page-content-wrapper

        contentPage.innerHTML = html;
        app.appendChild(contentPage);
    });

    // Ajuster dynamiquement la mise en page pour éviter les débordements
    adjustLayout();
}

function adjustLayout() {
    // 1. Forcer l'affichage sur une seule ligne pour la prononciation phonétique et réduire la police si besoin
    const prons = document.querySelectorAll('.prononciation');
    prons.forEach(p => {
        p.style.whiteSpace = 'nowrap';
        p.style.overflow = 'hidden';
        p.style.textOverflow = 'ellipsis';

        const parentContent = p.closest('.content');
        if (!parentContent) return;

        let fontSizePt = 13; // Taille par défaut de style.css
        p.style.fontSize = fontSizePt + 'pt';

        let attempts = 0;
        // On réduit la taille jusqu'à ce que la largeur réelle s'adapte à la largeur du parent
        while (p.scrollWidth > parentContent.clientWidth && fontSizePt > 6 && attempts < 25) {
            fontSizePt -= 0.5;
            p.style.fontSize = fontSizePt + 'pt';
            attempts++;
        }
    });

    // 2. Ajuster verticalement les éléments de chaque page pour éviter les débordements hors de la zone d'impression
    const pages = document.querySelectorAll('.page');
    pages.forEach((page) => {
        // Ignorer la page de garde ou les pages vides
        if (page.classList.contains('page-cover') || (!page.querySelector('.page-content-wrapper') && !page.classList.contains('page-toc'))) return;

        let scale = 1.0;

        // Si c'est la table des matières (Sommaire)
        if (page.classList.contains('page-toc')) {
            let attempts = 0;
            while (page.scrollHeight > page.clientHeight && scale > 0.6 && attempts < 15) {
                scale -= 0.05;
                const h2 = page.querySelector('h2');
                if (h2) {
                    h2.style.fontSize = (45 * scale) + 'pt';
                    h2.style.marginBottom = (15 * scale) + 'mm';
                }
                const columns = page.querySelectorAll('.toc-columns');
                columns.forEach(col => {
                    col.style.fontSize = (16 * scale) + 'pt';
                    col.style.gap = (15 * scale) + 'mm';
                });
                const cats = page.querySelectorAll('.toc-cat');
                cats.forEach(cat => {
                    cat.style.fontSize = (18 * scale) + 'pt';
                    cat.style.marginTop = (6 * scale) + 'mm';
                    cat.style.marginBottom = (3 * scale) + 'mm';
                });
                attempts++;
            }
            return;
        }

        const wrapper = page.querySelector('.page-content-wrapper');
        let attempts = 0;

        // Boucle d'échelle pour réduire la taille globale de la page si elle dépasse sa hauteur maximale de 210mm
        while (page.scrollHeight > page.clientHeight && scale > 0.6 && attempts < 15) {
            scale -= 0.05;

            const cards = page.querySelectorAll('.expression-card');
            cards.forEach(card => {
                card.style.padding = (3 * scale) + 'mm ' + (4 * scale) + 'mm';

                const fr = card.querySelector('.expression-fr');
                if (fr) {
                    fr.style.fontSize = (18 * scale) + 'pt';
                    fr.style.marginBottom = (2 * scale) + 'mm';
                }

                const translations = card.querySelectorAll('.traduction');
                translations.forEach(tr => {
                    tr.style.marginBottom = (1.5 * scale) + 'mm';

                    const lang = tr.querySelector('.lang');
                    if (lang) lang.style.fontSize = (15 * scale) + 'pt';

                    const texte = tr.querySelector('.texte');
                    if (texte) {
                        texte.style.fontSize = (15 * scale) + 'pt';
                        texte.style.marginBottom = (1 * scale) + 'mm';
                    }

                    const pron = tr.querySelector('.prononciation');
                    if (pron) {
                        // Utilise la taille ajustée horizontalement comme base, et la réduit proportionnellement
                        const currentSize = parseFloat(pron.style.fontSize) || 13;
                        pron.style.fontSize = (currentSize * 0.95) + 'pt';
                        pron.style.padding = (1.5 * scale) + 'mm ' + (3 * scale) + 'mm';
                    }
                });
            });

            if (wrapper) {
                wrapper.style.gap = (8 * scale) + 'mm';
                wrapper.style.marginTop = (15 * scale) + 'mm';
            }

            const casTitle = page.querySelector('.cas-title');
            if (casTitle) {
                casTitle.style.fontSize = (24 * scale) + 'pt';
                casTitle.style.margin = '0 0 ' + (5 * scale) + 'mm 0';
            }

            const grid = page.querySelector('.cards-grid');
            if (grid) {
                grid.style.gap = (8 * scale) + 'mm';
            }

            attempts++;
        }
    });
}

// Lancer au chargement
window.addEventListener('DOMContentLoaded', loadAndBuild);
