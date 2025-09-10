#!/usr/bin/env node

/**
 * Direct Content Generation Test
 * Tests content generation directly without the job queue system
 */

const https = require('https');

// Configuration
const CONFIG = {
  supabase: {
    url: 'https://zjqsfdqhhvhbwqmgdfzn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo'
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
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Content-Pipeline-Test/1.0',
        ...options.headers
      },
      timeout: 120000 // 2 minutes
    };

    const req = https.request(requestOptions, (res) => {
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

async function testDirectContentGeneration() {
  log('\n🚀 Direct Content Generation Test', 'bold');
  log('=' .repeat(60), 'blue');
  
  const testRequest = {
    topic: 'The Future of Artificial Intelligence in Business',
    contentType: 'blog post',
    targetAudience: 'business professionals',
    tone: 'professional and informative',
    wordCount: 500,
    includeExamples: true,
    publishToWordPress: true, // Enable WordPress publishing
    testMode: false
  };

  log('\n📋 Test Request:', 'bold');
  log(`   Topic: ${testRequest.topic}`, 'blue');
  log(`   Content Type: ${testRequest.contentType}`, 'blue');
  log(`   Target Audience: ${testRequest.targetAudience}`, 'blue');
  log(`   Tone: ${testRequest.tone}`, 'blue');
  log(`   Word Count: ${testRequest.wordCount}`, 'blue');
  log(`   Publish to WordPress: ${testRequest.publishToWordPress}`, 'blue');
  log(`   Test Mode: ${testRequest.testMode}`, 'blue');

  try {
    log('\n🤖 Calling Supabase Content Automation Function...', 'cyan');
    
    const response = await makeRequest(`${CONFIG.supabase.url}/functions/v1/direct-content-generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
        'Content-Type': 'application/json'
      },
      body: testRequest
    });

    log(`\n📊 Response Status: ${response.status}`, 'blue');

    if (response.status === 200) {
      log('   ✅ Content generation completed successfully!', 'green');
      
      if (response.data.success) {
        log('\n📝 Generated Content:', 'bold');
        log(`   Title: ${response.data.content?.title || 'N/A'}`, 'blue');
        log(`   Content Length: ${response.data.content?.content?.length || 0} characters`, 'blue');
        log(`   Excerpt: ${response.data.content?.excerpt || 'N/A'}`, 'blue');
        
        if (response.data.timings) {
          log('\n📊 Performance Metrics:', 'bold');
          log(`   Generation Time: ${response.data.timings.generationTime || 'N/A'}ms`, 'blue');
          log(`   Processing Time: ${response.data.timings.processingTime || 'N/A'}ms`, 'blue');
          log(`   WordPress Time: ${response.data.timings.wordpressTime || 'N/A'}ms`, 'blue');
          log(`   Total Time: ${response.data.timings.totalTime || 'N/A'}ms`, 'blue');
        }

        // Show WordPress publishing results
        if (response.data.wordpress) {
          log('\n🌐 WordPress Publishing Results:', 'bold');
          if (response.data.wordpress.published) {
            log(`   ✅ Published: Yes`, 'green');
            log(`   📝 Post ID: ${response.data.wordpress.postId || 'N/A'}`, 'blue');
            log(`   🔗 Post URL: ${response.data.wordpress.postUrl || 'N/A'}`, 'blue');
          } else {
            log(`   ❌ Published: No`, 'red');
            if (response.data.wordpress.error) {
              log(`   ⚠️  Error: ${response.data.wordpress.error}`, 'yellow');
            }
          }
        } else {
          log('\n🌐 WordPress Publishing Results:', 'bold');
          log(`   ⚠️  No WordPress publishing attempted`, 'yellow');
        }
        
        log('\n🎉 Direct content generation is working!', 'green');
        log('✅ OpenAI API → Content Processing → Response', 'green');
        
        // Show a preview of the generated content
        if (response.data.content?.content) {
          log('\n📄 Content Preview:', 'bold');
          const preview = response.data.content.content.substring(0, 300);
          log(`   ${preview}${response.data.content.content.length > 300 ? '...' : ''}`, 'blue');
        }
        
      } else {
        log('   ❌ Content generation failed', 'red');
        log(`   Error: ${response.data.error || 'Unknown error'}`, 'red');
        if (response.data.details) {
          log(`   Details: ${JSON.stringify(response.data.details, null, 2)}`, 'red');
        }
      }
      
    } else {
      log('   ❌ Supabase function call failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
    }

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
  }

  log('\n📋 Next Steps:', 'bold');
  log('   1. If successful: Test with WordPress publishing enabled', 'green');
  log('   2. If failed: Check OpenAI API key and function configuration', 'yellow');
  log('   3. Test with different topics and content types', 'blue');
  log('   4. Fix the job queue RPC function for full automation', 'blue');
}

// Run the test
if (require.main === module) {
  testDirectContentGeneration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      log(`\n💥 Direct content generation test failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testDirectContentGeneration, CONFIG };
