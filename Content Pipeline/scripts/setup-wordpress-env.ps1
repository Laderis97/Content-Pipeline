# WordPress Environment Setup Script
# Helps configure WordPress environment variables for Supabase

param(
    [string]$WordPressUrl = "",
    [string]$WordPressUsername = "",
    [string]$WordPressPassword = "",
    [string]$WordPressApiPath = "/wp-json/wp/v2"
)

# Colors for output
$Colors = @{
    Green = "Green"
    Red = "Red"
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
    White = "White"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Test-WordPressUrl {
    param([string]$Url)
    
    try {
        $uri = [System.Uri]$Url
        return $uri.Scheme -eq "https" -or $uri.Scheme -eq "http"
    }
    catch {
        return $false
    }
}

function Get-UserInput {
    param(
        [string]$Prompt,
        [string]$DefaultValue = "",
        [bool]$IsPassword = $false
    )
    
    if ($IsPassword) {
        $secureString = Read-Host $Prompt -AsSecureString
        $password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString))
        return $password
    } else {
        $input = Read-Host $Prompt
        return if ($input) { $input } else { $DefaultValue }
    }
}

Write-ColorOutput "🚀 WordPress Environment Setup" "Cyan"
Write-ColorOutput "=" * 50 "Blue"
Write-ColorOutput ""

# Get WordPress URL
if (-not $WordPressUrl) {
    Write-ColorOutput "📡 WordPress Site Configuration" "Yellow"
    Write-ColorOutput "Enter your WordPress site details:" "White"
    Write-ColorOutput ""
    
    do {
        $WordPressUrl = Get-UserInput "WordPress Site URL (e.g., https://yoursite.com): "
        if (-not $WordPressUrl) {
            Write-ColorOutput "❌ WordPress URL is required!" "Red"
        } elseif (-not (Test-WordPressUrl $WordPressUrl)) {
            Write-ColorOutput "❌ Invalid URL format. Please include http:// or https://" "Red"
            $WordPressUrl = ""
        }
    } while (-not $WordPressUrl)
} else {
    Write-ColorOutput "📡 Using provided WordPress URL: $WordPressUrl" "Blue"
}

# Get WordPress Username
if (-not $WordPressUsername) {
    do {
        $WordPressUsername = Get-UserInput "WordPress Username (e.g., content-bot): "
        if (-not $WordPressUsername) {
            Write-ColorOutput "❌ WordPress username is required!" "Red"
        }
    } while (-not $WordPressUsername)
} else {
    Write-ColorOutput "👤 Using provided username: $WordPressUsername" "Blue"
}

# Get WordPress Password (Application Password)
if (-not $WordPressPassword) {
    Write-ColorOutput ""
    Write-ColorOutput "🔑 WordPress Application Password" "Yellow"
    Write-ColorOutput "This should be an Application Password, not your regular WordPress password." "White"
    Write-ColorOutput "To create one:" "White"
    Write-ColorOutput "  1. Go to WordPress Admin → Users → Profile" "White"
    Write-ColorOutput "  2. Scroll to 'Application Passwords'" "White"
    Write-ColorOutput "  3. Create a new application password named 'content-pipeline-bot'" "White"
    Write-ColorOutput "  4. Copy the generated password (you won't see it again!)" "White"
    Write-ColorOutput ""
    
    do {
        $WordPressPassword = Get-UserInput "WordPress Application Password: " -IsPassword $true
        if (-not $WordPressPassword) {
            Write-ColorOutput "❌ WordPress application password is required!" "Red"
        }
    } while (-not $WordPressPassword)
} else {
    Write-ColorOutput "🔑 Using provided password: $('*' * $WordPressPassword.Length)" "Blue"
}

# Get API Path (optional)
if (-not $WordPressApiPath) {
    $WordPressApiPath = Get-UserInput "WordPress API Path (default: /wp-json/wp/v2): " "/wp-json/wp/v2"
}

Write-ColorOutput ""
Write-ColorOutput "📋 Configuration Summary" "Cyan"
Write-ColorOutput "=" * 50 "Blue"
Write-ColorOutput "WordPress URL: $WordPressUrl" "White"
Write-ColorOutput "Username: $WordPressUsername" "White"
Write-ColorOutput "Password: $('*' * $WordPressPassword.Length)" "White"
Write-ColorOutput "API Path: $WordPressApiPath" "White"
Write-ColorOutput ""

# Generate environment variables
Write-ColorOutput "🔧 Environment Variables for Supabase" "Yellow"
Write-ColorOutput "Add these to your Supabase project environment variables:" "White"
Write-ColorOutput ""

$envVars = @"
# WordPress Configuration
WORDPRESS_URL=$WordPressUrl
WORDPRESS_USERNAME=$WordPressUsername
WORDPRESS_PASSWORD=$WordPressPassword
WORDPRESS_API_PATH=$WordPressApiPath
"@

Write-ColorOutput $envVars "Green"
Write-ColorOutput ""

# Save to file
$envFile = "wordpress-env-vars.txt"
$envVars | Out-File -FilePath $envFile -Encoding UTF8
Write-ColorOutput "💾 Environment variables saved to: $envFile" "Blue"

# Test connection option
Write-ColorOutput ""
$testConnection = Read-Host "Would you like to test the WordPress connection now? (y/n)"
if ($testConnection -eq "y" -or $testConnection -eq "Y") {
    Write-ColorOutput ""
    Write-ColorOutput "🧪 Testing WordPress Connection..." "Yellow"
    
    # Set environment variables for the test
    $env:WORDPRESS_URL = $WordPressUrl
    $env:WORDPRESS_USERNAME = $WordPressUsername
    $env:WORDPRESS_PASSWORD = $WordPressPassword
    $env:WORDPRESS_API_PATH = $WordPressApiPath
    
    # Run the test script
    try {
        node scripts/test-wordpress-connection.js
    }
    catch {
        Write-ColorOutput "❌ Failed to run connection test: $($_.Exception.Message)" "Red"
        Write-ColorOutput "Make sure Node.js is installed and the test script exists." "Yellow"
    }
}

Write-ColorOutput ""
Write-ColorOutput "✅ WordPress environment setup complete!" "Green"
Write-ColorOutput ""
Write-ColorOutput "📋 Next Steps:" "Cyan"
Write-ColorOutput "1. Add the environment variables to your Supabase project" "White"
Write-ColorOutput "2. Deploy the WordPress integration functions" "White"
Write-ColorOutput "3. Test content publishing to WordPress" "White"
Write-ColorOutput ""
Write-ColorOutput "🔗 Supabase Environment Variables:" "Yellow"
Write-ColorOutput "Go to: Supabase Dashboard → Project Settings → Environment Variables" "White"

