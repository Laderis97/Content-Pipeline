// Multi-Site Content Generator
// This script generates content for multiple WordPress sites based on topics

const { routeAndGenerateContent } = require('./topic-router');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Content generation queue
const contentQueue = [];

// WordPress publishing function
async function publishToWordPress(postData, topic) {
    const sites = require('./topic-router').loadSiteConfigs();
    const targetSite = findBestSiteForTopic(topic, sites);
    
    if (!targetSite) {
        throw new Error('No suitable site found for this topic');
    }
    
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

// Add content to queue
function addToQueue(topic, contentType, targetAudience, tone, wordCount) {
    contentQueue.push({
        topic,
        contentType,
        targetAudience,
        tone,
        wordCount,
        timestamp: new Date().toISOString()
    });
}

// Process content queue
async function processQueue() {
    console.log(`\n📋 Processing ${contentQueue.length} content items...`);
    
    for (let i = 0; i < contentQueue.length; i++) {
        const item = contentQueue[i];
        console.log(`\n📝 Processing item ${i + 1}/${contentQueue.length}: ${item.topic}`);
        
        try {
            const result = await routeAndGenerateContent(item.topic, item.contentType);
            
            if (result) {
                console.log(`✅ Content generated for ${result.siteUrl}`);
                
                // Publish to WordPress
                try {
                    const publishResult = await publishToWordPress(result, item.topic);
                    console.log(`📝 Published to WordPress: ${publishResult.link}`);
                } catch (publishError) {
                    console.log(`❌ WordPress publishing failed: ${publishError.message}`);
                }
                
            } else {
                console.log(`❌ Failed to generate content for: ${item.topic}`);
            }
        } catch (error) {
            console.log(`❌ Error processing ${item.topic}: ${error.message}`);
        }
    }
    
    // Clear queue after processing
    contentQueue.length = 0;
}

// Batch content generation
async function generateBatchContent(topics, contentType = 'blog post') {
    console.log('🚀 Multi-Site Content Generator');
    console.log('==============================');
    
    console.log(`\n📋 Generating content for ${topics.length} topics:`);
    topics.forEach((topic, index) => {
        console.log(`  ${index + 1}. ${topic}`);
    });
    
    // Add topics to queue
    topics.forEach(topic => {
        addToQueue(topic, contentType, 'general audience', 'professional', 500);
    });
    
    // Process queue
    await processQueue();
    
    console.log('\n🎉 Batch content generation complete!');
}

// Generate content for specific topics
async function generateTopicContent() {
    const topics = [
        'artificial intelligence in healthcare',
        'sustainable business practices',
        'mental health and wellness',
        'travel photography tips',
        'cloud computing trends',
        'personal finance strategies',
        'fitness and nutrition',
        'digital marketing strategies'
    ];
    
    await generateBatchContent(topics);
}

// Generate content for specific site
async function generateSiteContent(siteId, topics) {
    console.log(`\n🎯 Generating content for site: ${siteId}`);
    
    const sites = require('./topic-router').loadSiteConfigs();
    const site = sites[siteId];
    
    if (!site) {
        console.log(`❌ Site ${siteId} not found`);
        return;
    }
    
    console.log(`📋 Site: ${site.name}`);
    console.log(`🌐 URL: ${site.url}`);
    console.log(`📝 Topics: ${site.topics.join(', ')}`);
    
    // Generate content for each topic
    for (const topic of topics) {
        console.log(`\n📝 Generating content for: ${topic}`);
        
        try {
            const result = await routeAndGenerateContent(topic, 'blog post');
            
            if (result && result.siteId === siteId) {
                console.log(`✅ Content generated for ${site.name}`);
            } else {
                console.log(`⚠️  Topic routed to different site: ${result?.siteId || 'none'}`);
            }
        } catch (error) {
            console.log(`❌ Error generating content: ${error.message}`);
        }
    }
}

// Main function
async function main() {
    const command = process.argv[2];
    const args = process.argv.slice(3);
    
    switch (command) {
        case 'batch':
            const topics = args.length > 0 ? args : [
                'artificial intelligence',
                'business strategy',
                'health and wellness',
                'travel and lifestyle'
            ];
            await generateBatchContent(topics);
            break;
            
        case 'site':
            const siteId = args[0];
            const siteTopics = args.slice(1);
            if (!siteId) {
                console.log('❌ Please provide site ID');
                return;
            }
            await generateSiteContent(siteId, siteTopics);
            break;
            
        case 'topics':
            await generateTopicContent();
            break;
            
        default:
            console.log('🚀 Multi-Site Content Generator');
            console.log('==============================');
            console.log('\nUsage:');
            console.log('  node multi-site-generator.js batch [topic1] [topic2] ...');
            console.log('  node multi-site-generator.js site <siteId> [topic1] [topic2] ...');
            console.log('  node multi-site-generator.js topics');
            console.log('\nExamples:');
            console.log('  node multi-site-generator.js batch "AI in healthcare" "sustainable business"');
            console.log('  node multi-site-generator.js site tech-blog "machine learning" "programming"');
            console.log('  node multi-site-generator.js topics');
            break;
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    addToQueue,
    processQueue,
    generateBatchContent,
    generateSiteContent,
    generateTopicContent
};
