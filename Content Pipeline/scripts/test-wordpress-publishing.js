#!/usr/bin/env node

/**
 * WordPress Content Publishing Test Script
 * Tests publishing content to WordPress via REST API
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration - WordPress details from Supabase secrets
const WORDPRESS_CONFIG = {
  url: process.env.WORDPRESS_URL || 'http://automated-content-pipeline-local-test-site.local',
  username: process.env.WORDPRESS_USERNAME || 'content-bot',
  password: process.env.WORDPRESS_PASSWORD || 'inB4 Er6i Koi4 J7Ls JKkN n3Hu',
  apiPath: process.env.WORDPRESS_API_PATH || '/wp-json/wp/v2'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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
        'User-Agent': 'Content-Pipeline-Test/1.0',
        ...options.headers
      },
      timeout: 10000
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

async function testWordPressPublishing() {
  log('\n🚀 WordPress Content Publishing Test', 'bold');
  log('=' .repeat(50), 'blue');
  
  const baseUrl = WORDPRESS_CONFIG.url.replace(/\/$/, '');
  const apiUrl = `${baseUrl}${WORDPRESS_CONFIG.apiPath}`;
  const auth = Buffer.from(`${WORDPRESS_CONFIG.username}:${WORDPRESS_CONFIG.password}`).toString('base64');

  const testPost = {
    title: 'Content Pipeline Test Post',
    content: `
      <h2>🤖 Automated Content Test</h2>
      <p>This is a test post created by the Content Pipeline system to verify that content publishing is working correctly.</p>
      
      <h3>Test Details:</h3>
      <ul>
        <li><strong>Created:</strong> ${new Date().toISOString()}</li>
        <li><strong>Source:</strong> Content Pipeline Test Script</li>
        <li><strong>Status:</strong> Testing WordPress Integration</li>
      </ul>
      
      <p>If you can see this post, it means the Content Pipeline can successfully publish content to WordPress! 🎉</p>
    `,
    status: 'publish',
    excerpt: 'Test post created by Content Pipeline to verify publishing functionality.',
    categories: [1] // Default category - removed tags for now
  };

  const results = {
    postCreated: false,
    postPublished: false,
    postAccessible: false,
    errors: []
  };

  // Test 1: Create a new post
  log('1️⃣ Creating test post...', 'yellow');
  try {
    const response = await makeRequest(`${apiUrl}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`
      },
      body: testPost
    });
    
    if (response.status === 201) {
      log('   ✅ Test post created successfully', 'green');
      results.postCreated = true;
      results.postId = response.data.id;
      
      log(`   📝 Post ID: ${response.data.id}`, 'blue');
      log(`   🔗 Post URL: ${response.data.link}`, 'blue');
      log(`   📊 Status: ${response.data.status}`, 'blue');
    } else {
      log(`   ❌ Post creation failed: ${response.status}`, 'red');
      log(`   📄 Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
      results.errors.push(`Post creation failed: ${response.status}`);
    }
  } catch (error) {
    log(`   ❌ Post creation failed: ${error.message}`, 'red');
    results.errors.push(`Post creation failed: ${error.message}`);
  }

  // Test 2: Verify post is published
  if (results.postCreated && results.postId) {
    log('\n2️⃣ Verifying post is published...', 'yellow');
    try {
      const response = await makeRequest(`${apiUrl}/posts/${results.postId}`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });
      
      if (response.status === 200) {
        log('   ✅ Post is accessible via API', 'green');
        results.postAccessible = true;
        
        if (response.data.status === 'publish') {
          log('   ✅ Post status is "publish"', 'green');
          results.postPublished = true;
        } else {
          log(`   ⚠️  Post status is "${response.data.status}"`, 'yellow');
        }
      } else {
        log(`   ❌ Post verification failed: ${response.status}`, 'red');
        results.errors.push(`Post verification failed: ${response.status}`);
      }
    } catch (error) {
      log(`   ❌ Post verification failed: ${error.message}`, 'red');
      results.errors.push(`Post verification failed: ${error.message}`);
    }
  }

  // Test 3: Check if post appears in public posts list
  if (results.postCreated) {
    log('\n3️⃣ Checking public posts list...', 'yellow');
    try {
      const response = await makeRequest(`${apiUrl}/posts?per_page=5`);
      
      if (response.status === 200) {
        const testPostInList = response.data.find(post => post.id === results.postId);
        if (testPostInList) {
          log('   ✅ Test post appears in public posts list', 'green');
        } else {
          log('   ⚠️  Test post not found in public posts list', 'yellow');
        }
      } else {
        log(`   ❌ Public posts check failed: ${response.status}`, 'red');
        results.errors.push(`Public posts check failed: ${response.status}`);
      }
    } catch (error) {
      log(`   ❌ Public posts check failed: ${error.message}`, 'red');
      results.errors.push(`Public posts check failed: ${error.message}`);
    }
  }

  // Summary
  log('\n📊 Publishing Test Summary', 'bold');
  log('=' .repeat(50), 'blue');
  
  const allTestsPassed = results.postCreated && results.postPublished && results.postAccessible;
  
  if (allTestsPassed) {
    log('🎉 All publishing tests passed! Content Pipeline can publish to WordPress.', 'green');
    log('✅ Your Content Pipeline is ready for content automation.', 'green');
  } else {
    log('⚠️  Some publishing tests failed. Please check the errors below:', 'yellow');
    results.errors.forEach(error => {
      log(`   ❌ ${error}`, 'red');
    });
    
    log('\n🔧 Troubleshooting Tips:', 'yellow');
    log('   1. Verify the content-bot user has "Editor" or "Author" role', 'blue');
    log('   2. Check that WordPress REST API allows post creation', 'blue');
    log('   3. Ensure Application Password has proper permissions', 'blue');
    log('   4. Verify WordPress is not in maintenance mode', 'blue');
  }

  log('\n📋 Next Steps:', 'bold');
  if (allTestsPassed) {
    log('   1. Deploy WordPress integration functions to Supabase', 'green');
    log('   2. Test full content automation workflow', 'green');
    log('   3. Configure content generation and publishing', 'green');
  } else {
    log('   1. Fix the WordPress publishing issues above', 'yellow');
    log('   2. Re-run this test script', 'yellow');
    log('   3. Once all tests pass, proceed with deployment', 'yellow');
  }

  return results;
}

// Run the test
if (require.main === module) {
  testWordPressPublishing()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      log(`\n💥 Publishing test failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testWordPressPublishing, WORDPRESS_CONFIG };
