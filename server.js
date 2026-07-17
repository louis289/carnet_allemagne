const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9090;
const ROOT_DIR = __dirname;

// Active lock manager: key = filename, value = { user, expiresAt }
const activeLocks = {};
const LOCK_TIMEOUT_MS = 30000; // 30 seconds

function cleanExpiredLocks() {
    const now = Date.now();
    for (const filename in activeLocks) {
        if (activeLocks[filename].expiresAt < now) {
            delete activeLocks[filename];
        }
    }
}

function isFileLockedByOther(filename, user) {
    return null;
}


const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
    // Enable CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // API: Save audited JSON file
    if (req.method === 'POST' && pathname === '/api/audit/save') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { version, filename, content, user } = data;

                if (!filename || filename.includes('..')) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid filename' }));
                    return;
                }

                // Check lock
                const lockedBy = isFileLockedByOther(filename, user);
                if (lockedBy) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `La catégorie est verrouillée par ${lockedBy}` }));
                    return;
                }

                // Determine target subdirectory
                let targetSubdir = 'Version3';
                if (version === '1') targetSubdir = 'Version1';
                else if (version === '2') targetSubdir = 'Version2';
                else if (version === '3' || version === '4') targetSubdir = 'Version4';

                const targetDir = path.join(ROOT_DIR, 'JSON', targetSubdir);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const targetPath = path.join(targetDir, filename);
                fs.writeFileSync(targetPath, JSON.stringify(content, null, 2), 'utf-8');

                console.log(`[API Save] Saved ${filename} to JSON/${targetSubdir}/ (by user: ${user || 'anonymous'})`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error('[API Save Error]', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: Generate activity PDFs from JSON
    if (req.method === 'POST' && pathname === '/api/fiches/generate') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const fichesData = JSON.parse(body);
                
                // Write to Fiches_activitees/fiches_conçues.json
                const targetPath = path.join(ROOT_DIR, 'Fiches_activitees', 'fiches_conçues.json');
                fs.writeFileSync(targetPath, JSON.stringify(fichesData, null, 2), 'utf-8');
                console.log(`[API Fiches] Saved fiches to Fiches_activitees/fiches_conçues.json`);

                // Run Python script
                const { exec } = require('child_process');
                const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
                const scriptPath = path.join(ROOT_DIR, 'Fiches_activitees', 'generer_pdf.py');
                
                exec(`"${pythonCmd}" "${scriptPath}"`, (error, stdout, stderr) => {
                    if (error) {
                        console.error('[API Fiches Error]', error, stderr);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Erreur lors de la génération Python des PDFs', details: error.message }));
                        return;
                    }
                    
                    console.log(`[API Fiches Python Stdout]`, stdout);
                    
                    // Read output folder to list generated files
                    const outputDir = path.join(ROOT_DIR, 'Fiches_activitees', 'Fiches_Générées');
                    let pdfFiles = [];
                    if (fs.existsSync(outputDir)) {
                        pdfFiles = fs.readdirSync(outputDir)
                            .filter(file => file.toLowerCase().endsWith('.pdf'))
                            .map(file => ({
                                name: file,
                                url: `/Fiches_activitees/Fiches_Générées/${encodeURIComponent(file)}`
                            }));
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, files: pdfFiles }));
                });
            } catch (err) {
                console.error('[API Fiches Error]', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: Get active locks
    if (req.method === 'GET' && pathname === '/api/audit/locks') {
        cleanExpiredLocks();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ locks: activeLocks }));
        return;
    }

    // API: Get list of generated PDF fiches
    if (req.method === 'GET' && pathname === '/api/fiches/list') {
        try {
            const outputDir = path.join(ROOT_DIR, 'Fiches_activitees', 'Fiches_Générées');
            let pdfFiles = [];
            if (fs.existsSync(outputDir)) {
                pdfFiles = fs.readdirSync(outputDir)
                    .filter(file => file.toLowerCase().endsWith('.pdf'))
                    .map(file => ({
                        name: file,
                        url: `/Fiches_activitees/Fiches_Générées/${encodeURIComponent(file)}`
                    }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, files: pdfFiles }));
        } catch (err) {
            console.error('[API Fiches List Error]', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // API: Acquire or renew a lock
    if (req.method === 'POST' && pathname === '/api/audit/lock') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { filename, user } = data;
                if (!filename || !user) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing filename or user' }));
                    return;
                }
                
                cleanExpiredLocks();
                const lockedBy = isFileLockedByOther(filename, user);
                if (lockedBy) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: `Locked by ${lockedBy}`, locks: activeLocks }));
                } else {
                    activeLocks[filename] = {
                        user: user,
                        expiresAt: Date.now() + LOCK_TIMEOUT_MS
                    };
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, locks: activeLocks }));
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: Unlock a file
    if (req.method === 'POST' && pathname === '/api/audit/unlock') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { filename, user } = data;
                if (filename && activeLocks[filename] && activeLocks[filename].user === user) {
                    delete activeLocks[filename];
                }
                cleanExpiredLocks();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, locks: activeLocks }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: Reorder JSON files on the server (renaming them with prefix indices)
    if (req.method === 'POST' && pathname === '/api/audit/reorder-files') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { version, filesOrder, user } = data;
                
                if (!filesOrder || !Array.isArray(filesOrder)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid filesOrder' }));
                    return;
                }
                
                let targetSubdir = 'Version3';
                if (version === '1') targetSubdir = 'Version1';
                else if (version === '2') targetSubdir = 'Version2';
                else if (version === '3' || version === '4') targetSubdir = 'Version4';
                
                const targetDir = path.join(ROOT_DIR, 'JSON', targetSubdir);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                // 1. Verify that none of the files in filesOrder are locked by another user
                for (const oldFilename of filesOrder) {
                    const lockedBy = isFileLockedByOther(oldFilename, user);
                    if (lockedBy) {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: `Le fichier ${oldFilename} est verrouillé par ${lockedBy}` }));
                        return;
                    }
                }

                // 2. Read contents of all files in their current state (Version4 if exists, else Version3)
                const filesToSave = [];
                for (let i = 0; i < filesOrder.length; i++) {
                    const oldFilename = filesOrder[i];
                    const newFilename = (i + 1) + '_' + oldFilename.replace(/^\d+_/, '');
                    
                    let sourcePath = path.join(targetDir, oldFilename);
                    if ((version === '3' || version === '4') && !fs.existsSync(sourcePath)) {
                        sourcePath = path.join(ROOT_DIR, 'JSON', 'Version3', oldFilename);
                    }
                    
                    if (!fs.existsSync(sourcePath)) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: `Fichier introuvable: ${oldFilename}` }));
                        return;
                    }
                    
                    const content = fs.readFileSync(sourcePath, 'utf-8');
                    filesToSave.push({ filename: newFilename, content: JSON.parse(content) });
                }

                // 3. Clear existing files in targetDir (prevent old prefix name ghost files)
                if (fs.existsSync(targetDir)) {
                    const existingFiles = fs.readdirSync(targetDir);
                    existingFiles.forEach(f => {
                        if (f.endsWith('.json')) {
                            fs.unlinkSync(path.join(targetDir, f));
                        }
                    });
                }

                // 4. Write files under their new sequential prefix names
                filesToSave.forEach(f => {
                    const destPath = path.join(targetDir, f.filename);
                    fs.writeFileSync(destPath, JSON.stringify(f.content, null, 2), 'utf-8');
                });

                // 5. Update active locks keys to match the new filenames!
                const oldLocks = { ...activeLocks };
                for (const oldKey in oldLocks) {
                    const lockVal = oldLocks[oldKey];
                    const idx = filesOrder.indexOf(oldKey);
                    if (idx >= 0) {
                        const newKey = (idx + 1) + '_' + oldKey.replace(/^\d+_/, '');
                        delete activeLocks[oldKey];
                        activeLocks[newKey] = lockVal;
                    }
                }

                console.log(`[API Reorder] Successfully reordered ${filesOrder.length} files in JSON/${targetSubdir} (by user: ${user || 'anonymous'})`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error('[API Reorder Error]', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: Reset audit session
    if (req.method === 'POST' && pathname === '/api/audit/reset') {
        const version = parsedUrl.searchParams.get('v');
        try {
            if (version === '3' || version === '4') {
                const targetDir = path.join(ROOT_DIR, 'JSON', 'Version4');
                if (fs.existsSync(targetDir)) {
                    const files = fs.readdirSync(targetDir);
                    files.forEach(f => {
                        if (f.endsWith('.json')) {
                            fs.unlinkSync(path.join(targetDir, f));
                        }
                    });
                }
                console.log(`[API Reset] Reset Version4 (deleted audited files)`);
            } else {
                // Strip audit field in-place for V1/V2
                const targetSubdir = version === '1' ? 'Version1' : 'Version2';
                const targetDir = path.join(ROOT_DIR, 'JSON', targetSubdir);
                if (fs.existsSync(targetDir)) {
                    const files = fs.readdirSync(targetDir);
                    files.forEach(f => {
                        if (f.endsWith('.json')) {
                            const filePath = path.join(targetDir, f);
                            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                            if (content && content.carnet_scout) {
                                content.carnet_scout.cas.forEach(cas => {
                                    cas.expressions.forEach(expr => {
                                        delete expr.audit;
                                    });
                                });
                                fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
                            }
                        }
                    });
                }
                console.log(`[API Reset] Stripped audit flags in JSON/${targetSubdir}`);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (err) {
            console.error('[API Reset Error]', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Route default folder requests to landing.html
    if (pathname === '/' || pathname === '/Web_PDF_Generator' || pathname === '/Web_PDF_Generator/') {
        pathname = '/Web_PDF_Generator/landing.html';
    }

    let filePath = path.join(ROOT_DIR, pathname);



    // Fallback: If requesting a file at root that doesn't exist, check Web_PDF_Generator
    if (!fs.existsSync(filePath) && !pathname.startsWith('/Web_PDF_Generator/')) {
        const generatorPath = path.join(ROOT_DIR, 'Web_PDF_Generator', pathname);
        if (fs.existsSync(generatorPath)) {
            filePath = generatorPath;
            console.log(`[Fallback] Serving ${pathname} from Web_PDF_Generator`);
        }
    }

    // Check if path exists or if it's the virtual Version4 directory
    let stat;
    let isDir = false;
    try {
        stat = fs.statSync(filePath);
        isDir = stat.isDirectory();
    } catch (e) {
        if (pathname.endsWith('/JSON/Version4/') || pathname.endsWith('/JSON/Version4')) {
            isDir = true;
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }
    }

    // Handle directory listing
    if (isDir) {
        if (!pathname.endsWith('/')) {
            res.writeHead(301, { 'Location': pathname + '/' });
            res.end();
            return;
        }

        let files = [];
        files = fs.readdirSync(filePath);

        // Sort files to preserve natural/alphabetical listing order
        files.sort();

        // Render simple HTML with a[href] links for directory listing
        let html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>`;
        files.forEach(f => {
            html += `<a href="${f}">${f}</a><br>`;
        });
        html += `</body></html>`;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
    }

    // Serve file content
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
        console.error('[Stream Error]', err);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal server error');
        }
    });
    stream.pipe(res);
});

const os = require('os');
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIpAddress();
    console.log(`===========================================================`);
    console.log(`Custom Web App Server running at:`);
    console.log(`  - Local:            http://localhost:${PORT}/`);
    console.log(`  - Local Network IP: http://${localIp}:${PORT}/`);
    console.log(`===========================================================`);
});
