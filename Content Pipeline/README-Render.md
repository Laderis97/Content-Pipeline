# Content Pipeline - Render Deployment

This repository contains the Content Pipeline system with ready-to-deploy dashboards for Render.

## 🚀 Quick Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### One-Click Deploy
1. Click the "Deploy to Render" button above
2. Connect your GitHub account
3. Configure environment variables
4. Deploy!

## 📊 What You Get

- **Dashboard Hub** - Main landing page with navigation
- **24/7 Monitoring** - Real-time system health dashboard  
- **System Status** - Overall system status and metrics
- **API Proxy** - Express server for Supabase integration

## 🛠️ Manual Deployment

### Prerequisites
- Render account (free)
- GitHub repository with this code

### Steps
1. **Fork this repository** to your GitHub account
2. **Create new Static Site** in Render dashboard
3. **Connect your repository**
4. **Configure deployment**:
   - Build Command: `npm run build` (or leave empty)
   - Publish Directory: `public`
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
├── server.js                  # Express server (optional)
├── package.json               # Dependencies
├── render.yaml               # Render configuration
└── docs/
    ├── render-deployment-guide.md
    └── render-deployment-checklist.md
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
- **Build Command**: `npm run build` (optional)
- **Publish Directory**: `public`
- **Node Version**: 18.x

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

## 🔄 Auto-Deployment

- **GitHub Integration** - Auto-deploy on push to main
- **Manual Deploy** - Deploy anytime from Render dashboard
- **Rollback** - Easy rollback to previous versions

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install

# Run build script
npm run build

# Test locally
cd public
python -m http.server 8000
```

### Customization
- Edit HTML files in `public/` directory
- Modify styling in the `<style>` sections
- Update API endpoints in JavaScript
- Add new dashboard pages

## 📞 Support

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Deployment Guide**: [docs/render-deployment-guide.md](docs/render-deployment-guide.md)
- **Checklist**: [docs/render-deployment-checklist.md](docs/render-deployment-checklist.md)

## 🎯 Next Steps

1. **Deploy to Render** using the steps above
2. **Test all dashboards** to ensure they work
3. **Customize branding** and content
4. **Set up custom domain** (optional)
5. **Share with your team**

---

**Ready to deploy!** 🚀

**Last Updated**: September 5, 2025
**Version**: 1.0
