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
set "URL=https://photobooth.waibooth.app/photobooth-ia/admin/print-monitor"

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

:: --- PREPARATION PROFIL DEDIE ---
:: Création d'un profil Chrome dédié pour le kiosque
:: Cela permet de garder Chrome normal ouvert en parallèle
set "PROFILE_DIR=%TEMP%\ChromeKioskPhotobooth"
if not exist "%PROFILE_DIR%" mkdir "%PROFILE_DIR%"

echo [1/2] Preparation du profil Chrome dedie pour le kiosque...
:: On ne ferme PAS Chrome, on utilise un profil séparé

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

:: Recherche automatique de Chrome dans les emplacements courants
set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
) else (
    echo ERREUR : Chrome n'a pas ete trouve sur ce systeme !
    echo Veuillez installer Google Chrome ou modifier le chemin dans le script.
    pause
    exit /b 1
)

echo Chrome trouve : %CHROME_PATH%
echo.

:: Lancement avec profil dédié (user-data-dir) pour ne pas interférer avec Chrome normal
:: --disable-popup-blocking : ESSENTIEL pour autoriser les popups d'impression automatique
start "" "%CHROME_PATH%" --user-data-dir="%PROFILE_DIR%" --kiosk-printing --kiosk --disable-infobars --no-first-run --disable-extensions --disable-session-crashed-bubble --disable-features=TranslateUI --disable-popup-blocking --autoplay-policy=no-user-gesture-required "%URL%"

:: Script terminé
echo Lancement termine. Chrome est maintenant en mode Kiosque.
timeout /t 3 /nobreak >nul
exit
