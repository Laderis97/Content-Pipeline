#!/usr/bin/env node

/**
 * WordPress Connection Test Script
 * Tests WordPress REST API connectivity and authentication
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

async function testWordPressConnection() {
  log('\n🚀 WordPress Connection Test', 'bold');
  log('=' .repeat(50), 'blue');
  
  // Configuration is now set with actual WordPress details

  log(`📡 Testing connection to: ${WORDPRESS_CONFIG.url}`, 'blue');
  log(`👤 Username: ${WORDPRESS_CONFIG.username}`, 'blue');
  log(`🔑 Password: ${'*'.repeat(WORDPRESS_CONFIG.password.length)}`, 'blue');
  log('');

  const baseUrl = WORDPRESS_CONFIG.url.replace(/\/$/, '');
  const apiUrl = `${baseUrl}${WORDPRESS_CONFIG.apiPath}`;
  const auth = Buffer.from(`${WORDPRESS_CONFIG.username}:${WORDPRESS_CONFIG.password}`).toString('base64');

  const results = {
    apiAvailable: false,
    authWorking: false,
    postsAccessible: false,
    categoriesAccessible: false,
    errors: []
  };

  // Test 1: Check if WordPress REST API is available
  log('1️⃣ Testing WordPress REST API availability...', 'yellow');
  try {
    const response = await makeRequest(`${apiUrl}/`);
    
    if (response.status === 200) {
      log('   ✅ WordPress REST API is accessible', 'green');
      results.apiAvailable = true;
      
      if (response.data.name) {
        log(`   📝 Site: ${response.data.name}`, 'blue');
      }
      if (response.data.description) {
        log(`   📄 Description: ${response.data.description}`, 'blue');
      }
    } else {
      log(`   ❌ API not accessible: ${response.status} ${response.statusText}`, 'red');
      results.errors.push(`API not accessible: ${response.status}`);
    }
  } catch (error) {
    log(`   ❌ API connection failed: ${error.message}`, 'red');
    results.errors.push(`API connection failed: ${error.message}`);
  }

  // Test 2: Check authentication
  log('\n2️⃣ Testing WordPress authentication...', 'yellow');
  try {
    const response = await makeRequest(`${apiUrl}/users/me`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    
    if (response.status === 200) {
      log('   ✅ Authentication successful', 'green');
      results.authWorking = true;
      
      if (response.data.id) {
        log(`   👤 User ID: ${response.data.id}`, 'blue');
      }
      if (response.data.username) {
        log(`   📛 Username: ${response.data.username}`, 'blue');
      }
      if (response.data.roles) {
        log(`   🔐 Roles: ${response.data.roles.join(', ')}`, 'blue');
      }
    } else {
      log(`   ❌ Authentication failed: ${response.status}`, 'red');
      results.errors.push(`Authentication failed: ${response.status}`);
    }
  } catch (error) {
    log(`   ❌ Authentication test failed: ${error.message}`, 'red');
    results.errors.push(`Authentication test failed: ${error.message}`);
  }

  // Test 3: Check posts endpoint
  log('\n3️⃣ Testing posts endpoint...', 'yellow');
  try {
    const response = await makeRequest(`${apiUrl}/posts?per_page=1`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    
    if (response.status === 200) {
      log('   ✅ Posts endpoint accessible', 'green');
      results.postsAccessible = true;
      
      if (response.data.length > 0) {
        log(`   📝 Found ${response.data.length} post(s)`, 'blue');
      }
    } else {
      log(`   ❌ Posts endpoint failed: ${response.status}`, 'red');
      results.errors.push(`Posts endpoint failed: ${response.status}`);
    }
  } catch (error) {
    log(`   ❌ Posts endpoint test failed: ${error.message}`, 'red');
    results.errors.push(`Posts endpoint test failed: ${error.message}`);
  }

  // Test 4: Check categories endpoint
  log('\n4️⃣ Testing categories endpoint...', 'yellow');
  try {
    const response = await makeRequest(`${apiUrl}/categories`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    
    if (response.status === 200) {
      log('   ✅ Categories endpoint accessible', 'green');
      results.categoriesAccessible = true;
      
      if (response.data.length > 0) {
        log(`   📂 Found ${response.data.length} categories`, 'blue');
      }
    } else {
      log(`   ❌ Categories endpoint failed: ${response.status}`, 'red');
      results.errors.push(`Categories endpoint failed: ${response.status}`);
    }
  } catch (error) {
    log(`   ❌ Categories endpoint test failed: ${error.message}`, 'red');
    results.errors.push(`Categories endpoint test failed: ${error.message}`);
  }

  // Summary
  log('\n📊 Test Summary', 'bold');
  log('=' .repeat(50), 'blue');
  
  const allTestsPassed = results.apiAvailable && results.authWorking && results.postsAccessible && results.categoriesAccessible;
  
  if (allTestsPassed) {
    log('🎉 All tests passed! WordPress connectivity is working perfectly.', 'green');
    log('✅ Your Content Pipeline can now connect to WordPress.', 'green');
  } else {
    log('⚠️  Some tests failed. Please check the errors below:', 'yellow');
    results.errors.forEach(error => {
      log(`   ❌ ${error}`, 'red');
    });
    
    log('\n🔧 Troubleshooting Tips:', 'yellow');
    log('   1. Verify your WordPress URL is correct and accessible', 'blue');
    log('   2. Check that WordPress REST API is enabled', 'blue');
    log('   3. Ensure Application Passwords are enabled in WordPress', 'blue');
    log('   4. Verify the username and application password are correct', 'blue');
    log('   5. Check that the user has proper permissions', 'blue');
  }

  log('\n📋 Next Steps:', 'bold');
  if (allTestsPassed) {
    log('   1. Add WordPress environment variables to Supabase', 'green');
    log('   2. Deploy the WordPress integration functions', 'green');
    log('   3. Test content publishing to WordPress', 'green');
  } else {
    log('   1. Fix the WordPress configuration issues above', 'yellow');
    log('   2. Re-run this test script', 'yellow');
    log('   3. Once all tests pass, proceed with deployment', 'yellow');
  }

  return results;
}

// Run the test
if (require.main === module) {
  testWordPressConnection()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      log(`\n💥 Test script failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testWordPressConnection, WORDPRESS_CONFIG };

