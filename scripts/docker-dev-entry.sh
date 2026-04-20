#!/bin/sh
# Vite в Docker: зависимости в named volume, HMR с VITE_POLL=1
set -e
cd /app

if [ ! -d node_modules/vite ] || [ ! -d node_modules/@vitejs ]; then
  echo "[analytics-frontend dev] npm ci…"
  npm ci --no-audit --prefer-offline
fi

exec npm run dev -- --host 0.0.0.0 --port 9001
