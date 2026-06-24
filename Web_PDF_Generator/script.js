// ═══════════════════════════════════════════════════════════════
//  CARNET SCOUT – Bundeslager 2026
//  Générateur dynamique — lit ?v= et ?print= depuis l'URL
// ═══════════════════════════════════════════════════════════════

// ─── Lecture des paramètres URL ───────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const selectedVersion = urlParams.get('v') || '1';   // v=1, 2 ou 3
const printMode = urlParams.get('print') === '1';    // print=1 → mode gabarit
const spiralSide = urlParams.get('spiral') || 'left'; // spiral=left|right|top

// Si on arrive sur index.html sans paramètre, on redirige vers la landing
if (!urlParams.has('v')) {
    window.location.replace('landing.html');
}

// ─── Noms lisibles par version ─────────────────────────────────
const VERSION_LABELS = {
    '1': 'Version Originale (V1)',
    '2': 'Version Enrichie (V2)',
    '3': 'Version Complète (V3)',
    '4': 'Version Complète Auditée (V4)',
};

// ─── Dossiers JSON par version ────────────────────────────────
const VERSION_DIRS = {
    '1': '../JSON/Version1/',
    '2': '../JSON/Version2/',
    '3': '../JSON/Version3/',
    '4': '../JSON/Version4/',
};

/**
 * Tri naturel sur le préfixe numérique d'un nom de fichier.
 * Ex : "2_salutations.json" → clé de tri = 2
 *      "10_services.json"   → clé de tri = 10
 */
function naturalSortKey(filename) {
    const match = filename.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : Infinity;
}

/**
 * Récupère la liste des fichiers .json dans un dossier servi
 * par le serveur HTTP (directory listing).
 * Trie par numéro croissant.
 * Pour V3 (et toute version où urgencesLast=true), les fichiers
 * dont le nom contient "urgences" sont déplacés en toute fin.
 *
 * @param {string} dirUrl    - URL du dossier (ex: "../JSON/Version3/")
 * @param {boolean} urgencesLast - Si true, push les fichiers "urgences" en dernier
 * @returns {Promise<string[]>} - Liste d'URLs de fichiers triée
 */
