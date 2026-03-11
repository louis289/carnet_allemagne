const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'JSON');

// 1. Process 11_citations.json
let citationsPath = path.join(dir, '11_citations.json');
let citationsData = JSON.parse(fs.readFileSync(citationsPath, 'utf8').replace(/^\uFEFF/, ''));

let expressions = [];
citationsData.carnet_scout.cas.forEach(c => {
    expressions = expressions.concat(c.expressions);
});

// User noted we make an exception for citations, so we KEEP the original text, but we need to group by movie and remove the parenthesized text.
let grouped = {};
expressions.forEach(e => {
    // Extract work from `<i>(Work)</i>` or `(Work)`
    let workMatch = e.francais.match(/<i>\((.*?)\)<\/i>/) || e.francais.match(/\((.*?)\)/);
    let workLabel = 'Autres';
    
    if (workMatch) {
        workLabel = workMatch[1];
        e.francais = e.francais.replace(workMatch[0], '').trim();
    } else if (e.francais.includes('Nicolas Cage Meme')) {
        workLabel = 'Nicolas Cage Meme';
        e.francais = e.francais.replace('Nicolas Cage Meme', '').trim();
    } else if (e.francais.includes('Shia LaBeouf')) {
        workLabel = 'Shia LaBeouf';
        e.francais = e.francais.replace('Shia LaBeouf', '').trim();
    } else if (e.francais.includes('Maman, va chercher la caméra !')) {
        workLabel = "Meme d'Internet";
    } else if (e.francais.includes('E.T. téléphone maison.')) {
        // Just in case it missed it for some reason
        workLabel = 'E.T.';
    }

    if (!grouped[workLabel]) {
        grouped[workLabel] = [];
    }
    grouped[workLabel].push(e);
});

let newCas11 = [];
let casId = 1;
for (let work in grouped) {
    if (work === 'Autres') continue; // We'll add this at the end if needed
    let exprList = grouped[work];
    exprList.forEach((e, idx) => e.id_expression = idx + 1);
    newCas11.push({
        id_cas: casId++,
        nom_du_cas: work,
        expressions: exprList
    });
}
if (grouped['Autres'] && grouped['Autres'].length > 0) {
    let exprList = grouped['Autres'];
    exprList.forEach((e, idx) => e.id_expression = idx + 1);
    newCas11.push({
        id_cas: casId++,
        nom_du_cas: 'Autres',
        expressions: exprList
    });
}
citationsData.carnet_scout.cas = newCas11;
fs.writeFileSync(citationsPath, JSON.stringify(citationsData, null, 2), 'utf8');

// 2. Process 8_expressions_francaises.json
let file8 = path.join(dir, '8_expressions_francaises.json');
let data8 = JSON.parse(fs.readFileSync(file8, 'utf8').replace(/^\uFEFF/, ''));
data8.carnet_scout.cas[0].nom_du_cas = 'Faim, Froid et Déceptions';
data8.carnet_scout.cas[1].nom_du_cas = 'Fatigue et Menteries';
fs.writeFileSync(file8, JSON.stringify(data8, null, 2), 'utf8');

// 3. Process 9_expressions_anglaises.json
let file9 = path.join(dir, '9_expressions_anglaises.json');
let data9 = JSON.parse(fs.readFileSync(file9, 'utf8').replace(/^\uFEFF/, ''));
data9.carnet_scout.cas[0].nom_du_cas = 'Facilité et Surprises';
data9.carnet_scout.cas[1].nom_du_cas = 'Encouragements et Problèmes';

let expressions9 = data9.carnet_scout.cas[1].expressions;
let kickIdx = expressions9.findIndex(e => e.francais.includes('seau') && e.francais.includes('pied'));
if (kickIdx > -1) {
    expressions9[kickIdx] = {
        id_expression: expressions9[kickIdx].id_expression,
        francais: "[V1]Être[/V1] sur [N1]le petit nuage[/N1]. (Être sur un petit nuage)",
        allemand: {
            texte: "Auf [N1]Wolke[/N1] sieben [V1]schweben[/V1].",
            prononciation_FR: "Aouf [N1]vol-keu[/N1] zi-beun [V1]chvé-beun[/V1]."
        },
        anglais: {
            texte: "[V1]To be[/V1] on [N1]cloud[/N1] nine.",
            prononciation_FR: "[V1]Tou bi[/V1] on [N1]klaoud[/N1] naïn."
        }
    };
}
fs.writeFileSync(file9, JSON.stringify(data9, null, 2), 'utf8');

// 4. Process 10_expressions_allemandes.json
let file10 = path.join(dir, '10_expressions_allemandes.json');
let data10 = JSON.parse(fs.readFileSync(file10, 'utf8').replace(/^\uFEFF/, ''));
data10.carnet_scout.cas[0].nom_du_cas = 'Incompréhension et Problèmes';
data10.carnet_scout.cas[1].nom_du_cas = 'Encouragements et Étonnement';

let expressions10 = data10.carnet_scout.cas[1].expressions;
let matouIdx = expressions10.findIndex(e => e.francais.includes('matou'));
if (matouIdx > -1) {
    expressions10[matouIdx].francais = "[V1]Avoir[/V1] [N1]un matou[/N1]. (Avoir forcé la veille / Être courbaturé)";
}
fs.writeFileSync(file10, JSON.stringify(data10, null, 2), 'utf8');

console.log('JSON files successfully updated.');
