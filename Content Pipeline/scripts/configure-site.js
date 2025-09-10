// Site Configuration Manager
// This script helps configure individual WordPress sites for the Content Pipeline

const fs = require('fs');
const path = require('path');

// Site configuration template
const siteConfigTemplate = {
    siteId: '',
    name: '',
    url: '',
    username: '',
    password: '',
    apiPath: '/wp-json/wp/v2',
    topics: [],
    categories: [],
    tags: [],
    defaultSettings: {
        status: 'publish',
        featuredImage: false,
        excerpt: true,
        seo: true
    }
};

// Predefined site configurations
const predefinedSites = {
    'tech-blog': {
        name: 'Technology Blog',
        topics: ['artificial intelligence', 'programming', 'software development', 'cybersecurity', 'cloud computing', 'data science', 'machine learning', 'web development', 'mobile apps', 'gaming'],
        categories: ['AI & Machine Learning', 'Programming', 'Cybersecurity', 'Cloud Computing', 'Web Development', 'Mobile Development', 'Gaming'],
        tags: ['tech', 'programming', 'AI', 'development', 'software', 'innovation']
    },
    'business-news': {
        name: 'Business News',
        topics: ['business strategy', 'entrepreneurship', 'finance', 'marketing', 'leadership', 'startups', 'investing', 'economy', 'management', 'sales'],
        categories: ['Business Strategy', 'Finance', 'Marketing', 'Leadership', 'Startups', 'Economy', 'Management'],
        tags: ['business', 'finance', 'marketing', 'leadership', 'entrepreneurship', 'strategy']
    },
    'health-wellness': {
        name: 'Health & Wellness',
        topics: ['nutrition', 'fitness', 'mental health', 'wellness', 'diet', 'exercise', 'meditation', 'yoga', 'healthy living', 'medical advice'],
        categories: ['Nutrition', 'Fitness', 'Mental Health', 'Wellness', 'Exercise', 'Meditation', 'Healthy Living'],
        tags: ['health', 'wellness', 'fitness', 'nutrition', 'mental-health', 'lifestyle']
    },
    'travel-lifestyle': {
        name: 'Travel & Lifestyle',
        topics: ['travel destinations', 'lifestyle tips', 'food', 'culture', 'adventure', 'photography', 'fashion', 'home decor', 'entertainment', 'hobbies'],
        categories: ['Travel Destinations', 'Lifestyle Tips', 'Food & Culture', 'Adventure', 'Photography', 'Fashion', 'Home Decor'],
        tags: ['travel', 'lifestyle', 'food', 'culture', 'adventure', 'photography', 'fashion']
    }
};

// Main configuration function
async function configureSite() {
    console.log('🌐 WordPress Site Configuration Manager');
    console.log('=====================================');
    
    console.log('\n📋 Available Site Types:');
    Object.keys(predefinedSites).forEach((key, index) => {
        console.log(`${index + 1}. ${predefinedSites[key].name} (${key})`);
    });
    console.log('5. Custom Site');
    
    const siteType = await promptUser('Choose site type (1-5): ');
    
    let siteConfig;
    
    if (siteType >= 1 && siteType <= 4) {
        const siteKeys = Object.keys(predefinedSites);
        const selectedKey = siteKeys[siteType - 1];
        siteConfig = { ...siteConfigTemplate, ...predefinedSites[selectedKey] };
        siteConfig.siteId = selectedKey;
    } else {
        siteConfig = { ...siteConfigTemplate };
        siteConfig.name = await promptUser('Enter site name: ');
        siteConfig.siteId = siteConfig.name.toLowerCase().replace(/\s+/g, '-');
    }
    
    // Get site details
    siteConfig.url = await promptUser('Enter WordPress site URL: ');
    siteConfig.username = await promptUser('Enter WordPress username: ');
    siteConfig.password = await promptUser('Enter Application Password: ');
    
    // Test connection
    console.log('\n🧪 Testing WordPress connection...');
    const connectionTest = await testWordPressConnection(siteConfig);
    
    if (connectionTest.success) {
        console.log('✅ WordPress connection successful!');
        console.log(`Connected as: ${connectionTest.userData.name}`);
        
        // Save configuration
        const configPath = path.join(__dirname, '..', 'config', 'sites', `${siteConfig.siteId}.json`);
        const configDir = path.dirname(configPath);
        
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(configPath, JSON.stringify(siteConfig, null, 2));
        console.log(`\n💾 Site configuration saved to: ${configPath}`);
        
        // Update Supabase secrets
        console.log('\n🔐 Updating Supabase secrets...');
        await updateSupabaseSecrets(siteConfig);
        
        console.log('\n🎉 Site configuration complete!');
        console.log(`Site: ${siteConfig.name}`);
        console.log(`URL: ${siteConfig.url}`);
        console.log(`Topics: ${siteConfig.topics.join(', ')}`);
        
    } else {
        console.log('❌ WordPress connection failed!');
        console.log(`Error: ${connectionTest.error}`);
    }
}

// Test WordPress connection
async function testWordPressConnection(config) {
    try {
        const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
        const apiUrl = `${config.url}${config.apiPath}/users/me`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            return { success: true, userData };
        } else {
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update Supabase secrets
async function updateSupabaseSecrets(config) {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
        // Update site-specific secrets
        await execAsync(`npx supabase secrets set WORDPRESS_URL_${config.siteId.toUpperCase()}=${config.url}`);
        await execAsync(`npx supabase secrets set WORDPRESS_USERNAME_${config.siteId.toUpperCase()}=${config.username}`);
        await execAsync(`npx supabase secrets set WORDPRESS_PASSWORD_${config.siteId.toUpperCase()}=${config.password}`);
        
        console.log('✅ Supabase secrets updated successfully!');
    } catch (error) {
        console.log('⚠️  Failed to update Supabase secrets:', error.message);
    }
}

// Helper function for user input
function promptUser(question) {
    return new Promise((resolve) => {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// Run configuration
configureSite().catch(console.error);
