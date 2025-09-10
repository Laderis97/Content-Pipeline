// Multi-Site Content Generator
// This script generates content for multiple WordPress sites based on topics

const { routeAndGenerateContent } = require('./topic-router');
const fs = require('fs');
const path = require('path');

// Content generation queue
const contentQueue = [];

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
                
                // Here you would publish to WordPress
                // await publishToWordPress(result);
                
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
