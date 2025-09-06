#!/bin/bash

# Simple build script for Render static site deployment
echo "🚀 Building Content Pipeline Dashboards for Render..."

# Create public directory
mkdir -p public

# Copy HTML dashboards
echo "📄 Copying dashboard HTML files..."
cp docs/final-system-status-dashboard.html public/index.html 2>/dev/null || echo "Warning: final-system-status-dashboard.html not found"
cp docs/24-7-monitoring-dashboard.html public/monitoring.html 2>/dev/null || echo "Warning: 24-7-monitoring-dashboard.html not found"
cp docs/monitoring-dashboard.html public/monitoring-dashboard.html 2>/dev/null || echo "Warning: monitoring-dashboard.html not found"

# Create a simple index page if the main one doesn't exist
if [ ! -f "public/index.html" ]; then
    echo "📝 Creating default index page..."
    cat > public/index.html << 'EOF'
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
EOF
fi

# Create robots.txt
echo "🤖 Creating robots.txt..."
cat > public/robots.txt << 'EOF'
User-agent: *
Allow: /

Sitemap: https://content-pipeline-dashboards.onrender.com/sitemap.xml
EOF

# Create sitemap.xml
echo "🗺️ Creating sitemap.xml..."
cat > public/sitemap.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://content-pipeline-dashboards.onrender.com/</loc>
        <lastmod>2025-09-06</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://content-pipeline-dashboards.onrender.com/monitoring</loc>
        <lastmod>2025-09-06</lastmod>
        <changefreq>hourly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>https://content-pipeline-dashboards.onrender.com/status</loc>
        <lastmod>2025-09-06</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>
EOF

echo "✅ Build complete! Static assets ready for Render deployment."
echo "📁 Public directory contents:"
ls -la public/

echo ""
echo "🚀 Ready for deployment to Render!"
