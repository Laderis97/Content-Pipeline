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

