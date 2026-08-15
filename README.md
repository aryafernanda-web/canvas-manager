# 🗺️ Canvas Manager — Area Management Tulungagung

Aplikasi manajemen area canvas berbasis peta interaktif (Leaflet.js) dengan cloud sync — data tersimpan di server dan bisa dibuka dari device manapun.

## ✨ Fitur
- 📍 **Marker Management** — Tambah, edit, hapus marker di peta
- 🛣️ **Route Drawing** — Gambar rute manual di atas peta
- ☁️ **Cloud Sync** — Data otomatis tersimpan ke server, sync di semua device
- 💾 **Fallback localStorage** — Tetap bekerja walau server tidak terjangkau
- 🗂️ **Klasterisasi marker** — Marker dikelompokkan otomatis saat zoom jauh

## 🚀 Deploy ke Render.com (Gratis)

### Cara Deploy
1. Fork / clone repo ini ke GitHub kamu
2. Buka [render.com](https://render.com) → Sign up dengan GitHub
3. Klik **New +** → **Web Service**
4. Pilih repository `canvas-manager`
5. Render otomatis mendeteksi `render.yaml` → klik **Create Web Service**
6. Tunggu ~2 menit → aplikasi live di `https://canvas-manager-xxxx.onrender.com`

### Catatan Render Free Tier
> ⚠️ Server akan "tidur" setelah 15 menit tidak aktif. Request pertama butuh ~50 detik untuk bangun.
> Data tetap aman — tersimpan di `storage/data.json` di server.

## 🖥️ Jalankan Lokal

```bash
npm install
node server.js
```

Buka browser: `http://localhost:3001`

## 🔐 Keamanan API Key

Edit `server.js` dan `app.js`, ganti:
```
'canvas-secret-key-2024'
```
Dengan string rahasia Anda sendiri.

Di Render.com, set environment variable `API_KEY` di **Settings → Environment**.

## 📁 Struktur File

```
canvas-manager/
├── index.html          # Frontend utama
├── app.js              # Logic peta & cloud sync
├── style.css           # Tampilan
├── server.js           # Backend Express (API + static files)
├── data.js             # Data KML/koordinat
├── render.yaml         # Konfigurasi Render.com
├── ecosystem.config.js # Konfigurasi PM2 (untuk VPS)
└── storage/
    └── data.json       # Database lokal (auto-generated)
```

## 🌐 Teknologi
- **Frontend**: HTML5, CSS3, JavaScript, [Leaflet.js](https://leafletjs.com)
- **Backend**: Node.js, Express.js
- **Hosting**: [Render.com](https://render.com) (free tier)
