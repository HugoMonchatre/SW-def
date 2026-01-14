@echo off
echo ========================================
echo  SW-def - Demarrage de l'application
echo ========================================
echo.

echo [1/2] Demarrage du Backend (Port 5000)...
start "SW-def Backend" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak > nul

echo [2/2] Demarrage du Frontend (Port 5173)...
start "SW-def Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo  Application en cours de demarrage...
echo ========================================
echo.
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:5173
echo.
echo  Appuyez sur une touche pour fermer cette fenetre...
pause > nul
