# Setup script for new repository
Write-Host "🚀 Setting up Content Pipeline Dashboard Repository" -ForegroundColor Green

# Create essential files
Write-Host "📄 Creating package.json..." -ForegroundColor Yellow
$packageJson = @'
{
  "name": "content-pipeline-dashboards",
  "version": "1.0.0",
  "description": "Content Pipeline System - Monitoring Dashboards",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "build": "node build-simple.js",
    "dev": "node server.js"
  },
  "keywords": [
    "content-pipeline",
    "monitoring",
    "dashboards"
  ],
  "author": "Content Pipeline Team",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  }
}
'@

Set-Content -Path "package.json" -Value $packageJson

Write-Host "📄 Creating render.yaml..." -ForegroundColor Yellow
$renderYaml = @'
# Render Configuration for Content Pipeline Dashboards
services:
  - type: web
    name: content-pipeline-dashboards
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    plan: starter
    staticPublishPath: ./public
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        value: https://zjqsfdqhhvhbwqmgdfzn.supabase.co
      - key: SUPABASE_ANON_KEY
        value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo
'@

Set-Content -Path "render.yaml" -Value $renderYaml

Write-Host "📄 Creating README.md..." -ForegroundColor Yellow
$readme = @'
# Content Pipeline - Dashboard Repository

This repository contains the essential files for deploying the Content Pipeline monitoring dashboards to Render.

## 🚀 Quick Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 📊 What You Get

- **Dashboard Hub** - Main landing page with navigation
- **24/7 Monitoring** - Real-time system health dashboard  
- **System Status** - Overall system status and metrics

## 🛠️ Manual Deployment

### Prerequisites
- Render account (free)
- GitHub repository with this code

### Steps
1. **Fork this repository** to your GitHub account
2. **Create new Static Site** in Render dashboard
3. **Connect your repository**
4. **Configure deployment**:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `public`
   - Root Directory: (leave empty)
5. **Add environment variables**:
   - `SUPABASE_URL=https://zjqsfdqhhvhbwqmgdfzn.supabase.co`
   - `SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
6. **Deploy!**

## 📁 Project Structure

```
├── public/                     # Static files for Render
│   ├── index.html             # Dashboard hub
│   ├── monitoring.html        # 24/7 monitoring
│   └── status.html           # System status
├── build-simple.js            # Build script
├── package.json               # Dependencies
├── render.yaml               # Render configuration
└── README.md                 # This file
```

## 🔧 Configuration

### Environment Variables
```bash
SUPABASE_URL=https://zjqsfdqhhvhbwqmgdfzn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

### Render Settings
- **Type**: Static Site
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `public`
- **Root Directory**: (empty)

## 📊 Dashboard URLs

After deployment:
- **Main Hub**: `https://your-app.onrender.com/`
- **Monitoring**: `https://your-app.onrender.com/monitoring`
- **Status**: `https://your-app.onrender.com/status`

## 🚀 Features

- ✅ **Responsive Design** - Works on all devices
- ✅ **Real-time Updates** - Live data from Supabase
- ✅ **Modern UI** - Beautiful, professional interface
- ✅ **Fast Loading** - Optimized for performance
- ✅ **SEO Ready** - Includes sitemap and robots.txt
- ✅ **Error Handling** - Graceful error management

---

**Ready to deploy!** 🚀

**Last Updated**: September 8, 2025
**Version**: 1.0
'@

Set-Content -Path "README.md" -Value $readme

Write-Host "✅ Essential files created!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy the 'public' folder from your current directory" -ForegroundColor White
Write-Host "2. Copy 'build-simple.js' from your current directory" -ForegroundColor White
Write-Host "3. Run: git init" -ForegroundColor White
Write-Host "4. Run: git add ." -ForegroundColor White
Write-Host "5. Run: git commit -m 'Initial commit: Content Pipeline dashboards'" -ForegroundColor White
Write-Host "6. Run: git remote add origin https://github.com/Laderis97/[YOUR-REPO-NAME].git" -ForegroundColor White
Write-Host "7. Run: git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Ready for Render deployment!" -ForegroundColor Green
