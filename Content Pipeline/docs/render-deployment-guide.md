# Render Deployment Guide

This guide walks you through deploying the Content Pipeline dashboards to Render.

## 🚀 Quick Start

### 1. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up for a free account
3. Connect your GitHub account

### 2. Deploy Static Site

#### Option A: Deploy from GitHub (Recommended)
1. **Fork/Clone Repository**
   - Fork this repository to your GitHub account
   - Or push the code to your existing repository

2. **Create New Static Site**
   - In Render dashboard, click "New +"
   - Select "Static Site"
   - Connect your GitHub repository

3. **Configure Deployment**
   ```
   Name: content-pipeline-dashboards
   Branch: main
   Root Directory: (leave empty)
   Build Command: npm run build
   Publish Directory: public
   ```

4. **Environment Variables** (Optional)
   ```
   NODE_ENV=production
   SUPABASE_URL=https://zjqsfdqhhvhbwqmgdfzn.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

#### Option B: Deploy from Local Files
1. **Prepare Files**
   ```bash
   # Run the build script
   .\scripts\build-for-render.ps1
   
   # Or manually create public directory with files
   mkdir public
   copy docs\final-system-status-dashboard.html public\index.html
   copy docs\24-7-monitoring-dashboard.html public\monitoring.html
   ```

2. **Upload to Render**
   - Create new Static Site
   - Upload the `public` folder contents
   - Set Publish Directory to root

### 3. Deploy Web Service (Optional)

If you want the Express server for API proxying:

1. **Create New Web Service**
   - Select "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   ```
   Name: content-pipeline-api
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Starter (Free)
   ```

3. **Environment Variables**
   ```
   NODE_ENV=production
   PORT=10000
   SUPABASE_URL=https://zjqsfdqhhvhbwqmgdfzn.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 📁 Project Structure

```
Content Pipeline/
├── public/                     # Static files for Render
│   ├── index.html             # Dashboard hub
│   ├── monitoring.html        # 24/7 monitoring
│   ├── status.html           # System status
│   ├── robots.txt            # SEO
│   └── sitemap.xml           # SEO
├── server.js                  # Express server (optional)
├── package.json               # Dependencies
├── render.yaml               # Render configuration
└── scripts/
    ├── build-for-render.ps1  # Windows build script
    └── build-for-render.sh   # Linux/Mac build script
```

## 🔧 Configuration

### Static Site Settings
- **Build Command**: `npm run build` (or leave empty)
- **Publish Directory**: `public`
- **Node Version**: 18.x (if using build command)

### Environment Variables
```bash
# Required for API functionality
SUPABASE_URL=https://zjqsfdqhhvhbwqmgdfzn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional
NODE_ENV=production
```

### Custom Domain (Optional)
1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domains"
3. Add your domain
4. Update DNS records as instructed

## 🚀 Deployment Commands

### Build for Render
```powershell
# Windows
.\scripts\build-for-render.ps1

# Linux/Mac
chmod +x scripts/build-for-render.sh
./scripts/build-for-render.sh
```

### Manual Build
```bash
# Create public directory
mkdir public

# Copy dashboard files
copy docs\final-system-status-dashboard.html public\index.html
copy docs\24-7-monitoring-dashboard.html public\monitoring.html
copy docs\monitoring-dashboard.html public\monitoring-dashboard.html

# Create robots.txt and sitemap.xml
echo "User-agent: *" > public\robots.txt
echo "Allow: /" >> public\robots.txt
```

## 📊 Dashboard URLs

After deployment, your dashboards will be available at:

- **Main Hub**: `https://your-app-name.onrender.com/`
- **24/7 Monitoring**: `https://your-app-name.onrender.com/monitoring`
- **System Status**: `https://your-app-name.onrender.com/status`
- **Real-time Monitoring**: `https://your-app-name.onrender.com/monitoring-dashboard`

## 🔄 Auto-Deployment

### GitHub Integration
1. Connect your GitHub repository to Render
2. Enable auto-deploy on push to main branch
3. Render will automatically rebuild when you push changes

### Manual Deployment
1. Make changes to your code
2. Run build script locally
3. Push changes to GitHub
4. Render will automatically detect and deploy

## 🛠️ Troubleshooting

### Common Issues

**Build Fails**
- Check that `package.json` exists
- Verify build command is correct
- Check Node.js version compatibility

**Static Files Not Loading**
- Verify Publish Directory is set to `public`
- Check file paths in HTML files
- Ensure all assets are in the public folder

**API Calls Fail**
- Verify SUPABASE_URL and SUPABASE_ANON_KEY are set
- Check CORS settings in Supabase
- Test API endpoints directly

**Custom Domain Not Working**
- Verify DNS records are correct
- Wait for DNS propagation (up to 24 hours)
- Check SSL certificate status

### Debug Commands
```bash
# Check build locally
npm run build

# Test static files
cd public
python -m http.server 8000

# Test API endpoints
curl https://your-app-name.onrender.com/api/health
```

## 📈 Performance Optimization

### Static Site Optimization
- Enable gzip compression (automatic on Render)
- Optimize images and assets
- Use CDN for static assets
- Minimize CSS and JavaScript

### Caching
- Set appropriate cache headers
- Use browser caching for static assets
- Implement service worker for offline functionality

## 🔒 Security Considerations

### Environment Variables
- Never commit API keys to repository
- Use Render's environment variable system
- Rotate keys regularly

### CORS Configuration
- Configure Supabase CORS settings
- Limit allowed origins
- Use HTTPS in production

## 📞 Support

### Render Support
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Render Status](https://status.render.com)

### Content Pipeline Support
- Check system logs in Supabase dashboard
- Monitor Edge Function logs
- Review database performance metrics

## 🎯 Next Steps

After successful deployment:

1. **Test All Dashboards**
   - Verify all links work
   - Test API functionality
   - Check mobile responsiveness

2. **Set Up Monitoring**
   - Configure uptime monitoring
   - Set up error tracking
   - Monitor performance metrics

3. **Customize**
   - Update branding and colors
   - Add custom domain
   - Configure additional features

4. **Share Access**
   - Share dashboard URLs with team
   - Set up user access controls
   - Create documentation for users

---

**Deployment Status**: Ready for Render deployment ✅
**Last Updated**: September 5, 2025
**Version**: 1.0
