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

async function testContentVariety() {
  log('\n🧪 Content Variety Testing', 'bold');
  log('=' .repeat(60), 'blue');
  
  // Test cases with different topics, audiences, and tones
  const testCases = [
    {
      topic: 'Sustainable Energy Solutions for Small Businesses',
      contentType: 'blog post',
      targetAudience: 'small business owners',
      tone: 'practical and encouraging',
      wordCount: 400
    },
    {
      topic: 'The Psychology of Color in Web Design',
      contentType: 'article',
      targetAudience: 'web designers and developers',
      tone: 'technical and informative',
      wordCount: 600
    },
    {
      topic: 'Quick and Healthy Meal Prep Ideas',
      contentType: 'guide',
      targetAudience: 'busy professionals',
      tone: 'friendly and helpful',
      wordCount: 500
    },
    {
      topic: 'Cryptocurrency Trends in 2024',
      contentType: 'analysis',
      targetAudience: 'tech-savvy investors',
      tone: 'analytical and forward-looking',
      wordCount: 700
    },
    {
      topic: 'Mindfulness Techniques for Remote Workers',
      contentType: 'wellness article',
      targetAudience: 'remote workers',
      tone: 'calm and supportive',
      wordCount: 450
    }
  ];
  
  const results = [];
  let successCount = 0;
  let totalTime = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const testNumber = i + 1;
    
    log(`\n📝 Test ${testNumber}/${testCases.length}: ${testCase.topic}`, 'bold');
    log('-' .repeat(50), 'blue');
    
    log(`   Content Type: ${testCase.contentType}`, 'cyan');
    log(`   Target Audience: ${testCase.targetAudience}`, 'cyan');
    log(`   Tone: ${testCase.tone}`, 'cyan');
    log(`   Word Count: ${testCase.wordCount}`, 'cyan');
    
    const timings = {
      generationTime: 0,
      processingTime: 0,
      wordpressTime: 0,
      totalTime: 0
    };
    
    const startTime = Date.now();
    
    try {
      // Step 1: Generate content
      log(`\n🤖 Generating content...`, 'yellow');
      const generationStart = Date.now();
      
      const generatedContent = await generateContentWithOpenAI(
        testCase.topic,
        testCase.contentType,
        testCase.targetAudience,
        testCase.tone,
        testCase.wordCount
      );
      
      timings.generationTime = Date.now() - generationStart;
      log(`   ✅ Generated in ${timings.generationTime}ms`, 'green');
      
      // Step 2: Process content
      log(`⚙️  Processing for WordPress...`, 'yellow');
      const processingStart = Date.now();
      
      const processedContent = processContentForWordPress(generatedContent, testCase.topic);
      
      timings.processingTime = Date.now() - processingStart;
      log(`   ✅ Processed in ${timings.processingTime}ms`, 'green');
      
      // Step 3: Publish to WordPress
      log(`🌐 Publishing to WordPress...`, 'yellow');
      const wordpressStart = Date.now();
      
      const wordpressResult = await publishToWordPress(processedContent);
      
      timings.wordpressTime = Date.now() - wordpressStart;
      log(`   ✅ Published in ${timings.wordpressTime}ms`, 'green');
      
      timings.totalTime = Date.now() - startTime;
      totalTime += timings.totalTime;
      
      // Store results
      const result = {
        testNumber,
        topic: testCase.topic,
        contentType: testCase.contentType,
        targetAudience: testCase.targetAudience,
        tone: testCase.tone,
        wordCount: testCase.wordCount,
        success: true,
        postId: wordpressResult.id,
        postUrl: wordpressResult.link,
        contentLength: processedContent.content.length,
        timings
      };
      
      results.push(result);
      successCount++;
      
      log(`\n📊 Test ${testNumber} Results:`, 'bold');
      log(`   ✅ Success: Yes`, 'green');
      log(`   📝 Post ID: ${wordpressResult.id}`, 'blue');
      log(`   🔗 Post URL: ${wordpressResult.link}`, 'blue');
      log(`   📏 Content Length: ${processedContent.content.length} characters`, 'blue');
      log(`   ⏱️  Total Time: ${timings.totalTime}ms`, 'blue');
      
      // Show content preview
      const preview = processedContent.content.substring(0, 200);
      log(`\n📄 Content Preview:`, 'bold');
      log(`   ${preview}${processedContent.content.length > 200 ? '...' : ''}`, 'blue');
      
    } catch (error) {
      log(`\n❌ Test ${testNumber} Failed`, 'red');
      log(`   Error: ${error.message}`, 'red');
      
      const result = {
        testNumber,
        topic: testCase.topic,
        contentType: testCase.contentType,
        targetAudience: testCase.targetAudience,
        tone: testCase.tone,
        wordCount: testCase.wordCount,
        success: false,
        error: error.message,
        timings: { totalTime: Date.now() - startTime }
      };
      
      results.push(result);
    }
    
    // Add delay between tests to avoid rate limiting
    if (i < testCases.length - 1) {
      log(`\n⏳ Waiting 2 seconds before next test...`, 'yellow');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  log('\n📊 Content Variety Testing Summary', 'bold');
  log('=' .repeat(60), 'blue');
  log(`   Total Tests: ${testCases.length}`, 'blue');
  log(`   Successful: ${successCount}`, 'green');
  log(`   Failed: ${testCases.length - successCount}`, 'red');
  log(`   Success Rate: ${((successCount / testCases.length) * 100).toFixed(1)}%`, 'blue');
  log(`   Total Time: ${(totalTime / 1000).toFixed(1)}s`, 'blue');
  log(`   Average Time per Test: ${(totalTime / testCases.length / 1000).toFixed(1)}s`, 'blue');
  
  log('\n📝 Published Posts:', 'bold');
  results.forEach(result => {
    if (result.success) {
      log(`   ${result.testNumber}. ${result.topic}`, 'green');
      log(`      Post ID: ${result.postId} | Length: ${result.contentLength} chars | Time: ${result.timings.totalTime}ms`, 'blue');
    } else {
      log(`   ${result.testNumber}. ${result.topic} - FAILED`, 'red');
    }
  });
  
  if (successCount === testCases.length) {
    log('\n🎉 All content variety tests passed!', 'green');
    log('✅ The content pipeline can handle diverse topics and styles!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the errors above.', 'yellow');
  }
}

// Run the test
testContentVariety().catch(console.error);

