@echo off
echo Committing and pushing changes to GitHub...
git add render.yaml .render-buildpacks
git commit -m "Force Node.js runtime with buildpacks and explicit config"
git push origin main
echo Done! Render should now redeploy automatically.
pause
