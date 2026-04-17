@echo off
echo =======================================================
echo          Starting SoMailer AI Email Solution
echo =======================================================

echo.
echo [1/4] Starting Database and Redis...
cd /d e:\AI-Email-Solution
docker compose up -d

echo.
echo [2/4] Starting n8n Workflow Server...
docker start n8ncontainer

echo.
echo [3/4] Starting FastAPI Backend on Port 8000...
cd /d e:\AI-Email-Solution\backend
start cmd.exe /k ".\venv\Scripts\activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [4/4] Starting React Frontend...
cd /d e:\AI-Email-Solution\frontend
start cmd.exe /k "npm run dev"

echo.
echo =======================================================
echo All services have been initiated in separate windows!
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:8000
echo - n8n Studio: http://localhost:5678
echo =======================================================
pause
