@echo off
echo Updating code on Vercel...
git add .
git commit -m "Update: %date% %time%"
git push origin main
echo Done! Check Vercel for deployment status.
pause
