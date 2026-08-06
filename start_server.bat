@echo off
title Cricket Premier League Localhost Server
echo ==========================================================
echo Starting Cricket Premier League Localhost Server on Port 8080...
echo ==========================================================
echo Website link: http://127.0.0.1:8080/
echo ==========================================================

start "" http://127.0.0.1:8080/

if exist "C:\Users\ss\.gemini\antigravity\scratch\node_tool\node-v20.15.0-win-x64\node.exe" (
    "C:\Users\ss\.gemini\antigravity\scratch\node_tool\node-v20.15.0-win-x64\node.exe" server.js
) else (
    node server.js
)
pause
