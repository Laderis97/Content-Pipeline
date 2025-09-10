// Test WordPress.com Connection
const https = require('https');

// WordPress.com configuration
const WORDPRESS_CONFIG = {
    url: 'https://veblenincorporated.wordpress.com',
    username: process.env.WORDPRESS_USERNAME || 'your-username',
    password: process.env.WORDPRESS_PASSWORD || 'your-app-password',
    apiPath: '/wp-json/wp/v2'
};

console.log('🧪 Testing WordPress.com Connection...');
console.log('=====================================');
console.log(`WordPress URL: ${WORDPRESS_CONFIG.url}`);
console.log(`Username: ${WORDPRESS_CONFIG.username}`);

// Test WordPress.com connection
async function testWordPressConnection() {
    try {
        const auth = Buffer.from(`${WORDPRESS_CONFIG.username}:${WORDPRESS_CONFIG.password}`).toString('base64');
        const apiUrl = `${WORDPRESS_CONFIG.url}${WORDPRESS_CONFIG.apiPath}/users/me`;
        
        console.log(`\n🔗 Testing API endpoint: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            console.log('✅ WordPress.com connection successful!');
            console.log(`Connected as: ${userData.name} (${userData.slug})`);
            console.log(`User ID: ${userData.id}`);
            console.log(`Email: ${userData.email}`);
            
            // Test posts endpoint
            console.log('\n📝 Testing posts endpoint...');
            const postsUrl = `${WORDPRESS_CONFIG.url}${WORDPRESS_CONFIG.apiPath}/posts`;
            const postsResponse = await fetch(postsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (postsResponse.ok) {
                const posts = await postsResponse.json();
                console.log(`✅ Posts endpoint accessible! Found ${posts.length} posts`);
            } else {
                console.log('⚠️  Posts endpoint not accessible, but user auth works');
            }
            
            return true;
        } else {
            console.log(`❌ WordPress.com connection failed!`);
            console.log(`Status: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.log(`Error: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Connection error: ${error.message}`);
        return false;
    }
}

// Test content publishing
async function testContentPublishing() {
    try {
        const auth = Buffer.from(`${WORDPRESS_CONFIG.username}:${WORDPRESS_CONFIG.password}`).toString('base64');
        const postsUrl = `${WORDPRESS_CONFIG.url}${WORDPRESS_CONFIG.apiPath}/posts`;
        
        console.log('\n📝 Testing content publishing...');
        
        const testPost = {
            title: 'Content Pipeline Test Post',
            content: 'This is a test post created by the Content Pipeline system.',
            status: 'draft', // Start as draft for safety
            excerpt: 'Test post to verify Content Pipeline functionality'
        };
        
        const response = await fetch(postsUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPost)
        });
        
        if (response.ok) {
            const postData = await response.json();
            console.log('✅ Content publishing successful!');
            console.log(`Post ID: ${postData.id}`);
            console.log(`Post URL: ${postData.link}`);
            console.log(`Status: ${postData.status}`);
            
            // Clean up test post
            console.log('\n🧹 Cleaning up test post...');
            const deleteUrl = `${WORDPRESS_CONFIG.url}${WORDPRESS_CONFIG.apiPath}/posts/${postData.id}?force=true`;
            const deleteResponse = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (deleteResponse.ok) {
                console.log('✅ Test post cleaned up successfully');
            } else {
                console.log('⚠️  Test post created but could not be deleted (you may need to delete it manually)');
            }
            
            return true;
        } else {
            console.log(`❌ Content publishing failed!`);
            console.log(`Status: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.log(`Error: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Publishing error: ${error.message}`);
        return false;
    }
}

// Run tests
async function runTests() {
    console.log('Starting WordPress.com connection tests...\n');
    
    const connectionTest = await testWordPressConnection();
    
    if (connectionTest) {
        const publishingTest = await testContentPublishing();
        
        if (publishingTest) {
            console.log('\n🎉 All tests passed! Your Content Pipeline is ready for WordPress.com publishing.');
        } else {
            console.log('\n⚠️  Connection works but publishing failed. Check your WordPress.com permissions.');
        }
    } else {
        console.log('\n❌ WordPress.com connection failed. Please check your configuration.');
    }
}

runTests().catch(console.error);
