# Multi-Site Content Pipeline Setup Guide

## 🚀 Quick Start

### 1. Access the Multi-Site Dashboard
Visit: `http://localhost:3000/multi-site`

### 2. Set Up Your First Site
Run the configuration script:
```bash
node scripts/configure-site.js
```

## 📋 Available Site Types

### Technology Blog (`tech-blog`)
- **Topics**: AI, programming, software development, cybersecurity
- **Categories**: AI & Machine Learning, Programming, Cybersecurity
- **Tags**: tech, programming, AI, development

### Business News (`business-news`)
- **Topics**: business strategy, entrepreneurship, finance, marketing
- **Categories**: Business Strategy, Finance, Marketing, Leadership
- **Tags**: business, finance, marketing, leadership

### Health & Wellness (`health-wellness`)
- **Topics**: nutrition, fitness, mental health, wellness
- **Categories**: Nutrition, Fitness, Mental Health, Wellness
- **Tags**: health, wellness, fitness, nutrition

### Travel & Lifestyle (`travel-lifestyle`)
- **Topics**: travel destinations, lifestyle tips, food, culture
- **Categories**: Travel Destinations, Lifestyle Tips, Food & Culture
- **Tags**: travel, lifestyle, food, culture

## 🔧 Setup Options

### Option A: Local WordPress Sites (Recommended)
1. **Create sites in Local by Flywheel:**
   - `tech-blog.local`
   - `business-news.local`
   - `health-wellness.local`
   - `travel-lifestyle.local`

2. **Set up Application Passwords:**
   - Go to each site's admin panel
   - Users > Your Profile > Application Passwords
   - Create password named "Content Pipeline"

3. **Configure each site:**
   ```bash
   node scripts/configure-site.js
   ```

### Option B: WordPress.com Sites
1. **Create WordPress.com sites:**
   - `yourname-tech.wordpress.com`
   - `yourname-business.wordpress.com`
   - `yourname-health.wordpress.com`
   - `yourname-travel.wordpress.com`

2. **Requirements:**
   - WordPress.com Business plan or higher
   - REST API access enabled
   - Application Passwords configured

### Option C: Self-Hosted WordPress Sites
1. **Create subdomains:**
   - `tech-blog.yourdomain.com`
   - `business.yourdomain.com`
   - `health.yourdomain.com`
   - `travel.yourdomain.com`

2. **Requirements:**
   - Domain with subdomain support
   - WordPress installation on each subdomain
   - REST API enabled
   - Application Passwords configured

## 🎯 How Topic Routing Works

The system automatically routes content to the best-matching site:

1. **Analyzes your content topic**
2. **Matches against site topics, categories, and tags**
3. **Routes to the highest-scoring site**
4. **Generates content with site-specific formatting**

## 🚀 Content Generation

### Using the Dashboard
1. Go to `http://localhost:3000/multi-site`
2. Fill out the content generation form
3. Click "Generate Content"
4. Content is automatically routed to the right site

### Using Command Line
```bash
# Generate content for multiple topics
node scripts/multi-site-generator.js batch "artificial intelligence" "business strategy"

# Generate content for a specific site
node scripts/multi-site-generator.js site tech-blog "machine learning"

# Generate content for predefined topics
node scripts/multi-site-generator.js topics
```

## 📊 Monitoring

### Dashboard Features
- **Site Status**: View all configured sites
- **Content Generation**: Real-time content creation
- **Topic Routing**: See which site content goes to
- **Performance Metrics**: Track generation times

### Health Check
Visit: `http://localhost:3000/api/health`

## 🔧 Troubleshooting

### Common Issues
1. **"Cannot GET /multi-site"**: Server needs restart
2. **"Site can't be reached"**: Site not created yet
3. **"WordPress connection failed"**: Check Application Password
4. **"No suitable site found"**: Add topic to existing site or create new site

### Solutions
1. **Restart server**: `node server.js`
2. **Create sites first**: Use Local by Flywheel
3. **Check credentials**: Verify Application Password
4. **Configure sites**: Run `node scripts/configure-site.js`

## 📈 Scaling Up

### Adding More Sites
1. Create new WordPress site
2. Run `node scripts/configure-site.js`
3. Add topics and categories
4. Test content generation

### Custom Site Types
1. Create custom site configuration
2. Add to `predefinedSites` in `scripts/configure-site.js`
3. Update topic routing logic
4. Test with sample content

## 🎉 Success!

Once configured, your multi-site Content Pipeline will:
- ✅ Automatically route content to the right site
- ✅ Generate topic-specific content
- ✅ Publish to WordPress sites
- ✅ Track performance and status
- ✅ Scale to multiple sites and topics
