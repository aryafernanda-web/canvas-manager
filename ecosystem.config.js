# ecosystem.config.js — Konfigurasi PM2 untuk menjaga server tetap berjalan
# PM2 otomatis restart server jika crash, dan bisa autostart saat VPS reboot

module.exports = {
  apps: [{
    name: 'canvas-manager',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      API_KEY: 'canvas-secret-key-2024'   // GANTI dengan key rahasia Anda
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
