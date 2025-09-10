# Tech Blog Setup Script
Write-Host "Technology Blog Setup" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Your tech blog is configured as:" -ForegroundColor Yellow
Write-Host "URL: http://automated-content-pipeline-local-test-site.local" -ForegroundColor White
Write-Host "Username: admin" -ForegroundColor White
Write-Host "Status: Ready for Application Password setup" -ForegroundColor Green

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open your WordPress admin panel:" -ForegroundColor White
Write-Host "   http://automated-content-pipeline-local-test-site.local/wp-admin" -ForegroundColor Cyan

Write-Host ""
Write-Host "2. Navigate to Users > Your Profile" -ForegroundColor White

Write-Host ""
Write-Host "3. Scroll down to Application Passwords section" -ForegroundColor White

Write-Host ""
Write-Host "4. Create a new Application Password:" -ForegroundColor White
Write-Host "   - Application Name: Content Pipeline" -ForegroundColor Cyan
Write-Host "   - Click Add New Application Password" -ForegroundColor Cyan

Write-Host ""
Write-Host "5. Copy the generated password (it will look like: xxxx xxxx xxxx xxxx xxxx xxxx)" -ForegroundColor White

Write-Host ""
Write-Host "6. Update the site configuration:" -ForegroundColor White
Write-Host "   Edit: config/sites/tech-blog.json" -ForegroundColor Cyan
Write-Host "   Replace the empty appPassword field with your generated password" -ForegroundColor Cyan

Write-Host ""
Write-Host "7. Test the connection:" -ForegroundColor White
Write-Host "   node scripts/test-tech-blog.js" -ForegroundColor Cyan

Write-Host ""
Write-Host "Tech Blog Topics:" -ForegroundColor Green
Write-Host "- Artificial Intelligence and Machine Learning" -ForegroundColor White
Write-Host "- Programming tutorials and guides" -ForegroundColor White
Write-Host "- Software development best practices" -ForegroundColor White
Write-Host "- Cybersecurity tips and news" -ForegroundColor White
Write-Host "- Web and mobile development" -ForegroundColor White
Write-Host "- Cloud computing and DevOps" -ForegroundColor White

Write-Host ""
Write-Host "Once configured, you can generate tech content using:" -ForegroundColor Yellow
Write-Host "- Multi-Site Dashboard: http://localhost:3000/multi-site" -ForegroundColor Cyan
Write-Host "- Command line: node scripts/multi-site-generator.js" -ForegroundColor Cyan

Write-Host ""
Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host
