@echo off
echo Starting ONIONLENS 360 Backend...
cd /d "%~dp0backend"
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)
if not exist .env copy .env.example .env
uvicorn app.main:app --reload --port 8000
