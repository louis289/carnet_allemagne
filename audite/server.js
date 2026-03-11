const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const JSON_DIR = path.join(__dirname, '..', 'JSON');

const server = http.createServer((req, res) => {
    // CORS headers just in case
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/') {
        const indexPath = path.join(__dirname, 'index.html');
        fs.readFile(indexPath, 'utf-8', (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error reading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        });
        return;
    }

    if (req.method === 'GET' && req.url === '/api/files') {
        fs.readdir(JSON_DIR, (err, files) => {
            if (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
                return;
            }
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(jsonFiles));
        });
        return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/file?name=')) {
        const filename = new URL(req.url, `http://${req.headers.host}`).searchParams.get('name');
        if (!filename || filename.includes('..')) {
            res.writeHead(400);
            res.end('Invalid filename');
            return;
        }
        const filepath = path.join(JSON_DIR, filename);
        fs.readFile(filepath, 'utf-8', (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'File not found' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(content);
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/save') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const filename = data.filename;
                const content = data.content;

                if (!filename || filename.includes('..')) {
                    res.writeHead(400);
                    res.end('Invalid filename');
                    return;
                }

                const filepath = path.join(JSON_DIR, filename);
                fs.writeFileSync(filepath, JSON.stringify(content, null, 2), 'utf-8');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log(`Dossier JSON ciblé : ${JSON_DIR}`);
});
