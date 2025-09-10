#!/usr/bin/env node

/**
 * Full Content Automation Test Script
 * Tests the complete workflow: OpenAI → Content Processing → WordPress Publishing
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const CONFIG = {
  // WordPress settings
  wordpress: {
    url: process.env.WORDPRESS_URL || 'http://automated-content-pipeline-local-test-site.local',
    username: process.env.WORDPRESS_USERNAME || 'content-bot',
    password: process.env.WORDPRESS_PASSWORD || 'inB4 Er6i Koi4 J7Ls JKkN n3Hu',
    apiPath: process.env.WORDPRESS_API_PATH || '/wp-json/wp/v2'
  },
  // OpenAI settings
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    maxTokens: 1000
  }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Content-Pipeline-Automation/1.0',
        ...options.headers
      },
      timeout: 30000
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function generateContentWithOpenAI(topic, contentType = 'blog post') {
  log(`\n🤖 Generating ${contentType} about: "${topic}"`, 'cyan');
  
  const prompt = `Create a professional ${contentType} about "${topic}". 

Requirements:
- Write in a clear, engaging style
- Include a compelling headline
- Structure with proper headings (H2, H3)
- Include practical insights or tips
- Keep it informative but accessible
- Length: 300-500 words
- Format as HTML with proper tags

Topic: ${topic}
Content Type: ${contentType}

Please provide the content formatted as HTML with:
- A main headline (H1)
- Subheadings (H2, H3)
- Paragraphs with good flow
- A brief conclusion

Make it engaging and valuable for readers.`;

  try {
    const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.openai.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        model: CONFIG.openai.model,
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
        max_tokens: CONFIG.openai.maxTokens,
        temperature: 0.7
      }
    });

    if (response.status === 200 && response.data.choices && response.data.choices[0]) {
      const content = response.data.choices[0].message.content;
      log('   ✅ Content generated successfully', 'green');
      log(`   📝 Content length: ${content.length} characters`, 'blue');
      return content;
    } else {
      log(`   ❌ OpenAI API error: ${response.status}`, 'red');
      log(`   📄 Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
      throw new Error(`OpenAI API error: ${response.status}`);
    }
  } catch (error) {
    log(`   ❌ Content generation failed: ${error.message}`, 'red');
    throw error;
  }
}

function processContentForWordPress(content, topic) {
  log('\n📝 Processing content for WordPress...', 'yellow');
  
  // Extract title from content (first H1 or create one)
  const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : `Complete Guide to ${topic}`;
  
  // Clean up content
  let processedContent = content
    .replace(/<h1[^>]*>/gi, '<h2>')  // Convert H1 to H2 for better WordPress structure
    .replace(/<\/h1>/gi, '</h2>')
    .trim();
  
  // Create excerpt (first 150 characters of text content)
  const textContent = processedContent.replace(/<[^>]*>/g, '');
  const excerpt = textContent.substring(0, 150).trim() + (textContent.length > 150 ? '...' : '');
  
  log('   ✅ Content processed successfully', 'green');
  log(`   📰 Title: ${title}`, 'blue');
  log(`   📄 Excerpt: ${excerpt}`, 'blue');
  
  return {
    title,
    content: processedContent,
    excerpt
  };
}

async function publishToWordPress(postData) {
  log('\n📤 Publishing to WordPress...', 'yellow');
  
  const baseUrl = CONFIG.wordpress.url.replace(/\/$/, '');
  const apiUrl = `${baseUrl}${CONFIG.wordpress.apiPath}`;
  const auth = Buffer.from(`${CONFIG.wordpress.username}:${CONFIG.wordpress.password}`).toString('base64');

  const wordpressPost = {
    title: postData.title,
    content: postData.content,
    excerpt: postData.excerpt,
    status: 'publish',
    categories: [1], // Default category
    meta: {
      'content_pipeline_generated': 'true',
      'generation_timestamp': new Date().toISOString(),
      'content_type': 'automated'
    }
  };

  try {
    const response = await makeRequest(`${apiUrl}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`
      },
      body: wordpressPost
    });
    
    if (response.status === 201) {
      log('   ✅ Post published successfully', 'green');
      log(`   📝 Post ID: ${response.data.id}`, 'blue');
      log(`   🔗 Post URL: ${response.data.link}`, 'blue');
      return response.data;
    } else {
      log(`   ❌ Publishing failed: ${response.status}`, 'red');
      log(`   📄 Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
      throw new Error(`Publishing failed: ${response.status}`);
    }
  } catch (error) {
    log(`   ❌ Publishing failed: ${error.message}`, 'red');
    throw error;
  }
}

async function testFullContentAutomation() {
  log('\n🚀 Full Content Automation Test', 'bold');
  log('=' .repeat(60), 'blue');
  
  const testTopic = 'The Future of Artificial Intelligence in Business';
  const results = {
    contentGenerated: false,
    contentProcessed: false,
    contentPublished: false,
    errors: []
  };

  try {
    // Step 1: Generate content with OpenAI
    log('\n📋 Step 1: Content Generation', 'bold');
    const generatedContent = await generateContentWithOpenAI(testTopic, 'blog post');
    results.contentGenerated = true;

    // Step 2: Process content for WordPress
    log('\n📋 Step 2: Content Processing', 'bold');
    const processedContent = processContentForWordPress(generatedContent, testTopic);
    results.contentProcessed = true;

    // Step 3: Publish to WordPress
    log('\n📋 Step 3: WordPress Publishing', 'bold');
    const publishedPost = await publishToWordPress(processedContent);
    results.contentPublished = true;
    results.postId = publishedPost.id;
    results.postUrl = publishedPost.link;

  } catch (error) {
    log(`\n❌ Automation failed: ${error.message}`, 'red');
    results.errors.push(error.message);
  }

  // Summary
  log('\n📊 Content Automation Test Summary', 'bold');
  log('=' .repeat(60), 'blue');
  
  const allStepsPassed = results.contentGenerated && results.contentProcessed && results.contentPublished;
  
  if (allStepsPassed) {
    log('🎉 Full content automation workflow is working perfectly!', 'green');
    log('✅ OpenAI → Content Processing → WordPress Publishing', 'green');
    log(`📝 Published Post ID: ${results.postId}`, 'blue');
    log(`🔗 Published Post URL: ${results.postUrl}`, 'blue');
  } else {
    log('⚠️  Some steps failed. Please check the errors below:', 'yellow');
    results.errors.forEach(error => {
      log(`   ❌ ${error}`, 'red');
    });
  }

  log('\n📋 Next Steps:', 'bold');
  if (allStepsPassed) {
    log('   1. Configure content scheduling and automation', 'green');
    log('   2. Set up content templates and variations', 'green');
    log('   3. Implement content quality checks', 'green');
    log('   4. Deploy to production environment', 'green');
  } else {
    log('   1. Fix the automation issues above', 'yellow');
    log('   2. Re-run this test script', 'yellow');
    log('   3. Once all steps pass, proceed with deployment', 'yellow');
  }

  return results;
}

// Run the test
if (require.main === module) {
  testFullContentAutomation()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      log(`\n💥 Content automation test failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testFullContentAutomation, CONFIG };
