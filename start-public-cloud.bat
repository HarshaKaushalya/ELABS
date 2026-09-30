@echo off
title ELABS - 100%% Free Cloud Public Host
echo ========================================================
echo   Starting ELABS Cloud Tunnel (100%% Free, Zero Cards)
echo ========================================================
echo.
echo Launching public HTTPS edge tunnel...
C:\tools\cloudflared.exe tunnel --url http://localhost:3000
pause
