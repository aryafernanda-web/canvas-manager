#!/bin/bash
# ============================================================
# Canvas Manager — VPS Setup Script
# Ubuntu 24.04 | IP: 103.93.132.76
# Jalankan: bash setup-vps.sh
# ============================================================

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║   Canvas Manager VPS Setup Script      ║"
echo "║   Ubuntu 24.04 | 103.93.132.76         ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# --- Install PM2 jika belum ada ---
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}[1/4] Installing PM2...${NC}"
    npm install -g pm2
else
    echo -e "${GREEN}[1/4] PM2 sudah terinstall ✓${NC}"
fi

# --- Install dependencies ---
echo -e "${YELLOW}[2/4] Installing npm dependencies...${NC}"
npm install

# --- Buat direktori storage ---
echo -e "${YELLOW}[3/4] Membuat direktori storage...${NC}"
mkdir -p storage logs
if [ ! -f storage/data.json ]; then
    echo '{"markers":[],"routes":[]}' > storage/data.json
    echo "  storage/data.json dibuat"
fi

# --- Buka port 3001 di firewall ---
echo -e "${YELLOW}[4/4] Konfigurasi firewall (UFW)...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 3001/tcp 2>/dev/null || true
    echo "  Port 3001 dibuka di UFW"
else
    echo "  UFW tidak ditemukan, skip (pastikan port 3001 terbuka di panel VPS)"
fi

# --- Start dengan PM2 ---
echo ""
echo -e "${YELLOW}Menjalankan server dengan PM2...${NC}"

# Stop jika sudah berjalan sebelumnya
pm2 stop canvas-manager 2>/dev/null || true
pm2 delete canvas-manager 2>/dev/null || true

# Start server
pm2 start ecosystem.config.js
pm2 save

# Setup autostart saat reboot
pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup 2>/dev/null || true

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗"
echo "║   Setup Selesai! ✓                     ║"
echo "╠════════════════════════════════════════╣"
echo "║  Health check:                          ║"
echo "║  http://103.93.132.76:3001/api/health  ║"
echo "║                                         ║"
echo "║  Akses aplikasi:                        ║"
echo "║  http://103.93.132.76:3001             ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Test server
sleep 2
echo "Tes koneksi ke server..."
curl -s http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || \
curl -s http://localhost:3001/api/health || \
echo "Server belum merespons, cek: pm2 logs canvas-manager"
