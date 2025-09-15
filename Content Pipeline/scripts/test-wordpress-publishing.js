// Test WordPress Publishing
// This script tests publishing content to WordPress without using OpenAI

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load site configurations
function loadSiteConfigs() {
    const configDir = path.join(__dirname, '..', 'config', 'sites');
    const sites = {};
    
    if (fs.existsSync(configDir)) {
        const files = fs.readdirSync(configDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const siteId = file.replace('.json', '');
                const configPath = path.join(configDir, file);
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                sites[siteId] = config;
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
    
    Object.keys(sites).forEach(siteId => {
        const site = sites[siteId];
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

// WordPress publishing function
async function publishToWordPress(postData, topic) {
    const sites = loadSiteConfigs();
    const targetSite = findBestSiteForTopic(topic, sites);
    
    if (!targetSite) {
        throw new Error('No suitable site found for this topic');
    }
    
    console.log(`🎯 Publishing to: ${targetSite.name} (${targetSite.url})`);
    
    const wordpressUrl = targetSite.url;
    const wordpressUsername = targetSite.username;
    const wordpressPassword = targetSite.appPassword;
    
    if (!wordpressPassword) {
        throw new Error(`Application password not configured for ${targetSite.name}`);
    }
    
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

// Test content
const testContent = {
    title: 'Test Post - WordPress Publishing Test',
    content: '<h1>Test Post</h1><p>This is a test post to verify that WordPress publishing is working correctly.</p><p>If you can see this post, the Content Pipeline is successfully publishing to WordPress!</p>',
    excerpt: 'This is a test post to verify WordPress publishing functionality.'
};

// Main test function
async function testPublishing() {
    console.log('🧪 Testing WordPress Publishing');
    console.log('==============================');
    
    try {
        const result = await publishToWordPress(testContent, 'artificial intelligence');
        console.log('✅ Publishing successful!');
        console.log(`📝 Post ID: ${result.id}`);
        console.log(`🔗 Post URL: ${result.link}`);
        console.log(`🌐 Site: ${result.site}`);
    } catch (error) {
        console.log('❌ Publishing failed:');
        console.log(`   Error: ${error.message}`);
    }
}

// Run the test
testPublishing();