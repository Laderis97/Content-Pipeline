# WordPress.com Setup Script for Content Pipeline
# This script helps configure the Content Pipeline for WordPress.com sites

Write-Host "🔧 WordPress.com Setup for Content Pipeline" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "`n📋 Your WordPress.com Site:" -ForegroundColor Yellow
Write-Host "URL: https://veblenincorporated.wordpress.com" -ForegroundColor White

Write-Host "`n🔑 WordPress.com Authentication Setup:" -ForegroundColor Green
Write-Host "1. Go to: https://veblenincorporated.wordpress.com/wp-admin" -ForegroundColor White
Write-Host "2. Log in with your WordPress.com account" -ForegroundColor White
Write-Host "3. Navigate to Users > Your Profile" -ForegroundColor White
Write-Host "4. Scroll down to Application Passwords" -ForegroundColor White
Write-Host "5. Create a new Application Password with name: Content Pipeline" -ForegroundColor White
Write-Host "6. Copy the generated password (it will look like: xxxx xxxx xxxx xxxx xxxx xxxx)" -ForegroundColor White

$wordpressUsername = Read-Host "`nEnter your WordPress.com username"
$appPassword = Read-Host "Enter the Application Password you just created"

# Test the connection
Write-Host "`n🧪 Testing WordPress.com Connection..." -ForegroundColor Yellow

$testUrl = "https://veblenincorporated.wordpress.com/wp-json/wp/v2/users/me"
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$wordpressUsername`:$appPassword"))

try {
    $response = Invoke-RestMethod -Uri $testUrl -Headers @{
        "Authorization" = "Basic $auth"
        "Content-Type" = "application/json"
    }
    
    Write-Host "✅ WordPress.com connection successful!" -ForegroundColor Green
    Write-Host "Connected as: $($response.name)" -ForegroundColor White
    Write-Host "User ID: $($response.id)" -ForegroundColor White
    
    # Update Supabase secrets
    Write-Host "`n🔐 Updating Supabase secrets..." -ForegroundColor Yellow
    
    # Set WordPress URL
    npx supabase secrets set WORDPRESS_URL=https://veblenincorporated.wordpress.com
    
    # Set WordPress username
    npx supabase secrets set WORDPRESS_USERNAME=$wordpressUsername
    
    # Set WordPress password (Application Password)
    npx supabase secrets set WORDPRESS_PASSWORD=$appPassword
    
    # Set WordPress API path
    npx supabase secrets set WORDPRESS_API_PATH=/wp-json/wp/v2
    
    Write-Host "✅ Supabase secrets updated successfully!" -ForegroundColor Green
    
    Write-Host "`n🎉 WordPress.com setup complete!" -ForegroundColor Green
    Write-Host "You can now use the Content Pipeline to publish to: https://veblenincorporated.wordpress.com" -ForegroundColor White
    
    # Test content publishing
    Write-Host "`n📝 Testing content publishing..." -ForegroundColor Yellow
    
    $testPost = @{
        title = "Content Pipeline Test Post"
        content = "This is a test post created by the Content Pipeline system."
        status = "draft"
        excerpt = "Test post to verify Content Pipeline functionality"
    } | ConvertTo-Json
    
    $postsUrl = "https://veblenincorporated.wordpress.com/wp-json/wp/v2/posts"
    
    try {
        $postResponse = Invoke-RestMethod -Uri $postsUrl -Method POST -Headers @{
            "Authorization" = "Basic $auth"
            "Content-Type" = "application/json"
        } -Body $testPost
        
        Write-Host "✅ Content publishing test successful!" -ForegroundColor Green
        Write-Host "Test post ID: $($postResponse.id)" -ForegroundColor White
        Write-Host "Test post URL: $($postResponse.link)" -ForegroundColor White
        
        # Clean up test post
        Write-Host "`n🧹 Cleaning up test post..." -ForegroundColor Yellow
        $deleteUrl = "https://veblenincorporated.wordpress.com/wp-json/wp/v2/posts/$($postResponse.id)?force=true"
        $deleteResponse = Invoke-RestMethod -Uri $deleteUrl -Method DELETE -Headers @{
            "Authorization" = "Basic $auth"
        }
        Write-Host "✅ Test post cleaned up successfully" -ForegroundColor Green
        
    } catch {
        Write-Host "⚠️  Connection works but publishing test failed" -ForegroundColor Yellow
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ WordPress.com connection failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nPlease check:" -ForegroundColor Yellow
    Write-Host "1. WordPress.com URL is correct and accessible" -ForegroundColor White
    Write-Host "2. Application Password was created correctly" -ForegroundColor White
    Write-Host "3. Your WordPress.com account has the necessary permissions" -ForegroundColor White
}

Write-Host "`n📖 Next: Test content generation at http://localhost:3000" -ForegroundColor Cyan
