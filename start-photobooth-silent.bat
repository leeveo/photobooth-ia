@echo off
:: ==================================================================================
:: SCRIPT DE LANCEMENT PHOTOBOOTH - IMPRESSION SILENCIEUSE (KIOSK MODE)
:: ==================================================================================
::
:: INSTRUCTIONS :
:: 1. Modifiez la ligne "set URL=..." ci-dessous avec l'adresse de votre site Web.
:: 2. Assurez-vous que l'imprimante est définie par défaut dans Windows.
:: 3. Fermez toutes les fenêtres Chrome.
:: 4. Lancez ce script.
::
:: ==================================================================================

:: --- CONFIGURATION ---
:: Remplacez l'adresse ci-dessous par l'URL de votre site en production
:: Exemple : set "URL=https://mon-photobooth-ia.vercel.app"
set "URL=http://localhost:3000/photobooth-coiffure/cheveux/result"

:: Si vous passez une URL en argument (via ligne de commande), elle sera prioritaire
if not "%~1"=="" set "URL=%~1"

echo.
echo [PHOTOBOOTH] Demarrage du mode Kiosque...
echo Site Web : %URL%
echo.
echo ---------------------------------------------------------------------
echo  IMPORTANT : Chrome doit etre completement ferme avant le lancement
echo              pour que le mode silencieux (--kiosk-printing) fonctionne.
echo ---------------------------------------------------------------------
echo.

:: --- NETTOYAGE ---
:: Force la fermeture de toutes les instances de Chrome existantes
:: C'est OBLIGATOIRE pour que le flag --kiosk-printing soit pris en compte
echo Fermeture de Chrome en cours...
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

:: --- LANCEMENT ---
:: --kiosk-printing : Imprime sans confirmation (le popup s'ouvre et se valide seul)
:: --kiosk : Plein écran strict (pas de barre d'adresse, pas de croix pour fermer)
:: --disable-infobars : Supprime les alertes de sécurité
:: --no-first-run : Évite les messages de bienvenue Chrome

start chrome --kiosk-printing --kiosk --disable-infobars --no-first-run "%URL%"

:: Pour quitter le mode Kiosque : Appuyez sur ALT + F4
