#!/bin/bash
set -e
echo "Starting ONIONLENS 360 Backend..."
cd "$(dirname "$0")/backend"
[ ! -d venv ] && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt || source venv/bin/activate
[ ! -f .env ] && cp .env.example .env
uvicorn app.main:app --reload --port 8000
