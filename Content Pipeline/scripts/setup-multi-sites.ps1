Write-Host "Multi-Site WordPress Setup for Content Pipeline" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

Write-Host "`nAvailable Site Types:" -ForegroundColor Yellow
Write-Host "1. Technology Blog" -ForegroundColor White
Write-Host "2. Business News" -ForegroundColor White
Write-Host "3. Health and Wellness" -ForegroundColor White
Write-Host "4. Travel and Lifestyle" -ForegroundColor White
Write-Host "5. Custom Site" -ForegroundColor White

Write-Host "`nSetup Options:" -ForegroundColor Green
Write-Host "A. Local WordPress sites (recommended)" -ForegroundColor White
Write-Host "B. WordPress.com sites (requires Business plan)" -ForegroundColor White
Write-Host "C. Self-hosted WordPress sites" -ForegroundColor White

$setupChoice = Read-Host "`nChoose option (A/B/C)"

if ($setupChoice -eq "A") {
    Write-Host "`nLocal WordPress Multi-Site Setup" -ForegroundColor Yellow
    Write-Host "Sites to create:" -ForegroundColor White
    Write-Host "- tech-blog.local" -ForegroundColor White
    Write-Host "- business-news.local" -ForegroundColor White
    Write-Host "- health-wellness.local" -ForegroundColor White
    Write-Host "- travel-lifestyle.local" -ForegroundColor White
}

if ($setupChoice -eq "B") {
    Write-Host "`nWordPress.com Multi-Site Setup" -ForegroundColor Yellow
    Write-Host "Sites to create:" -ForegroundColor White
    Write-Host "- yourname-tech.wordpress.com" -ForegroundColor White
    Write-Host "- yourname-business.wordpress.com" -ForegroundColor White
    Write-Host "- yourname-health.wordpress.com" -ForegroundColor White
    Write-Host "- yourname-travel.wordpress.com" -ForegroundColor White
}

if ($setupChoice -eq "C") {
    Write-Host "`nSelf-Hosted WordPress Multi-Site Setup" -ForegroundColor Yellow
    Write-Host "Sites to create:" -ForegroundColor White
    Write-Host "- tech-blog.yourdomain.com" -ForegroundColor White
    Write-Host "- business.yourdomain.com" -ForegroundColor White
    Write-Host "- health.yourdomain.com" -ForegroundColor White
    Write-Host "- travel.yourdomain.com" -ForegroundColor White
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Create WordPress sites" -ForegroundColor White
Write-Host "2. Set up Application Passwords" -ForegroundColor White
Write-Host "3. Run configure-site.js script" -ForegroundColor White