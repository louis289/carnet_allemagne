const fs = require('fs');
const path = require('path');

const jsonDir = path.join(__dirname, 'JSON');
const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));

files.forEach(f => {
  const filePath = path.join(jsonDir, f);
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;
  
  // Retirer les balises de verbes/adjectifs injustifiées pour les expressions figées
  content = content.replace(/\[V\d+\](plaît)\[\/V\d+\]/g, '$1');
  content = content.replace(/\[[A-Z]\d+\](please)\[\/[A-Z]\d+\]/gi, '$1');
  content = content.replace(/\[V\d+\](en prie)\[\/V\d+\]/g, '$1');
  content = content.replace(/\[V\d+\](Welcome)\[\/V\d+\]/gi, '$1');
  content = content.replace(/\[(V|N|A)\d+\](bitte)\[\/\1\d+\]/gi, '$1'); // bitte (allemand)
  // "merci" pas un nom dans certain contextes si ce n'est pas littéral, mais on va s'en tenir à s'il te plaît/en prie

  if (f === '11_citations.json') {
      let data = JSON.parse(content);
      
      const appendSource = (exprFr, source) => {
          if (!exprFr.includes('(' + source + ')')) {
              return exprFr + ` <i>(${source})</i>`;
          }
          return exprFr;
      };

      data.carnet_scout.cas.forEach(casItem => {
          casItem.expressions.forEach(expr => {
              if (expr.francais.includes("force soit avec")) expr.francais = appendSource(expr.francais, "Star Wars");
              if (expr.francais.includes("ton père")) expr.francais = appendSource(expr.francais, "Star Wars");
              if (expr.francais.includes("Vers [N1]l'infini[/N1]")) expr.francais = appendSource(expr.francais, "Toy Story");
              if (expr.francais.includes("Houston")) expr.francais = appendSource(expr.francais, "Apollo 13");
              if (expr.francais.includes("E.T.")) expr.francais = appendSource(expr.francais, "E.T.");
              
              if (expr.francais.includes("ne [V1]passerez[/V1]")) expr.francais = appendSource(expr.francais, "Le Seigneur des Anneaux");
              if (expr.francais.includes("précieux")) expr.francais = appendSource(expr.francais, "Le Seigneur des Anneaux");
              if (expr.francais.includes("Fuyez")) expr.francais = appendSource(expr.francais, "Le Seigneur des Anneaux");
              if (expr.francais.includes("Un anneau")) expr.francais = appendSource(expr.francais, "Le Seigneur des Anneaux");
              if (expr.francais.includes("sorcier")) expr.francais = appendSource(expr.francais, "Harry Potter");
              
              if (expr.francais.includes("reviendrai")) expr.francais = appendSource(expr.francais, "Terminator");
              if (expr.francais.includes("Hasta la vista")) expr.francais = appendSource(expr.francais, "Terminator 2");
              if (expr.francais.includes("est Bond")) expr.francais = appendSource(expr.francais, "James Bond");
              if (expr.francais.includes("Avengers")) expr.francais = appendSource(expr.francais, "Avengers");
              if (expr.francais.includes("Yippee-ki-yay")) expr.francais = appendSource(expr.francais, "Die Hard");
              
              if (expr.francais.includes("fais pas dire")) expr.francais = appendSource(expr.francais, "Nicolas Cage Meme");
              if (expr.francais.includes("piège")) expr.francais = appendSource(expr.francais, "Star Wars");
              if (expr.francais.includes("Maman, va chercher")) expr.francais = appendSource(expr.francais, "Meme");
              if (expr.francais.includes("Mordor")) expr.francais = appendSource(expr.francais, "Le Seigneur des Anneaux");
              if (expr.francais.includes("tout simplement")) expr.francais = appendSource(expr.francais, "Shia LaBeouf");
              
              if (expr.francais.includes("On [V1]a besoin[/V1]")) expr.francais = appendSource(expr.francais, "Les Dents de la mer");
              if (expr.francais.includes("Courez, [N1]Forrest")) expr.francais = appendSource(expr.francais, "Forrest Gump");
              if (expr.francais.includes("boîte de chocolats")) expr.francais = appendSource(expr.francais, "Forrest Gump");
              if (expr.francais.includes("tant de sérieux")) expr.francais = appendSource(expr.francais, "The Dark Knight");
              if (expr.francais.includes("roi du monde")) expr.francais = appendSource(expr.francais, "Titanic");
          });
      });
      content = JSON.stringify(data, null, 2);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Mis à jour: ' + f);
  }
});
