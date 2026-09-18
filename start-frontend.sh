#!/bin/bash
set -e
echo "Starting ONIONLENS 360 Frontend..."
cd "$(dirname "$0")/frontend"
[ ! -d node_modules ] && npm install
[ ! -f .env ] && cp .env.example .env 2>/dev/null || true
npm run dev
