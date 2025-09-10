#!/usr/bin/env node

/**
 * Content Automation Test via Supabase Edge Function
 * Tests the complete workflow using the deployed content-automation function
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
      timeout: 60000 // 60 seconds for content generation
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

async function testContentAutomationViaSupabase() {
  log('\n🚀 Content Automation Test via Supabase', 'bold');
  log('=' .repeat(60), 'blue');
  
  const testRequest = {
    topic: 'The Future of Artificial Intelligence in Business',
    contentType: 'blog post',
    targetAudience: 'business professionals',
    tone: 'professional and informative',
    wordCount: 500,
    includeExamples: true,
    publishToWordPress: true
  };

  log('\n📋 Test Request:', 'bold');
  log(`   Topic: ${testRequest.topic}`, 'blue');
  log(`   Content Type: ${testRequest.contentType}`, 'blue');
  log(`   Target Audience: ${testRequest.targetAudience}`, 'blue');
  log(`   Tone: ${testRequest.tone}`, 'blue');
  log(`   Word Count: ${testRequest.wordCount}`, 'blue');
  log(`   Publish to WordPress: ${testRequest.publishToWordPress}`, 'blue');

  try {
    log('\n🤖 Calling Supabase Content Automation Function...', 'cyan');
    
    const response = await makeRequest(`${CONFIG.supabase.url}/functions/v1/content-automation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
        'Content-Type': 'application/json'
      },
      body: testRequest
    });

    log(`\n📊 Response Status: ${response.status}`, 'blue');

    if (response.status === 200) {
      log('   ✅ Content automation completed successfully!', 'green');
      
      if (response.data.success) {
        log('\n📝 Generated Content:', 'bold');
        log(`   Title: ${response.data.content?.title || 'N/A'}`, 'blue');
        log(`   Content Length: ${response.data.content?.content?.length || 0} characters`, 'blue');
        log(`   Excerpt: ${response.data.content?.excerpt || 'N/A'}`, 'blue');
        
        if (response.data.wordpress) {
          log('\n📤 WordPress Publishing:', 'bold');
          log(`   Published: ${response.data.wordpress.published ? 'Yes' : 'No'}`, 'blue');
          if (response.data.wordpress.postId) {
            log(`   Post ID: ${response.data.wordpress.postId}`, 'blue');
          }
          if (response.data.wordpress.postUrl) {
            log(`   Post URL: ${response.data.wordpress.postUrl}`, 'blue');
          }
        }
        
        if (response.data.metrics) {
          log('\n📊 Performance Metrics:', 'bold');
          log(`   Generation Time: ${response.data.metrics.generationTime || 'N/A'}ms`, 'blue');
          log(`   Processing Time: ${response.data.metrics.processingTime || 'N/A'}ms`, 'blue');
          log(`   Total Time: ${response.data.metrics.totalTime || 'N/A'}ms`, 'blue');
        }
        
        log('\n🎉 Full content automation workflow is working perfectly!', 'green');
        log('✅ Supabase → OpenAI → Content Processing → WordPress Publishing', 'green');
        
      } else {
        log('   ❌ Content automation failed', 'red');
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
  log('   1. If successful: Configure content scheduling and automation', 'green');
  log('   2. If failed: Check Supabase function logs and troubleshoot', 'yellow');
  log('   3. Test with different topics and content types', 'blue');
  log('   4. Set up production WordPress site for live publishing', 'blue');
}

// Run the test
if (require.main === module) {
  testContentAutomationViaSupabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      log(`\n💥 Content automation test failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testContentAutomationViaSupabase, CONFIG };
