# Health Site Setup Script
Write-Host "Health & Wellness Site Setup" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Your health site is configured as:" -ForegroundColor Yellow
Write-Host "URL: http://health-blog-test.local" -ForegroundColor White
Write-Host "Username: admin" -ForegroundColor White
Write-Host "Status: Ready for Application Password setup" -ForegroundColor Green

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open your WordPress admin panel:" -ForegroundColor White
Write-Host "   http://health-blog-test.local/wp-admin" -ForegroundColor Cyan

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
Write-Host "   Edit: config/sites/health-wellness.json" -ForegroundColor Cyan
Write-Host "   Replace the empty appPassword field with your generated password" -ForegroundColor Cyan

Write-Host ""
Write-Host "7. Test the connection:" -ForegroundColor White
Write-Host "   node scripts/test-health-site.js" -ForegroundColor Cyan

Write-Host ""
Write-Host "Health Site Topics:" -ForegroundColor Green
Write-Host "- Nutrition and healthy eating" -ForegroundColor White
Write-Host "- Fitness and exercise routines" -ForegroundColor White
Write-Host "- Mental health and wellness" -ForegroundColor White
Write-Host "- Stress management techniques" -ForegroundColor White
Write-Host "- Sleep optimization" -ForegroundColor White
Write-Host "- Mindfulness and meditation" -ForegroundColor White

Write-Host ""
Write-Host "Once configured, you can generate health content using:" -ForegroundColor Yellow
Write-Host "- Multi-Site Dashboard: http://localhost:3000/multi-site" -ForegroundColor Cyan
Write-Host "- Command line: node scripts/multi-site-generator.js" -ForegroundColor Cyan

Write-Host ""
Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host
