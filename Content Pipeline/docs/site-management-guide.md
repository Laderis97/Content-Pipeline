
# Site Management Guide

## 🚀 How to Add Sites to the Content Pipeline Dashboard

There are several ways to add WordPress sites to your Content Pipeline dashboard:

### **Method 1: Command Line Interface (Recommended)**

#### **Quick Setup with Predefined Templates**
```bash
# Run the site configuration script
node scripts/configure-site.js

# Follow the interactive prompts to:
# 1. Select a predefined site type (tech-blog, health-wellness, etc.)
# 2. Enter your WordPress site details
# 3. Set up Application Password
# 4. Configure topics and categories
```

#### **Available Predefined Site Types:**
- **Technology Blog** - AI, programming, software development
- **Business News** - Strategy, finance, marketing, leadership
- **Health & Wellness** - Nutrition, fitness, mental health
- **Travel & Lifestyle** - Travel, food, culture, photography

### **Method 2: Manual Configuration**

#### **Step 1: Create Site Configuration File**
Create a new JSON file in `config/sites/` directory:

```bash
# Example: config/sites/my-custom-site.json
{
  "id": "my-custom-site",
  "name": "My Custom Blog",
  "url": "http://my-blog.local",
  "username": "admin",
  "appPassword": "your-application-password-here",
  "topics": [
    "your topic 1",
    "your topic 2",
    "your topic 3"
  ],
  "categories": [
    "Category 1",
    "Category 2",
    "Category 3"
  ],
  "tags": [
    "tag1",
    "tag2",
    "tag3"
  ],
  "status": "active",
  "description": "Description of your site",
  "lastUpdated": "2025-01-27T00:00:00Z"
}
```

#### **Step 2: Set Up WordPress Application Password**
1. Go to your WordPress admin panel: `http://your-site.local/wp-admin`
2. Navigate to **Users > Your Profile**
3. Scroll down to **Application Passwords** section
4. Create new password:
   - **Application Name**: Content Pipeline
   - Click **Add New Application Password**
5. Copy the generated password (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)
6. Add it to your site configuration file

#### **Step 3: Test the Connection**
```bash
# Test your new site
node scripts/test-wordpress-connection.js

# Or test specific site
node scripts/test-health-site.js
```

### **Method 3: Web Interface (Coming Soon)**

A web-based site management interface is being developed that will allow you to:
- Add new sites through a form
- Edit existing site configurations
- Test site connections
- Manage topics and categories
- View site status and metrics

### **Method 4: Bulk Import**

#### **Import Multiple Sites from CSV**
```bash
# Create a CSV file with site data
# sites.csv format:
# id,name,url,username,appPassword,topics,categories,tags,status
# tech-blog,Technology Blog,http://tech.local,admin,password123,"ai,programming,tech","AI,Programming,Tech","tech,ai,programming",active

# Import sites
node scripts/import-sites.js sites.csv
```

## 🔧 Site Configuration Options

### **Required Fields:**
- `id` - Unique identifier for the site
- `name` - Display name in dashboard
- `url` - WordPress site URL
- `username` - WordPress username
- `appPassword` - WordPress Application Password
- `status` - "active" or "inactive"

### **Content Routing Fields:**
- `topics` - Array of topics this site covers
- `categories` - WordPress categories to use
- `tags` - WordPress tags to use

### **Optional Fields:**
- `description` - Site description
- `lastUpdated` - Last configuration update timestamp
- `defaultSettings` - Default publishing settings

## 🎯 Content Routing Logic

The system automatically routes content to the best-matching site based on:

1. **Topic Matching** (3 points per match)
   - Checks if content topic matches site topics
   - Case-insensitive partial matching

2. **Category Matching** (2 points per match)
   - Checks if content topic matches site categories

3. **Tag Matching** (1 point per match)
   - Checks if content topic matches site tags

4. **Site Selection**
   - Site with highest score gets the content
   - If no site matches, content generation fails

## 🚨 Troubleshooting

### **Common Issues:**

#### **"No suitable site found for this topic"**
- Add more topics to your site configuration
- Create a new site for the specific topic
- Use broader topic keywords

#### **"Application password not configured"**
- Set up WordPress Application Password
- Update the `appPassword` field in site config
- Test connection with `node scripts/test-wordpress-connection.js`

#### **"WordPress connection failed"**
- Check if WordPress site is running
- Verify URL is correct
- Check username and password
- Ensure WordPress REST API is enabled

#### **Site not appearing in dashboard**
- Check if `status` is set to "active"
- Verify JSON file is valid
- Check browser console for errors
- Click "Refresh Sites" button

### **Testing Your Setup:**

```bash
# Test all sites
node scripts/test-wordpress-connection.js

# Test specific site
node scripts/test-health-site.js

# Test content generation
node scripts/multi-site-generator.js batch "your topic here"

# Check dashboard
# Visit: http://localhost:3000/multi-site
```

## 📈 Best Practices

### **Site Organization:**
- Use descriptive site IDs (e.g., `tech-blog`, `health-wellness`)
- Group related topics together
- Keep topics specific but not too narrow
- Use consistent naming conventions

### **Content Strategy:**
- Create sites for different content verticals
- Overlap topics slightly for flexibility
- Monitor which sites get the most content
- Adjust topics based on content performance

### **Maintenance:**
- Regularly test site connections
- Update topics based on content trends
- Monitor site performance and uptime
- Keep Application Passwords secure

## 🎉 Success!

Once configured, your sites will appear in the Multi-Site Dashboard at:
**http://localhost:3000/multi-site**

You can then:
- Generate content for specific sites
- Use automatic content routing
- Monitor site status and performance
- Scale to multiple content verticals
