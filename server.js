/**
 * Canvas Manager — VPS Backend Server
 * Node.js + Express | Data disimpan di storage/data.json
 * 
 * Deploy ke VPS:
 *   npm install
 *   node server.js
 *   (atau gunakan PM2: pm2 start server.js --name canvas-server)
 */

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Konfigurasi ─────────────────────────────────────────────────────────────
// API Key — GANTI dengan string rahasia Anda sendiri
// Harus sama dengan API_KEY di app.js
const API_KEY      = process.env.API_KEY || 'canvas-secret-key-2024';
const STORAGE_DIR  = path.join(__dirname, 'storage');
const DATA_FILE    = path.join(STORAGE_DIR, 'data.json');

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
    origin: '*',                   // Izinkan dari semua origin (browser apapun)
    methods: ['GET', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key']
}));
app.use(express.json({ limit: '10mb' }));

// Sajikan file frontend (HTML, CSS, JS) langsung dari server ini
app.use(express.static(__dirname, {
    index: 'index.html',
    extensions: ['html']
}));

// ── Helper ───────────────────────────────────────────────────────────────────
function ensureStorage() {
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ markers: [], routes: [] }, null, 2));
    }
}

function readData() {
    ensureStorage();
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        return { markers: [], routes: [] };
    }
}

function writeData(data) {
    ensureStorage();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Middleware: Auth API Key ─────────────────────────────────────────────────
function requireApiKey(req, res, next) {
    const key = req.headers['x-api-key'];
    if (!key || key !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: API key tidak valid' });
    }
    next();
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/data — Ambil semua data markers & routes
app.get('/api/data', requireApiKey, (req, res) => {
    try {
        const data = readData();
        res.json(data);
    } catch (e) {
        console.error('Error reading data:', e);
        res.status(500).json({ error: 'Gagal membaca data' });
    }
});

// PUT /api/data — Simpan data markers & routes (replace all)
app.put('/api/data', requireApiKey, (req, res) => {
    try {
        const body = req.body;

        // Validasi struktur data
        if (!body || typeof body !== 'object') {
            return res.status(400).json({ error: 'Body tidak valid' });
        }

        const data = {
            markers: Array.isArray(body.markers) ? body.markers : [],
            routes:  Array.isArray(body.routes)  ? body.routes  : [],
            updatedAt: new Date().toISOString()
        };

        writeData(data);

        console.log(`[${new Date().toLocaleString('id-ID')}] Data disimpan: ${data.markers.length} marker, ${data.routes.length} rute`);
        res.json({ success: true, markers: data.markers.length, routes: data.routes.length });
    } catch (e) {
        console.error('Error saving data:', e);
        res.status(500).json({ error: 'Gagal menyimpan data' });
    }
});

// GET /api/health — Cek status server
app.get('/api/health', (req, res) => {
    const data = readData();
    res.json({
        status: 'ok',
        server: 'Canvas Manager VPS Backend',
        markers: data.markers?.length || 0,
        routes:  data.routes?.length  || 0,
        uptime: Math.round(process.uptime()) + ' detik',
        time: new Date().toLocaleString('id-ID')
    });
});

// ── Start Server ─────────────────────────────────────────────────────────────
ensureStorage();
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Canvas Manager VPS Backend Server    ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Port    : ${PORT}                         ║`);
    console.log(`║  Data    : storage/data.json            ║`);
    console.log(`║  Health  : http://localhost:${PORT}/api/health ║`);
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log('⚠  PENTING: Ganti API_KEY di server.js dan app.js');
    console.log('   dengan string rahasia Anda sendiri!\n');
});

process.on('SIGTERM', () => { console.log('Server dihentikan.'); process.exit(0); });
process.on('SIGINT',  () => { console.log('Server dihentikan.'); process.exit(0); });
