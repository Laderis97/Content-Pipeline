const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Load from environment-configuration.md if .env doesn't exist
if (!process.env.OPENAI_API_KEY || !process.env.WORDPRESS_URL) {
  const configPath = path.join(__dirname, 'docs', 'environment-configuration.md');
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Load OpenAI API key
    const apiKeyMatch = configContent.match(/OPENAI_API_KEY=(.+)/);
    if (apiKeyMatch) {
      process.env.OPENAI_API_KEY = apiKeyMatch[1];
    }
    
    // Load WordPress credentials
    const wordpressUrlMatch = configContent.match(/WORDPRESS_URL=(.+)/);
    if (wordpressUrlMatch) {
      process.env.WORDPRESS_URL = wordpressUrlMatch[1];
    }
    
    const wordpressUsernameMatch = configContent.match(/WORDPRESS_USERNAME=(.+)/);
    if (wordpressUsernameMatch) {
      process.env.WORDPRESS_USERNAME = wordpressUsernameMatch[1];
    }
    
    const wordpressPasswordMatch = configContent.match(/WORDPRESS_PASSWORD=(.+)/);
    if (wordpressPasswordMatch) {
      process.env.WORDPRESS_PASSWORD = wordpressPasswordMatch[1];
    }
  }
}

// OpenAI content generation function
async function generateContentWithOpenAI(topic, contentType, targetAudience, tone, wordCount) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Create a ${contentType} about "${topic}" for ${targetAudience}. 
The tone should be ${tone}. 
Target word count: approximately ${wordCount} words.
Format the content as clean HTML with proper headings and structure.
Include an engaging title and make it informative and well-structured.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional content writer who creates engaging, well-structured blog posts and articles. Always format your content as clean HTML with proper headings and structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response from OpenAI API');
  }

  return data.choices[0].message.content;
}

// Content processing function
function processContentForWordPress(content, topic) {
  // Extract title from content (first H1 or create one)
  const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim() : topic;
  
  // Clean up the content for WordPress
  const processedContent = content
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '')
    .trim();
  
  // Extract text content for excerpt
  const textContent = processedContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const excerpt = textContent.substring(0, 150).trim() + (textContent.length > 150 ? '...' : '');
  
  return {
    title,
    content: processedContent,
    excerpt
  };
}

// Load site configurations
function loadSiteConfigs() {
  const sitesDir = path.join(__dirname, 'config', 'sites');
  const sites = [];
  
  if (fs.existsSync(sitesDir)) {
    const files = fs.readdirSync(sitesDir).filter(file => file.endsWith('.json'));
    
    files.forEach(file => {
      try {
        const filePath = path.join(sitesDir, file);
        const siteData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        sites.push(siteData);
      } catch (error) {
        console.error(`Error reading site file ${file}:`, error);
      }
    });
  }
  
  return sites;
}

// Find best matching site for topic
function findBestSiteForTopic(topic, sites) {
  const topicLower = topic.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
  
  sites.forEach(site => {
    if (site.status !== 'active') return;
    
    let score = 0;
    
    // Check topics
    site.topics.forEach(siteTopic => {
      if (topicLower.includes(siteTopic.toLowerCase())) {
        score += 3;
      }
    });
    
    // Check categories
    site.categories.forEach(category => {
      if (topicLower.includes(category.toLowerCase())) {
        score += 2;
      }
    });
    
    // Check tags
    site.tags.forEach(tag => {
      if (topicLower.includes(tag.toLowerCase())) {
        score += 1;
      }
    });
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = site;
    }
  });
  
  return bestMatch;
}

// WordPress publishing function with site routing
async function publishToWordPress(postData, topic) {
  const sites = loadSiteConfigs();
  const targetSite = findBestSiteForTopic(topic, sites);
  
  if (!targetSite) {
    throw new Error('No suitable site found for this topic');
  }
  
  const wordpressUrl = targetSite.url;
  const wordpressUsername = targetSite.username;
  const wordpressPassword = targetSite.appPassword;
  
  if (!wordpressPassword) {
    throw new Error(`Application password not configured for ${targetSite.name}`);
  }
  
  const apiUrl = `${wordpressUrl.replace(/\/$/, '')}/wp-json/wp/v2`;
  const auth = Buffer.from(`${wordpressUsername}:${wordpressPassword}`).toString('base64');
  
  const wordpressPost = {
    title: postData.title,
    content: postData.content,
    excerpt: postData.excerpt,
    status: 'publish',
    categories: [1] // Default category
  };
  
  const url = new URL(wordpressUrl);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: '/wp-json/wp/v2/posts',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(wordpressPost))
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode === 201) {
            resolve({
              ...jsonData,
              site: targetSite.name,
              siteUrl: targetSite.url
            });
          } else {
            reject(new Error(`WordPress API error: ${res.statusCode} - ${data}`));
          }
        } catch (error) {
          reject(new Error(`WordPress API response parsing error: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(JSON.stringify(wordpressPost));
    req.end();
  });
}

// API Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'content-generator.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard-hub.html'));
});

// Route for multi-site dashboard
app.get('/multi-site', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'multi-site-dashboard.html'));
});

app.post('/api/generate-content', async (req, res) => {
  try {
    const { topic, contentType, targetAudience, tone, wordCount, includeExamples } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    
    const timings = {
      generationTime: 0,
      processingTime: 0,
      wordpressTime: 0,
      totalTime: 0
    };
    
    const startTime = Date.now();
    
    // Step 1: Generate content with OpenAI
    const generationStart = Date.now();
    const generatedContent = await generateContentWithOpenAI(
      topic,
      contentType || 'blog post',
      targetAudience || 'general audience',
      tone || 'professional',
      parseInt(wordCount) || 500
    );
    timings.generationTime = Date.now() - generationStart;
    
    // Step 2: Process content for WordPress
    const processingStart = Date.now();
    const processedContent = processContentForWordPress(generatedContent, topic);
    timings.processingTime = Date.now() - processingStart;
    
    // Step 3: Publish to WordPress
    const wordpressStart = Date.now();
    let wordpressResult = null;
    
    try {
      wordpressResult = await publishToWordPress(processedContent, topic);
      timings.wordpressTime = Date.now() - wordpressStart;
    } catch (error) {
      console.error('WordPress publishing failed:', error);
      // Continue without WordPress publishing
    }
    
    timings.totalTime = Date.now() - startTime;
    
    const response = {
      success: true,
      content: processedContent,
      timings
    };
    
    if (wordpressResult) {
      response.wordpress = {
        published: true,
        postId: wordpressResult.id,
        postUrl: wordpressResult.link
      };
    } else {
      response.wordpress = {
        published: false,
        error: 'WordPress publishing failed'
      };
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Sites API endpoint
app.get('/api/sites', (req, res) => {
  try {
    const sitesDir = path.join(__dirname, 'config', 'sites');
    const sites = [];
    
    if (fs.existsSync(sitesDir)) {
      const files = fs.readdirSync(sitesDir).filter(file => file.endsWith('.json'));
      
      files.forEach(file => {
        try {
          const filePath = path.join(sitesDir, file);
          const siteData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          sites.push(siteData);
        } catch (error) {
          console.error(`Error reading site file ${file}:`, error);
        }
      });
    }
    
    res.json(sites);
  } catch (error) {
    console.error('Error loading sites:', error);
    res.status(500).json({ error: 'Failed to load sites' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    wordpressConfigured: !!(process.env.WORDPRESS_URL && process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_PASSWORD)
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Content Pipeline Web Interface running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to access the interface`);
  console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
});