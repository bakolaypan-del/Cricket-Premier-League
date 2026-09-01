@echo off
title Cricket Premier League Localhost Server
echo ==========================================================
echo Starting Cricket Premier League Localhost Server on Port 8080...
echo ==========================================================
echo Website link: http://127.0.0.1:8080/
echo ==========================================================

start "" http://127.0.0.1:8080/

node server.js
if %errorlevel% neq 0 (
    echo Node.js not found or failed, attempting PowerShell server fallback...
    powershell -ExecutionPolicy Bypass -File .\server.ps1
)
pause

