@echo off
:: ==================================================================================
:: SCRIPT DE LANCEMENT PHOTOBOOTH - AVEC APERCU IMPRESSION (TEST)
:: ==================================================================================
::
:: Ce script est une copie de start-photobooth-silent.bat MAIS :
:: IL AFFICHE LA FENETRE D'IMPRESSION (pas d'impression silencieuse).
:: Cela permet de verifier le format, les marges et le nombre de pages.
::
:: ==================================================================================

:: --- CONFIGURATION ---
:: Remplacez l'adresse ci-dessous par l'URL de votre site en production
:: Exemple : set "URL=https://mon-photobooth-ia.vercel.app"
set "URL=http://localhost:3000/photobooth-coiffure/cheveux/result"

:: Si vous passez une URL en argument (via ligne de commande), elle sera prioritaire
if not "%~1"=="" set "URL=%~1"

echo.
echo [PHOTOBOOTH] Demarrage du mode TEST (Avec Apercu)...
echo Site Web : %URL%
echo.
echo ---------------------------------------------------------------------
echo  IMPORTANT : Chrome doit etre completement ferme avant le lancement.
echo ---------------------------------------------------------------------
echo.

:: --- NETTOYAGE ---
:: Force la fermeture de toutes les instances de Chrome existantes
echo Fermeture de Chrome en cours...
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

:: --- LANCEMENT ---
:: --kiosk : Plein écran strict
:: --auto-open-devtools-for-tabs : Ouvre la console F12 automatiquement pour le debug
:: (J'ai RETIRE --kiosk-printing pour que vous voyiez la boite de dialogue)

start chrome --kiosk --auto-open-devtools-for-tabs --disable-infobars --no-first-run "%URL%"

:: Pour quitter le mode Kiosque : Appuyez sur ALT + F4
