@echo off
title Portail Unique EDLN - Carnet Scout & Fiches
echo ===========================================================
echo   Demarrage du Serveur Web EDLN...
echo ===========================================================
node server.js
if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] Le serveur s'est arrete de maniere inattendue ou Node.js n'est pas installe.
    pause
)
