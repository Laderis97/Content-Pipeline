const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load health site configuration
const configPath = path.join(__dirname, '..', 'config', 'sites', 'health-wellness.json');

if (!fs.existsSync(configPath)) {
  console.error('❌ Health site configuration not found at:', configPath);
  process.exit(1);
}

const siteConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('🏥 Testing Health & Wellness Site Connection');
console.log('==========================================');
console.log(`Site: ${siteConfig.name}`);
console.log(`URL: ${siteConfig.url}`);
console.log(`Username: ${siteConfig.username}`);
console.log(`Topics: ${siteConfig.topics.slice(0, 5).join(', ')}...`);

if (!siteConfig.appPassword) {
  console.log('\n⚠️  Application Password not configured yet!');
  console.log('Run: scripts/setup-health-site.ps1 to set up the Application Password');
  process.exit(1);
}

// Test WordPress REST API connection
async function testWordPressConnection() {
  const apiUrl = `${siteConfig.url.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
  const auth = Buffer.from(`${siteConfig.username}:${siteConfig.appPassword}`).toString('base64');
  
  const url = new URL(siteConfig.url);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: '/wp-json/wp/v2/users/me',
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
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
          if (res.statusCode === 200) {
            const userData = JSON.parse(data);
            resolve({
              success: true,
              user: userData.name || userData.slug || 'admin',
              capabilities: userData.capabilities || {}
            });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          reject(new Error(`Response parsing error: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
    
    req.end();
  });
}

// Test content publishing
async function testContentPublishing() {
  const apiUrl = `${siteConfig.url.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
  const auth = Buffer.from(`${siteConfig.username}:${siteConfig.appPassword}`).toString('base64');
  
  const testPost = {
    title: 'Health Site Test Post',
    content: '<p>This is a test post to verify the health & wellness site is working correctly.</p><p>Topics: nutrition, fitness, mental health, wellness</p>',
    excerpt: 'Test post for health site verification',
    status: 'draft', // Create as draft for testing
    categories: [1] // Default category
  };
  
  const url = new URL(siteConfig.url);
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
      'Content-Length': Buffer.byteLength(JSON.stringify(testPost))
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
          if (res.statusCode === 201) {
            const postData = JSON.parse(data);
            resolve({
              success: true,
              postId: postData.id,
              postUrl: postData.link
            });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          reject(new Error(`Response parsing error: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
    
    req.write(JSON.stringify(testPost));
    req.end();
  });
}

// Run tests
async function runTests() {
  try {
    console.log('\n🔍 Testing WordPress connection...');
    const connectionResult = await testWordPressConnection();
    console.log('✅ Connection successful!');
    console.log(`   User: ${connectionResult.user}`);
    console.log(`   Capabilities: ${Object.keys(connectionResult.capabilities).length} permissions`);
    
    console.log('\n📝 Testing content publishing...');
    const publishResult = await testContentPublishing();
    console.log('✅ Content publishing successful!');
    console.log(`   Post ID: ${publishResult.postId}`);
    console.log(`   Post URL: ${publishResult.postUrl}`);
    
    console.log('\n🎉 Health site is fully configured and working!');
    console.log('\n📊 Site Summary:');
    console.log(`   Name: ${siteConfig.name}`);
    console.log(`   URL: ${siteConfig.url}`);
    console.log(`   Topics: ${siteConfig.topics.length} configured`);
    console.log(`   Categories: ${siteConfig.categories.length} configured`);
    console.log(`   Tags: ${siteConfig.tags.length} configured`);
    
    console.log('\n🚀 Ready for content generation!');
    console.log('   Dashboard: http://localhost:3000/multi-site');
    console.log('   Command: node scripts/multi-site-generator.js');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 This looks like an authentication issue.');
      console.log('   Make sure you have set up the Application Password correctly.');
      console.log('   Run: scripts/setup-health-site.ps1');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      console.log('\n💡 This looks like a connection issue.');
      console.log('   Make sure your WordPress site is running and accessible.');
      console.log('   Check the URL: http://automated-content-pipeline-local-test-site.local');
    }
    
    process.exit(1);
  }
}

runTests();
