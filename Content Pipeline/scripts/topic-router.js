// Topic-Based Content Router
// This script routes content to appropriate WordPress sites based on topics

const fs = require('fs');
const path = require('path');

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

// Topic matching algorithm
function findBestSiteForTopic(topic, sites) {
    const topicLower = topic.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;
    
    Object.keys(sites).forEach(siteId => {
        const site = sites[siteId];
        let score = 0;
        
        // Check if topic matches any of the site's topics
        site.topics.forEach(siteTopic => {
            if (topicLower.includes(siteTopic.toLowerCase()) || siteTopic.toLowerCase().includes(topicLower)) {
                score += 10; // High score for exact matches
            }
        });
        
        // Check category matches
        site.categories.forEach(category => {
            if (topicLower.includes(category.toLowerCase()) || category.toLowerCase().includes(topicLower)) {
                score += 5; // Medium score for category matches
            }
        });
        
        // Check tag matches
        site.tags.forEach(tag => {
            if (topicLower.includes(tag.toLowerCase()) || tag.toLowerCase().includes(topicLower)) {
                score += 3; // Lower score for tag matches
            }
        });
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = siteId;
        }
    });
    
    return { siteId: bestMatch, score: bestScore };
}

// Content routing function
function routeContent(topic, contentType, sites) {
    console.log(`\n🎯 Routing content for topic: "${topic}"`);
    console.log(`📝 Content type: ${contentType}`);
    
    const match = findBestSiteForTopic(topic, sites);
    
    if (match.siteId && match.score > 0) {
        const site = sites[match.siteId];
        console.log(`✅ Best match: ${site.name} (Score: ${match.score})`);
        console.log(`🌐 Site URL: ${site.url}`);
        console.log(`📋 Relevant topics: ${site.topics.slice(0, 5).join(', ')}...`);
        
        return {
            success: true,
            siteId: match.siteId,
            site: site,
            score: match.score
        };
    } else {
        console.log('❌ No suitable site found for this topic');
        console.log('💡 Consider creating a new site or adding this topic to an existing site');
        
        return {
            success: false,
            message: 'No suitable site found'
        };
    }
}

// Generate content for specific site
async function generateContentForSite(topic, contentType, siteId, sites) {
    const site = sites[siteId];
    if (!site) {
        throw new Error(`Site ${siteId} not found`);
    }
    
    console.log(`\n🤖 Generating content for ${site.name}...`);
    console.log(`📝 Topic: ${topic}`);
    console.log(`📄 Type: ${contentType}`);
    
    // Here you would call your content generation function
    // For now, we'll simulate the process
    const content = {
        title: `${topic} - ${site.name}`,
        content: `This is a ${contentType} about ${topic} for ${site.name}.`,
        excerpt: `Learn about ${topic} in this comprehensive ${contentType}.`,
        categories: site.categories.slice(0, 2),
        tags: site.tags.slice(0, 5),
        siteId: siteId,
        siteUrl: site.url
    };
    
    return content;
}

// Main routing function
async function routeAndGenerateContent(topic, contentType) {
    console.log('🚀 Topic-Based Content Router');
    console.log('=============================');
    
    // Load site configurations
    const sites = loadSiteConfigs();
    
    if (Object.keys(sites).length === 0) {
        console.log('❌ No sites configured. Please run configure-site.js first.');
        return;
    }
    
    console.log(`\n📋 Available sites: ${Object.keys(sites).length}`);
    Object.keys(sites).forEach(siteId => {
        const site = sites[siteId];
        console.log(`  - ${site.name} (${siteId}): ${site.topics.length} topics`);
    });
    
    // Route content
    const routing = routeContent(topic, contentType, sites);
    
    if (routing.success) {
        // Generate content for the selected site
        const content = await generateContentForSite(topic, contentType, routing.siteId, sites);
        
        console.log('\n📄 Generated Content:');
        console.log(`Title: ${content.title}`);
        console.log(`Categories: ${content.categories.join(', ')}`);
        console.log(`Tags: ${content.tags.join(', ')}`);
        console.log(`Target Site: ${content.siteUrl}`);
        
        return content;
    } else {
        console.log('\n💡 Suggestions:');
        console.log('1. Create a new site for this topic');
        console.log('2. Add this topic to an existing site');
        console.log('3. Use a general-purpose site');
        
        return null;
    }
}

// Export functions for use in other scripts
module.exports = {
    loadSiteConfigs,
    findBestSiteForTopic,
    routeContent,
    generateContentForSite,
    routeAndGenerateContent
};

// Run if called directly
if (require.main === module) {
    const topic = process.argv[2] || 'artificial intelligence';
    const contentType = process.argv[3] || 'blog post';
    
    routeAndGenerateContent(topic, contentType).catch(console.error);
}
