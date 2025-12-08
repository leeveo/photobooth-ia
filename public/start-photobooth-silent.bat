@echo off
:: ==================================================================================
:: SCRIPT DE LANCEMENT PHOTOBOOTH - IMPRESSION SILENCIEUSE (KIOSK MODE)
:: ==================================================================================
::
:: INSTRUCTIONS :
:: 1. Modifiez la ligne "set URL=..." ci-dessous avec l'adresse de votre page print-monitor.
:: 2. Assurez-vous que l'imprimante est définie par défaut dans Windows.
:: 3. Fermez toutes les fenêtres Chrome.
:: 4. Lancez ce script en double-cliquant dessus.
::
:: EXEMPLE D'URL :
:: - En production : https://mon-site.vercel.app/photobooth-ia/admin/print-monitor
:: - En local : http://localhost:3000/photobooth-ia/admin/print-monitor
::
:: ==================================================================================

:: --- CONFIGURATION ---
:: ⚠️ IMPORTANT : Remplacez l'adresse ci-dessous par l'URL de votre page print-monitor
set "URL=http://localhost:3000/photobooth-ia/admin/print-monitor"

:: Si vous passez une URL en argument (via ligne de commande), elle sera prioritaire
if not "%~1"=="" set "URL=%~1"

echo.
echo =========================================================================
echo   PHOTOBOOTH - MODE KIOSQUE AVEC IMPRESSION AUTOMATIQUE
echo =========================================================================
echo.
echo URL configuree : %URL%
echo.
echo ---------------------------------------------------------------------
echo  IMPORTANT : Chrome doit etre completement ferme avant le lancement
echo              pour que le mode silencieux (--kiosk-printing) fonctionne.
echo ---------------------------------------------------------------------
echo.
echo Preparation en cours...
echo.

:: --- NETTOYAGE ---
:: Force la fermeture de toutes les instances de Chrome existantes
:: C'est OBLIGATOIRE pour que le flag --kiosk-printing soit pris en compte
echo [1/2] Fermeture de Chrome...
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul

:: --- LANCEMENT ---
:: --kiosk-printing : Imprime sans confirmation (le popup s'ouvre et se valide seul)
:: --kiosk : Plein écran strict (pas de barre d'adresse, pas de croix pour fermer)
:: --disable-infobars : Supprime les alertes de sécurité
:: --no-first-run : Évite les messages de bienvenue Chrome
:: --disable-extensions : Désactive les extensions pour éviter les interférences

echo [2/2] Lancement de Chrome en mode Kiosque...
echo.
echo =========================================================================
echo   Chrome va s'ouvrir en plein ecran.
echo   Pour quitter le mode Kiosque : Appuyez sur ALT + F4
echo =========================================================================
echo.

start chrome --kiosk-printing --kiosk --disable-infobars --no-first-run --disable-extensions "%URL%"

:: Script terminé
echo Lancement termine. Chrome est maintenant en mode Kiosque.
timeout /t 3 /nobreak >nul
exit
