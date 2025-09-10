# Deploy to Render - Content Pipeline Dashboards
# This script prepares and guides you through Render deployment

Write-Host "🚀 Content Pipeline - Render Deployment Setup" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Check if public directory exists
if (!(Test-Path "public")) {
    Write-Host "📁 Creating public directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "public" | Out-Null
}

# Copy dashboard files
Write-Host "📄 Copying dashboard files..." -ForegroundColor Yellow
Copy-Item "docs/final-system-status-dashboard.html" "public/index.html" -Force
Copy-Item "docs/24-7-monitoring-dashboard.html" "public/monitoring.html" -Force
Copy-Item "docs/monitoring-dashboard.html" "public/monitoring-dashboard.html" -Force
Copy-Item "docs/final-system-status-dashboard.html" "public/status.html" -Force

# Create robots.txt
Write-Host "🤖 Creating robots.txt..." -ForegroundColor Yellow
$robotsContent = @'
User-agent: *
Allow: /

Sitemap: https://content-pipeline-dashboards.onrender.com/sitemap.xml
'@
Set-Content -Path "public/robots.txt" -Value $robotsContent -Encoding UTF8

# Create sitemap.xml
Write-Host "🗺️ Creating sitemap.xml..." -ForegroundColor Yellow
$sitemapContent = @'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://content-pipeline-dashboards.onrender.com/</loc>
        <lastmod>2025-09-05</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://content-pipeline-dashboards.onrender.com/monitoring</loc>
        <lastmod>2025-09-05</lastmod>
        <changefreq>hourly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>https://content-pipeline-dashboards.onrender.com/status</loc>
        <lastmod>2025-09-05</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>
'@
Set-Content -Path "public/sitemap.xml" -Value $sitemapContent -Encoding UTF8

Write-Host ""
Write-Host "✅ Files prepared for Render deployment!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Public directory contents:" -ForegroundColor Cyan
Get-ChildItem "public" | Format-Table Name, Length, LastWriteTime

Write-Host ""
Write-Host "🚀 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "==============" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 🌐 Go to https://render.com" -ForegroundColor White
Write-Host "2. 📝 Sign up for a free account" -ForegroundColor White
Write-Host "3. 🔗 Connect your GitHub account" -ForegroundColor White
Write-Host "4. ➕ Click 'New +' → 'Static Site'" -ForegroundColor White
Write-Host "5. 🔧 Configure deployment:" -ForegroundColor White
Write-Host "   - Name: content-pipeline-dashboards" -ForegroundColor Gray
Write-Host "   - Build Command: npm run build (or leave empty)" -ForegroundColor Gray
Write-Host "   - Publish Directory: public" -ForegroundColor Gray
Write-Host "6. 🔑 Add environment variables:" -ForegroundColor White
Write-Host "   - SUPABASE_URL=https://zjqsfdqhhvhbwqmgdfzn.supabase.co" -ForegroundColor Gray
Write-Host "   - SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." -ForegroundColor Gray
Write-Host "7. 🚀 Click 'Create Static Site'" -ForegroundColor White
Write-Host ""
Write-Host "📊 After deployment, your dashboards will be available at:" -ForegroundColor Cyan
Write-Host "   - Main Hub: https://your-app-name.onrender.com/" -ForegroundColor White
Write-Host "   - Monitoring: https://your-app-name.onrender.com/monitoring" -ForegroundColor White
Write-Host "   - Status: https://your-app-name.onrender.com/status" -ForegroundColor White
Write-Host ""
Write-Host "📚 For detailed instructions, see:" -ForegroundColor Yellow
Write-Host "   - docs/render-deployment-guide.md" -ForegroundColor White
Write-Host "   - docs/render-deployment-checklist.md" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Ready to deploy! Good luck! 🚀" -ForegroundColor Green
