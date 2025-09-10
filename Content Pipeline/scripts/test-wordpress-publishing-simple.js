const http = require('http');

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

async function testWordPressPublishing() {
  log('\n🌐 WordPress Publishing Test', 'bold');
  log('=' .repeat(50), 'blue');
  
  // WordPress credentials from environment
  const wordpressUrl = process.env.WORDPRESS_URL || 'http://automated-content-pipeline-local-test-site.local';
  const wordpressUsername = process.env.WORDPRESS_USERNAME || 'content-bot';
  const wordpressPassword = process.env.WORDPRESS_PASSWORD || 'inB4 Er6i Koi4 J7Ls JKkN n3Hu';
  
  log(`\n📋 WordPress Configuration:`, 'bold');
  log(`   URL: ${wordpressUrl}`, 'blue');
  log(`   Username: ${wordpressUsername}`, 'blue');
  log(`   Password: ${wordpressPassword.substring(0, 10)}...`, 'blue');
  
  // Test post data
  const testPost = {
    title: 'Test Post from Content Pipeline - ' + new Date().toISOString(),
    content: '<p>This is a test post created by the Content Pipeline system.</p><p>If you can see this, WordPress publishing is working correctly!</p>',
    status: 'publish',
    categories: [1] // Default category
  };
  
  log(`\n📝 Test Post:`, 'bold');
  log(`   Title: ${testPost.title}`, 'blue');
  log(`   Content: ${testPost.content}`, 'blue');
  log(`   Status: ${testPost.status}`, 'blue');
  log(`   Categories: ${testPost.categories}`, 'blue');
  
  try {
    log('\n🚀 Publishing to WordPress...', 'bold');
    
    const postData = JSON.stringify(testPost);
    const url = new URL(wordpressUrl);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/wp-json/wp/v2/posts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Basic ' + Buffer.from(`${wordpressUsername}:${wordpressPassword}`).toString('base64')
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: jsonData
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data
            });
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
    
    log(`\n📊 Response Status: ${response.statusCode}`, 'bold');
    
    if (response.statusCode === 201) {
      log('   ✅ Post published successfully!', 'green');
      log(`   📝 Post ID: ${response.data.id}`, 'blue');
      log(`   🔗 Post URL: ${response.data.link}`, 'blue');
      log(`   📅 Published: ${response.data.date}`, 'blue');
      
      log('\n🎉 WordPress publishing is working!', 'green');
      log('✅ Content Pipeline → WordPress Publishing', 'green');
      
    } else {
      log('   ❌ Post publishing failed', 'red');
      log(`   Error: ${JSON.stringify(response.data, null, 2)}`, 'red');
    }
    
  } catch (error) {
    log('\n❌ WordPress Publishing Test Failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    
    if (error.code === 'ENOTFOUND') {
      log('\n💡 Troubleshooting Tips:', 'yellow');
      log('   1. Check if WordPress site is running', 'yellow');
      log('   2. Verify the WORDPRESS_URL is correct', 'yellow');
      log('   3. Make sure the site is accessible', 'yellow');
    } else if (error.code === 'ECONNREFUSED') {
      log('\n💡 Troubleshooting Tips:', 'yellow');
      log('   1. Check if WordPress site is running', 'yellow');
      log('   2. Verify the port number', 'yellow');
      log('   3. Check firewall settings', 'yellow');
    }
  }
}

// Run the test
testWordPressPublishing().catch(console.error);
