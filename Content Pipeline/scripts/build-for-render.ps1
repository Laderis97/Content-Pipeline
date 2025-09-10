# Build script for Render deployment (Windows PowerShell)
# This script prepares the static assets for deployment

Write-Host "🚀 Building Content Pipeline Dashboards for Render..." -ForegroundColor Green

# Create public directory
if (!(Test-Path "public")) {
    New-Item -ItemType Directory -Path "public" | Out-Null
    Write-Host "📁 Created public directory" -ForegroundColor Yellow
}

# Copy HTML dashboards
Write-Host "📄 Copying dashboard HTML files..." -ForegroundColor Yellow
Copy-Item "docs/final-system-status-dashboard.html" "public/index.html" -Force
Copy-Item "docs/24-7-monitoring-dashboard.html" "public/monitoring.html" -Force
Copy-Item "docs/monitoring-dashboard.html" "public/monitoring-dashboard.html" -Force
Copy-Item "docs/final-system-status-dashboard.html" "public/status.html" -Force

# Copy any CSS files
Write-Host "🎨 Copying CSS files..." -ForegroundColor Yellow
Get-ChildItem "docs" -Filter "*.css" | ForEach-Object {
    Copy-Item $_.FullName "public/" -Force
}

# Copy any JS files
Write-Host "⚡ Copying JavaScript files..." -ForegroundColor Yellow
Get-ChildItem "docs" -Filter "*.js" | ForEach-Object {
    Copy-Item $_.FullName "public/" -Force
}

# Create a simple index page
Write-Host "🏠 Creating dashboard hub..." -ForegroundColor Yellow
$indexContent = @'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Pipeline - Dashboard Hub</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }
        h1 {
            color: #2c3e50;
            font-size: 3em;
            margin-bottom: 20px;
        }
        .subtitle {
            color: #7f8c8d;
            font-size: 1.2em;
            margin-bottom: 40px;
        }
        .dashboard-links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .dashboard-link {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            text-decoration: none;
            padding: 20px;
            border-radius: 15px;
            transition: transform 0.3s, box-shadow 0.3s;
            font-weight: bold;
            font-size: 1.1em;
        }
        .dashboard-link:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(52, 152, 219, 0.3);
        }
        .status {
            background: #27ae60;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            margin-bottom: 20px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Content Pipeline</h1>
        <div class="subtitle">Dashboard Hub</div>
        <div class="status">✅ SYSTEM OPERATIONAL</div>
        
        <div class="dashboard-links">
            <a href="/monitoring" class="dashboard-link">
                📊 24/7 Monitoring Dashboard
            </a>
            <a href="/status" class="dashboard-link">
                📈 System Status Dashboard
            </a>
            <a href="/monitoring-dashboard" class="dashboard-link">
                🔍 Real-time Monitoring
            </a>
        </div>
        
        <p style="margin-top: 30px; color: #7f8c8d;">
            Content Pipeline System - Fully Operational<br>
            Go-Live: September 19, 2025
        </p>
    </div>
</body>
</html>
'@

Set-Content -Path "public/index.html" -Value $indexContent -Encoding UTF8

# Create a robots.txt file
Write-Host "🤖 Creating robots.txt..." -ForegroundColor Yellow
$robotsContent = @'
User-agent: *
Allow: /

Sitemap: https://content-pipeline-dashboards.onrender.com/sitemap.xml
'@
Set-Content -Path "public/robots.txt" -Value $robotsContent -Encoding UTF8

# Create a sitemap.xml
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

Write-Host "✅ Build complete! Static assets ready for Render deployment." -ForegroundColor Green
Write-Host "📁 Public directory contents:" -ForegroundColor Yellow
Get-ChildItem "public" | Format-Table Name, Length, LastWriteTime

Write-Host ""
Write-Host "🚀 Ready for deployment to Render!" -ForegroundColor Green
Write-Host "📊 Dashboard Hub: /index.html" -ForegroundColor Cyan
Write-Host "📈 Monitoring: /monitoring.html" -ForegroundColor Cyan
Write-Host "🔍 Status: /status.html" -ForegroundColor Cyan
