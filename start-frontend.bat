@echo off
echo Starting ONIONLENS 360 Frontend...
cd /d "%~dp0frontend"
if not exist node_modules npm install
if not exist .env copy .env.example .env 2>nul
npm run dev
