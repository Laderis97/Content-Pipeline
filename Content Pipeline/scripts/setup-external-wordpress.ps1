# External WordPress Setup Script
# This script helps configure the Content Pipeline for external WordPress sites

Write-Host "🔧 External WordPress Setup for Content Pipeline" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Get WordPress details from user
$wordpressUrl = Read-Host "Enter your WordPress site URL (e.g., https://yoursite.com)"
$wordpressUsername = Read-Host "Enter your WordPress username"
$wordpressPassword = Read-Host "Enter your WordPress password (for creating Application Password)"

Write-Host "`n📋 WordPress Configuration Details:" -ForegroundColor Yellow
Write-Host "URL: $wordpressUrl" -ForegroundColor White
Write-Host "Username: $wordpressUsername" -ForegroundColor White

Write-Host "`n🔑 Next Steps:" -ForegroundColor Green
Write-Host "1. Go to your WordPress admin: $wordpressUrl/wp-admin" -ForegroundColor White
Write-Host "2. Navigate to Users > Your Profile" -ForegroundColor White
Write-Host "3. Scroll down to 'Application Passwords'" -ForegroundColor White
Write-Host "4. Create a new Application Password with name Content Pipeline" -ForegroundColor White
Write-Host "5. Copy the generated password (it will look like: xxxx xxxx xxxx xxxx xxxx xxxx)" -ForegroundColor White

$appPassword = Read-Host "`nEnter the Application Password you just created"

# Test the connection
Write-Host "`n🧪 Testing WordPress Connection..." -ForegroundColor Yellow

$testUrl = "$wordpressUrl/wp-json/wp/v2/users/me"
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$wordpressUsername`:$appPassword"))

try {
    $response = Invoke-RestMethod -Uri $testUrl -Headers @{
        "Authorization" = "Basic $auth"
        "Content-Type" = "application/json"
    }
    
    Write-Host "✅ WordPress connection successful!" -ForegroundColor Green
    Write-Host "Connected as: $($response.name)" -ForegroundColor White
    
    # Update Supabase secrets
    Write-Host "`n🔐 Updating Supabase secrets..." -ForegroundColor Yellow
    
    # Set WordPress URL
    supabase secrets set WORDPRESS_URL=$wordpressUrl
    
    # Set WordPress username
    supabase secrets set WORDPRESS_USERNAME=$wordpressUsername
    
    # Set WordPress password (Application Password)
    supabase secrets set WORDPRESS_PASSWORD=$appPassword
    
    # Set WordPress API path
    supabase secrets set WORDPRESS_API_PATH="/wp-json/wp/v2"
    
    Write-Host "✅ Supabase secrets updated successfully!" -ForegroundColor Green
    
    Write-Host "`n🎉 External WordPress setup complete!" -ForegroundColor Green
    Write-Host "You can now use the Content Pipeline to publish to: $wordpressUrl" -ForegroundColor White
    
} catch {
    Write-Host "❌ WordPress connection failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nPlease check:" -ForegroundColor Yellow
    Write-Host "1. WordPress URL is correct and accessible" -ForegroundColor White
    Write-Host "2. Application Password was created correctly" -ForegroundColor White
    Write-Host "3. WordPress REST API is enabled" -ForegroundColor White
}

Write-Host "`n📖 Next: Test content generation at http://localhost:3000" -ForegroundColor Cyan