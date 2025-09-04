Write-Host "Committing and pushing changes to GitHub..." -ForegroundColor Green
git add render.yaml .render-buildpacks
git commit -m "Force Node.js runtime with buildpacks and explicit config"
git push origin main
Write-Host "Done! Render should now redeploy automatically." -ForegroundColor Green
Read-Host "Press Enter to continue"
