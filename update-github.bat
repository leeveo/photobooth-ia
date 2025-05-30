@echo off
echo Mise à jour du code sur GitHub...
git add .
git commit -m "Mise à jour du %date% à %time%"
git push origin main
echo Terminé! Vérifiez GitHub pour voir les modifications.
pause
