@echo off
:: ==================================================================================
:: SCRIPT DE LANCEMENT PHOTOBOOTH - MODE DEBUG
:: ==================================================================================
:: Ce script lance Chrome avec l'impression silencieuse MAIS :
:: 1. En mode fenêtré (pas de plein écran bloquant)
:: 2. Avec la console de développement ouverte automatiquement
:: ==================================================================================

:: --- CONFIGURATION ---
set "URL=http://localhost:3000/photobooth-coiffure/cheveux/result"

:: Si vous passez une URL en argument, elle sera prioritaire
if not "%~1"=="" set "URL=%~1"

echo.
echo [PHOTOBOOTH] Demarrage du mode DEBUG...
echo Site Web : %URL%
echo.

:: --- NETTOYAGE ---
echo Fermeture de Chrome en cours...
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

:: --- LANCEMENT ---
:: --kiosk-printing : Garde l'impression silencieuse pour tester
:: --auto-open-devtools-for-tabs : Ouvre la console F12 automatiquement
:: (J'ai retiré --kiosk pour que vous gardiez la main sur la fenêtre)

start chrome --kiosk-printing --auto-open-devtools-for-tabs --disable-infobars --no-first-run "%URL%"

echo.
echo Chrome lance en mode DEBUG.
echo Vous pouvez voir la console et deplacer la fenetre.
