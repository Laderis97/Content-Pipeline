// Simple build script for Render
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Content Pipeline Dashboards...');

// Ensure public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('📁 Created public directory');
}

// Copy HTML files from docs to public
const docsDir = path.join(__dirname, 'docs');
const filesToCopy = [
    { src: 'final-system-status-dashboard.html', dest: 'index.html' },
    { src: '24-7-monitoring-dashboard.html', dest: 'monitoring.html' },
    { src: 'monitoring-dashboard.html', dest: 'monitoring-dashboard.html' }
];

filesToCopy.forEach(file => {
    const srcPath = path.join(docsDir, file.src);
    const destPath = path.join(publicDir, file.dest);
    
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied ${file.src} → ${file.dest}`);
    } else {
        console.log(`⚠️  Warning: ${file.src} not found`);
    }
});

// Create robots.txt
const robotsContent = `User-agent: *
Allow: /

Sitemap: https://content-pipeline-dashboards.onrender.com/sitemap.xml`;

fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsContent);
console.log('✅ Created robots.txt');

// Create sitemap.xml
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
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
</urlset>`;

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapContent);
console.log('✅ Created sitemap.xml');

console.log('🎉 Build complete! Ready for deployment.');