async function listJsonFiles(dirUrl, urgencesLast = false) {
    let html;
    try {
        const res = await fetch(dirUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
    } catch (e) {
        console.error(`Impossible de lister le dossier ${dirUrl} :`, e);
        return [];
    }

    // Parser les liens href se terminant par .json dans le listing HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a[href]'));

    let files = links
        .map(a => a.getAttribute('href'))
        .filter(href => href && href.endsWith('.json'))
        // Garder seulement le nom de fichier (pas de chemins relatifs parasites)
        .map(href => href.split('/').pop());

    // Dédupliquer
    files = [...new Set(files)];

    // Tri naturel par numéro de préfixe
    files.sort((a, b) => {
        const na = naturalSortKey(a);
        const nb = naturalSortKey(b);
        if (na !== nb) return na - nb;
        // En cas d'égalité de numéro, tri alphanumérique du reste
        return a.localeCompare(b, 'fr', { sensitivity: 'base' });
    });

    // Déplacer les fichiers "urgences" en dernier si demandé
    if (urgencesLast) {
        const urgences = files.filter(f => f.toLowerCase().includes('urgences'));
        const rest     = files.filter(f => !f.toLowerCase().includes('urgences'));
        files = [...rest, ...urgences];
    }

    // Retourner les URLs complètes
    return files.map(f => dirUrl + f);
}

/**
 * Résout la liste de fichiers JSON pour la version choisie.
 * Essaie d'abord le listing dynamique ; si le serveur ne liste
 * pas les dossiers, utilise une liste de secours codée en dur.
 */
async function resolveJsonFiles(version) {
    const dirUrl = VERSION_DIRS[version] || VERSION_DIRS['1'];
    const urgencesLast = true; // Urgences toujours en dernier, quelle que soit la version

    const dynamic = await listJsonFiles(dirUrl, urgencesLast);

    if (dynamic.length > 0) {
        console.info(`[V${version}] ${dynamic.length} fichiers trouvés dynamiquement :`, dynamic);
        return dynamic;
    }

    // ── Fallback statique si le listing est désactivé ──────────
    console.warn(`[V${version}] Listing dynamique indisponible – utilisation de la liste de secours.`);
    const FALLBACK = {
        '1': [
            '../JSON/Version1/1_politesse_et_rencontres.json',
            '../JSON/Version1/2_nourriture_et_repas.json',
            '../JSON/Version1/3_organisation_et_concours.json',
            '../JSON/Version1/4_orientation_et_deplacements.json',
            '../JSON/Version1/5_drague_et_amities.json',
            '../JSON/Version1/6_vie_de_camp.json',
            '../JSON/Version1/7_voyage.json',
            '../JSON/Version1/8_expressions_francaises.json',
            '../JSON/Version1/9_expressions_anglaises.json',
            '../JSON/Version1/10_expressions_allemandes.json',
            '../JSON/Version1/11_citations.json',
            '../JSON/Version1/12_urgences.json',
        ],
        '2': [
            '../JSON/Version2/2_salutations_et_politesse.json',
            '../JSON/Version2/3_repas_et_vie_quotidienne.json',
            '../JSON/Version2/4_au_camp.json',
            '../JSON/Version2/5_activites_et_jeux.json',
            '../JSON/Version2/6_chants.json',
            '../JSON/Version2/7_nature_et_environnement.json',
            '../JSON/Version2/8_valeurs_scoutes.json',
            '../JSON/Version2/9_materiel_de_camping.json',
            '../JSON/Version2/10_services_du_camp.json',
            '../JSON/Version2/11_pleine_conscience.json',
            '../JSON/Version2/12_forum_et_cercles_de_parole.json',
            '../JSON/Version2/13_emotions_et_expressions.json',
            '../JSON/Version2/14_vocabulaire_du_bula.json',
            '../JSON/Version2/15_creer_du_lien.json',
            '../JSON/Version2/1_urgences.json',
        ],
        '3': [
            '../JSON/Version3/2_salutations_et_politesse.json',
            '../JSON/Version3/3_repas_et_vie_quotidienne.json',
            '../JSON/Version3/4_au_camp.json',
            '../JSON/Version3/5_activites_et_jeux.json',
            '../JSON/Version3/6_chants.json',
            '../JSON/Version3/7_nature_et_environnement.json',
            '../JSON/Version3/8_valeurs_scoutes.json',
            '../JSON/Version3/9_materiel_de_camping.json',
            '../JSON/Version3/10_services_du_camp.json',
            '../JSON/Version3/11_pleine_conscience.json',
            '../JSON/Version3/12_forum_et_cercles_de_parole.json',
            '../JSON/Version3/13_emotions_et_expressions.json',
            '../JSON/Version3/14_vocabulaire_du_bula.json',
            '../JSON/Version3/15_creer_du_lien.json',
            '../JSON/Version3/16_citations.json',
            '../JSON/Version3/1_urgences.json',
        ],
        '4': [
            '../JSON/Version4/2_salutations_et_politesse.json',
            '../JSON/Version4/3_repas_et_vie_quotidienne.json',
            '../JSON/Version4/4_au_camp.json',
            '../JSON/Version4/5_activites_et_jeux.json',
            '../JSON/Version4/6_chants.json',
            '../JSON/Version4/7_nature_et_environnement.json',
            '../JSON/Version4/8_valeurs_scoutes.json',
            '../JSON/Version4/9_materiel_de_camping.json',
            '../JSON/Version4/10_services_du_camp.json',
            '../JSON/Version4/11_pleine_conscience.json',
            '../JSON/Version4/12_forum_et_cercles_de_parole.json',
            '../JSON/Version4/13_emotions_et_expressions.json',
            '../JSON/Version4/14_vocabulaire_du_bula.json',
            '../JSON/Version4/15_creer_du_lien.json',
            '../JSON/Version4/16_citations.json',
            '../JSON/Version4/1_urgences.json',
        ],
    };
    return FALLBACK[version] || FALLBACK['1'];
}


// ─── Icône dictaphone ─────────────────────────────────────────
const iconMic = "🔊";

// ─── Parser les balises grammaticales [N1]...[/N1] ────────────
function parseGrammar(text) {
    if (!text) return "";
    return text.replace(/\[([NVA])(\d+)\](.*?)\[\/\1\2\]/g, (match, type, index, innerText) => {
        return `<span class="grammar grammar-${type}">${innerText}<span class="index">${index}</span></span>`;
    });
}

// ─── Utilitaire : créer un élément page ───────────────────────
function createPageElement() {
    const page = document.createElement('div');
    page.className = 'page';
    return page;
}

// ─── Afficher/cacher la barre de navigation ───────────────────
function setupNavBar() {
    const nav = document.getElementById('nav-bar');
    const info = document.getElementById('nav-info');
    if (!nav) return;
    nav.style.display = 'flex';

    const spiralLabels = { left: '← Spirale gauche', right: 'Spirale droite →', top: '↑ Spirale haut' };
    if (info) {
        const modeLabel = printMode
            ? `Mode Gabarit · ${spiralLabels[spiralSide] || spiralSide}`
            : 'Mode Aperçu';
        info.textContent = `${VERSION_LABELS[selectedVersion]} · ${modeLabel}`;
    }

    // Décaler le contenu principal pour ne pas passer sous la barre
    document.body.style.paddingTop = '50px';

    // Ajouter les classes de mode
    if (printMode) {
        document.body.classList.add('print-mode');
        document.body.classList.add(`spiral-${spiralSide}`);

        // Afficher le sélecteur de côté spirale
        const switcher = document.getElementById('spiral-switcher');
        if (switcher) {
            switcher.style.display = 'flex';
            // Marquer le bouton actif
            updateSpiralButtons(spiralSide);
        }
    }
}

/**
 * Change le côté de la spirale à la volée (sans recharger la page).
 * Met à jour : classe CSS sur body, URL (history), boutons actifs, nav-info.
 */
function setSpiralSide(side) {
    // Retirer l'ancienne classe de direction
    document.body.classList.remove('spiral-left', 'spiral-right', 'spiral-top', 'spiral-alternating');
    // Appliquer la nouvelle
    document.body.classList.add(`spiral-${side}`);

    // Mettre à jour l'URL sans rechargement
    const params = new URLSearchParams(window.location.search);
    params.set('spiral', side);
    history.replaceState(null, '', `?${params.toString()}`);

    // Mettre à jour les boutons actifs
    updateSpiralButtons(side);

    // Mettre à jour le libellé dans la nav
    const spiralLabels = {
        left:        '← Spirale gauche',
        right:       'Spirale droite →',
        top:         '↑ Spirale haut',
        alternating: '⇄ Recto/Verso'
    };
    const info = document.getElementById('nav-info');
    if (info) {
        info.textContent = `${VERSION_LABELS[selectedVersion]} · Mode Gabarit · ${spiralLabels[side] || side}`;
    }
}

/** Met à jour l'état actif des 4 boutons du switcher */
function updateSpiralButtons(activeSide) {
    ['left', 'right', 'top', 'alternating'].forEach(s => {
        const btn = document.getElementById(`sbtn-${s}`);
        if (btn) btn.classList.toggle('active', s === activeSide);
    });
}


// ─── Chargement et construction du carnet ─────────────────────
async function loadAndBuild() {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading">⏳ Chargement et génération du carnet…</div>';

    setupNavBar();

    let categories = [];
    let missingFiles = [];

    // Résolution dynamique des fichiers (listing dossier ou fallback statique)
    const jsonFiles = await resolveJsonFiles(selectedVersion);

    for (let url of jsonFiles) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data && data.carnet_scout) {
                    categories.push(data.carnet_scout);
                } else {
                    console.warn(`Structure inattendue dans ${url}`);
                }
            } else {
                missingFiles.push(url);
                console.warn(`Impossible de charger ${url} (${response.status})`);
            }
        } catch (e) {
            missingFiles.push(url);
            console.error(`Erreur réseau sur ${url}`, e);
        }
    }

    if (categories.length === 0) {
        app.innerHTML = `<div class="loading" style="color:red">
            ❌ Erreur : Aucun fichier JSON n'a pu être chargé.<br>
            Utilisez un serveur HTTP local (ex: extension VSCode "Live Server" ou <code>python -m http.server</code>).
        </div>`;
        return;
    }

    if (missingFiles.length > 0) {
        console.warn(`${missingFiles.length} fichier(s) manquant(s) :`, missingFiles);
    }

    app.innerHTML = ''; // Clear loading

    // ─── 0. FILTRAGE D'AUDIT ET TRI ALPHABÉTIQUE ────────────────
    categories.forEach(cat => {
        // Filtrer les expressions selon la version
        cat.cas.forEach(casItem => {
            casItem.expressions = casItem.expressions.filter(expr => {
                if (selectedVersion === '4') {
                    // Pour V4, on ne garde QUE les expressions validées (accepted ou modified)
                    return expr.audit && (expr.audit.status === 'accepted' || expr.audit.status === 'modified');
                } else {
                    // Pour les autres versions, on filtre seulement les expressions supprimées lors de l'audit
                    return !(expr.audit && expr.audit.status === 'deleted');
                }
            });
        });

        // Filtrer les cas devenus vides suite aux suppressions/filtrages d'expressions
        cat.cas = cat.cas.filter(casItem => casItem.expressions.length > 0);

        // Trier alphabétiquement
        cat.cas.sort((a, b) => a.nom_du_cas.localeCompare(b.nom_du_cas, 'fr', { sensitivity: 'base' }));
        cat.cas.forEach(casItem => {
            casItem.expressions.sort((a, b) => {
                const frA = a.francais.replace(/\[\/?[NVA](\d+)?\]/g, '').trim();
                const frB = b.francais.replace(/\[\/?[NVA](\d+)?\]/g, '').trim();
                return frA.localeCompare(frB, 'fr', { sensitivity: 'base' });
            });
        });
    });

    // Filtrer les catégories devenues vides suite au filtrage
    categories = categories.filter(cat => cat.cas.length > 0);

    // ─── 1. PRÉPARATION DES PAGES (pagination au niveau expressions)
    const contentPages = [];
    const MAX_SLOTS = 4;
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
        const cleanStr = (str) => str ? str.replace(/\[\/?[NVA](\d+)?\]/g, '').trim() : '';
        let maxLen = cleanStr(expr.francais).length;
        if (expr.allemand) {
            maxLen = Math.max(maxLen, cleanStr(expr.allemand.texte).length, cleanStr(expr.allemand.prononciation_FR || '').length);
        }
        if (expr.anglais) {
            maxLen = Math.max(maxLen, cleanStr(expr.anglais.texte).length, cleanStr(expr.anglais.prononciation_FR || '').length);
        }
        if (maxLen > 70) return 4;
        if (maxLen > 38) return 2;
        return 1;
    };

    categories.forEach(cat => {
        cat.cas.forEach(casItem => {
            if (currentSlots > 0) pushCurrentPage();

            let currentBlockData = { nom_du_cas: casItem.nom_du_cas, expressions: [] };
            currentCategories.add(cat.categorie);

            casItem.expressions.forEach(expr => {
                let cardSize = getCardSize(expr);
                let slotsNeeded = cardSize;
                let wastedSlots = 0;

                if (cardSize === 2 && currentSlots % 2 !== 0) wastedSlots = 1;
                else if (cardSize === 4 && currentSlots > 0) wastedSlots = MAX_SLOTS - currentSlots;

                if (currentSlots + wastedSlots + slotsNeeded > MAX_SLOTS) {
                    if (currentBlockData.expressions.length > 0) currentBlocks.push(currentBlockData);
                    pushCurrentPage();
                    currentCategories.add(cat.categorie);
                    currentBlockData = { nom_du_cas: "", expressions: [] };
                    wastedSlots = 0;
                }

                expr.sizeClass = cardSize === 4 ? "span-4" : (cardSize === 2 ? "span-2" : "");
                currentBlockData.expressions.push(expr);
                currentSlots += wastedSlots + slotsNeeded;
            });

            if (currentBlockData.expressions.length > 0) currentBlocks.push(currentBlockData);
        });
    });
    pushCurrentPage();

    // ─── 2. SOMMAIRE ─────────────────────────────────────────
    const tocEntries = [];
    categories.forEach(cat => {
        tocEntries.push({ type: 'cat', title: cat.categorie });
        cat.cas.forEach(casItem => {
            tocEntries.push({ type: 'cas', title: casItem.nom_du_cas, refCategory: cat.categorie });
        });
    });

    const MAX_TOC_LINES = 14;
    const tocPagesArray = [];
    let currentTocPage = [];
    let linesOnCurrentPage = 0;

    for (let i = 0; i < tocEntries.length; i++) {
        let entry = tocEntries[i];
        let lineCost = entry.type === 'cat' ? 2 : 0.5;
        if (linesOnCurrentPage + lineCost > MAX_TOC_LINES && currentTocPage.length > 0) {
            tocPagesArray.push(currentTocPage);
            currentTocPage = [];
            linesOnCurrentPage = 0;
        }
        currentTocPage.push(entry);
        linesOnCurrentPage += lineCost;
    }
    if (currentTocPage.length > 0) tocPagesArray.push(currentTocPage);

    // ─── 3. NUMÉROS DE PAGE ───────────────────────────────────
    const tocStartPage = 3;
    const contentStartPage = tocStartPage + tocPagesArray.length;

    const getPageForCas = (categoryName, casTitle) => {
        const index = contentPages.findIndex(p => p.categorie.includes(categoryName) && p.blocks.some(c => c.nom_du_cas.startsWith(casTitle)));
        return contentStartPage + index;
    };

    // ─── 4. RENDU HTML ────────────────────────────────────────

    // ── Page de garde ──
    const coverPage = createPageElement();
    coverPage.classList.add('page-cover');
    const versionTag = selectedVersion !== '1'
        ? `<div style="margin-top:8mm; font-size:14pt; color:var(--edln-blue); opacity:0.7;">${VERSION_LABELS[selectedVersion]}</div>`
        : '';
    coverPage.innerHTML = `
        <div class="logos-container" style="display: flex; gap: 30px; margin-bottom: 15px; align-items: center; justify-content: center; height: 100px;">
            <img src="logo_edln.png" alt="Logo EDLN" style="max-height: 100%; width: auto; object-fit: contain;">
            <img src="logo_bula.jpeg" alt="Logo Bundeslager" style="max-height: 100%; width: auto; object-fit: contain; border-radius: 10px;">
        </div>
        <h2 class="title-font" style="margin-bottom: 5px;">Carnet de survie linguistique</h2>
        <h1 class="title-font" style="margin-top: 5px;">Bundeslager 2026</h1>
        ${versionTag}
        <div class="identite-proprietaire">
            <strong style="color:var(--edln-yellow)">Ce carnet appartient à :</strong>
            <p><strong>Nom / Prénom :</strong> </p>
        </div>
    `;
    app.appendChild(coverPage);

    // ── Page vide ──
    app.appendChild(createPageElement());

    // ── Pages de Sommaire ──
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
                let casItems = [];
                while (i < entries.length && entries[i].type === 'cas') { casItems.push(entries[i]); i++; }
                if (casItems.length > 0) {
                    const half = Math.ceil(casItems.length / 2);
                    html += `<div class="toc-columns"><div class="toc-col">`;
                    casItems.slice(0, half).forEach(entry => {
                        const pageNum = getPageForCas(entry.refCategory, entry.title);
                        html += `<div class="toc-cas"><span>${entry.title}</span> <span class="dots"></span> <span style="font-weight:bold">${pageNum}</span></div>`;
                    });
                    html += `</div><div class="toc-col">`;
                    casItems.slice(half).forEach(entry => {
                        const pageNum = getPageForCas(entry.refCategory, entry.title);
                        html += `<div class="toc-cas"><span>${entry.title}</span> <span class="dots"></span> <span style="font-weight:bold">${pageNum}</span></div>`;
                    });
                    html += `</div></div>`;
                }
            } else {
                let casItems = [];
                while (i < entries.length && entries[i].type === 'cas') { casItems.push(entries[i]); i++; }
                if (casItems.length > 0) {
                    const half = Math.ceil(casItems.length / 2);
                    html += `<div class="toc-columns" style="margin-top:3mm;"><div class="toc-col">`;
                    casItems.slice(0, half).forEach(entry => {
                        const pageNum = getPageForCas(entry.refCategory, entry.title);
                        html += `<div class="toc-cas"><span>${entry.title}</span> <span class="dots"></span> <span style="font-weight:bold">${pageNum}</span></div>`;
                    });
                    html += `</div><div class="toc-col">`;
                    casItems.slice(half).forEach(entry => {
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

    // ── Pages de contenu ──
    contentPages.forEach((pageData, index) => {
        const contentPage = createPageElement();

        let html = `
            <div class="page-category-label">${pageData.categorie}</div>
            <div class="page-number">${contentStartPage + index}</div>
            <div class="page-content-wrapper">
        `;

        pageData.blocks.forEach(block => {
            html += `<div class="cas-container">`;
            if (block.nom_du_cas) {
                html += `<h2 class="cas-title">${block.nom_du_cas}</h2>`;
            }
            html += `<div class="cards-grid">`;

            block.expressions.forEach(expr => {
                html += `<div class="expression-card ${expr.sizeClass || ''}">`;
                html += `   <div class="expression-fr">${parseGrammar(expr.francais)}</div>`;

                if (expr.allemand) {
                    html += `   <div class="traduction">
                                    <div class="lang">DE</div>
                                    <div class="content">
                                        <span class="texte">${parseGrammar(expr.allemand.texte)}</span>
                                        <span class="prononciation">
                                            <span class="icon-dictaphone">${iconMic}</span>
                                            <span style="flex:1;">${parseGrammar(expr.allemand.prononciation_FR || '')}</span>
                                        </span>
                                    </div>
                                </div>`;
                }

                if (expr.anglais) {
                    html += `   <div class="traduction">
                                    <div class="lang">EN</div>
                                    <div class="content">
                                        <span class="texte">${parseGrammar(expr.anglais.texte)}</span>
                                        <span class="prononciation">
                                            <span class="icon-dictaphone">${iconMic}</span>
                                            <span style="flex:1;">${parseGrammar(expr.anglais.prononciation_FR || '')}</span>
                                        </span>
                                    </div>
                                </div>`;
                }

                html += `</div>`;
            });

            html += `</div></div>`;
        });

        html += `</div>`;
        contentPage.innerHTML = html;
        app.appendChild(contentPage);
    });

    // Ajustement dynamique de la mise en page
    adjustLayout();
}

// ─── Ajustement dynamique ─────────────────────────────────────
function adjustLayout() {
    // Forcer une seule ligne pour la prononciation phonétique
    const prons = document.querySelectorAll('.prononciation');
    prons.forEach(p => {
        p.style.whiteSpace = 'nowrap';
        p.style.overflow = 'hidden';
        p.style.textOverflow = 'ellipsis';

        const parentContent = p.closest('.content');
        if (!parentContent) return;

        let fontSizePt = 13;
        p.style.fontSize = fontSizePt + 'pt';

        let attempts = 0;
        while (p.scrollWidth > parentContent.clientWidth && fontSizePt > 6 && attempts < 25) {
            fontSizePt -= 0.5;
            p.style.fontSize = fontSizePt + 'pt';
            attempts++;
        }
    });

    // Réduire l'échelle verticale des pages qui débordent
    const pages = document.querySelectorAll('.page');
    pages.forEach((page) => {
        if (page.classList.contains('page-cover') || (!page.querySelector('.page-content-wrapper') && !page.classList.contains('page-toc'))) return;

        let scale = 1.0;

        if (page.classList.contains('page-toc')) {
            let attempts = 0;
            while (page.scrollHeight > page.clientHeight && scale > 0.6 && attempts < 15) {
                scale -= 0.05;
                const h2 = page.querySelector('h2');
                if (h2) { h2.style.fontSize = (45 * scale) + 'pt'; h2.style.marginBottom = (15 * scale) + 'mm'; }
                page.querySelectorAll('.toc-columns').forEach(col => { col.style.fontSize = (16 * scale) + 'pt'; col.style.gap = (15 * scale) + 'mm'; });
                page.querySelectorAll('.toc-cat').forEach(cat => { cat.style.fontSize = (18 * scale) + 'pt'; cat.style.marginTop = (6 * scale) + 'mm'; cat.style.marginBottom = (3 * scale) + 'mm'; });
                attempts++;
            }
            return;
        }

        const wrapper = page.querySelector('.page-content-wrapper');
        let attempts = 0;

        while (page.scrollHeight > page.clientHeight && scale > 0.6 && attempts < 15) {
            scale -= 0.05;

            page.querySelectorAll('.expression-card').forEach(card => {
                card.style.padding = (3 * scale) + 'mm ' + (4 * scale) + 'mm';
                const fr = card.querySelector('.expression-fr');
                if (fr) { fr.style.fontSize = (18 * scale) + 'pt'; fr.style.marginBottom = (2 * scale) + 'mm'; }
                card.querySelectorAll('.traduction').forEach(tr => {
                    tr.style.marginBottom = (1.5 * scale) + 'mm';
                    const lang = tr.querySelector('.lang');
                    if (lang) lang.style.fontSize = (15 * scale) + 'pt';
                    const texte = tr.querySelector('.texte');
                    if (texte) { texte.style.fontSize = (15 * scale) + 'pt'; texte.style.marginBottom = (1 * scale) + 'mm'; }
                    const pron = tr.querySelector('.prononciation');
                    if (pron) {
                        const currentSize = parseFloat(pron.style.fontSize) || 13;
                        pron.style.fontSize = (currentSize * 0.95) + 'pt';
                        pron.style.padding = (1.5 * scale) + 'mm ' + (3 * scale) + 'mm';
                    }
                });
            });

            if (wrapper) { wrapper.style.gap = (8 * scale) + 'mm'; wrapper.style.marginTop = (15 * scale) + 'mm'; }
            const casTitle = page.querySelector('.cas-title');
            if (casTitle) { casTitle.style.fontSize = (24 * scale) + 'pt'; casTitle.style.margin = '0 0 ' + (5 * scale) + 'mm 0'; }
            const grid = page.querySelector('.cards-grid');
            if (grid) grid.style.gap = (8 * scale) + 'mm';

            attempts++;
        }
    });
}

// ─── Lancer au chargement ────────────────────────────────────
window.addEventListener('DOMContentLoaded', loadAndBuild);
