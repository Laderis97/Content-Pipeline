const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
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
  const configPath = path.join(__dirname, '..', 'docs', 'environment-configuration.md');
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

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

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

async function publishToWordPress(postData) {
  const wordpressUrl = process.env.WORDPRESS_URL || 'http://automated-content-pipeline-local-test-site.local';
  const wordpressUsername = process.env.WORDPRESS_USERNAME || 'content-bot';
  const wordpressPassword = process.env.WORDPRESS_PASSWORD || 'inB4 Er6i Koi4 J7Ls JKkN n3Hu';
  
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
            resolve(jsonData);
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

async function testCompletePipeline() {
  log('\n🚀 Complete Content Pipeline Test', 'bold');
  log('=' .repeat(60), 'blue');
  
  const testRequest = {
    topic: 'The Future of Artificial Intelligence in Business',
    contentType: 'blog post',
    targetAudience: 'business professionals',
    tone: 'professional and informative',
    wordCount: 500
  };
  
  log('\n📋 Test Request:', 'bold');
  log(`   Topic: ${testRequest.topic}`, 'blue');
  log(`   Content Type: ${testRequest.contentType}`, 'blue');
  log(`   Target Audience: ${testRequest.targetAudience}`, 'blue');
  log(`   Tone: ${testRequest.tone}`, 'blue');
  log(`   Word Count: ${testRequest.wordCount}`, 'blue');
  
  const timings = {
    generationTime: 0,
    processingTime: 0,
    wordpressTime: 0,
    totalTime: 0
  };
  
  const startTime = Date.now();
  
  try {
    // Step 1: Generate content with OpenAI
    log('\n🤖 Step 1: Generating content with OpenAI...', 'bold');
    const generationStart = Date.now();
    
    const generatedContent = await generateContentWithOpenAI(
      testRequest.topic,
      testRequest.contentType,
      testRequest.targetAudience,
      testRequest.tone,
      testRequest.wordCount
    );
    
    timings.generationTime = Date.now() - generationStart;
    log(`   ✅ Content generated in ${timings.generationTime}ms`, 'green');
    
    // Step 2: Process content for WordPress
    log('\n⚙️  Step 2: Processing content for WordPress...', 'bold');
    const processingStart = Date.now();
    
    const processedContent = processContentForWordPress(generatedContent, testRequest.topic);
    
    timings.processingTime = Date.now() - processingStart;
    log(`   ✅ Content processed in ${timings.processingTime}ms`, 'green');
    
    log('\n📝 Generated Content:', 'bold');
    log(`   Title: ${processedContent.title}`, 'blue');
    log(`   Content Length: ${processedContent.content.length} characters`, 'blue');
    log(`   Excerpt: ${processedContent.excerpt}`, 'blue');
    
    // Step 3: Publish to WordPress
    log('\n🌐 Step 3: Publishing to WordPress...', 'bold');
    const wordpressStart = Date.now();
    
    const wordpressResult = await publishToWordPress(processedContent);
    
    timings.wordpressTime = Date.now() - wordpressStart;
    log(`   ✅ Published to WordPress in ${timings.wordpressTime}ms`, 'green');
    
    timings.totalTime = Date.now() - startTime;
    
    // Show results
    log('\n📊 Performance Metrics:', 'bold');
    log(`   Generation Time: ${timings.generationTime}ms`, 'blue');
    log(`   Processing Time: ${timings.processingTime}ms`, 'blue');
    log(`   WordPress Time: ${timings.wordpressTime}ms`, 'blue');
    log(`   Total Time: ${timings.totalTime}ms`, 'blue');
    
    log('\n🌐 WordPress Publishing Results:', 'bold');
    log(`   ✅ Published: Yes`, 'green');
    log(`   📝 Post ID: ${wordpressResult.id}`, 'blue');
    log(`   🔗 Post URL: ${wordpressResult.link}`, 'blue');
    log(`   📅 Published: ${wordpressResult.date}`, 'blue');
    
    log('\n🎉 Complete Content Pipeline is working!', 'green');
    log('✅ OpenAI API → Content Processing → WordPress Publishing', 'green');
    
    // Show a preview of the generated content
    if (processedContent.content) {
      log('\n📄 Content Preview:', 'bold');
      const preview = processedContent.content.substring(0, 300);
      log(`   ${preview}${processedContent.content.length > 300 ? '...' : ''}`, 'blue');
    }
    
  } catch (error) {
    log('\n❌ Content Pipeline Test Failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    
    if (error.message.includes('OpenAI API')) {
      log('\n💡 Troubleshooting Tips:', 'yellow');
      log('   1. Check if OPENAI_API_KEY is set correctly', 'yellow');
      log('   2. Verify OpenAI API key has sufficient credits', 'yellow');
      log('   3. Check OpenAI API status', 'yellow');
    } else if (error.message.includes('WordPress')) {
      log('\n💡 Troubleshooting Tips:', 'yellow');
      log('   1. Check if WordPress site is running', 'yellow');
      log('   2. Verify WordPress credentials', 'yellow');
      log('   3. Check WordPress REST API is enabled', 'yellow');
    }
  }
}

// Run the test
testCompletePipeline().catch(console.error);
