# Local Environment Setup Script (PowerShell)
# This script helps set up the local development environment

Write-Host "Setting up local development environment..." -ForegroundColor Green

# Create .env.local file if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    @"
# Local Development Environment Variables
# This file is for local development only - DO NOT commit to version control

# Environment
ENVIRONMENT=development
LOG_LEVEL=debug
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true

# Supabase Configuration (Replace with your actual values)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI Configuration (Replace with your actual API key)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# WordPress Configuration (Replace with your actual WordPress details)
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=content-bot
WORDPRESS_PASSWORD=your-wordpress-application-password
WORDPRESS_API_PATH=/wp-json/wp/v2

# Content Configuration
DEFAULT_WORD_COUNT=700
MIN_WORD_COUNT=600
MAX_WORD_COUNT=800
DEFAULT_MODEL=gpt-4

# Rate Limiting Configuration (Development - Lower limits)
OPENAI_RATE_LIMIT=30
WORDPRESS_RATE_LIMIT=50
API_RATE_LIMIT=500

# Retry Configuration
MAX_RETRIES=3
RETRY_DELAY_MS=1000
RETRY_BACKOFF_MULTIPLIER=2

# Timeout Configuration
OPENAI_TIMEOUT_MS=30000
WORDPRESS_TIMEOUT_MS=10000
FUNCTION_TIMEOUT_MS=300000

# Security Configuration
ENABLE_CORS=true
ALLOWED_ORIGINS=*
ENABLE_RATE_LIMITING=true
ENABLE_AUTH=true
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Created .env.local file" -ForegroundColor Green
} else {
    Write-Host "✅ .env.local file already exists" -ForegroundColor Green
}

# Create .env.example file
Write-Host "Creating .env.example file..." -ForegroundColor Yellow
@"
# Environment Variables Template
# Copy this file to .env.local and fill in your actual values
# DO NOT commit .env.local to version control

# Environment
ENVIRONMENT=development
LOG_LEVEL=debug
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# WordPress Configuration
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=content-bot
WORDPRESS_PASSWORD=your-wordpress-application-password
WORDPRESS_API_PATH=/wp-json/wp/v2

# Content Configuration
DEFAULT_WORD_COUNT=700
MIN_WORD_COUNT=600
MAX_WORD_COUNT=800
DEFAULT_MODEL=gpt-4

# Rate Limiting Configuration
OPENAI_RATE_LIMIT=30
WORDPRESS_RATE_LIMIT=50
API_RATE_LIMIT=500

# Retry Configuration
MAX_RETRIES=3
RETRY_DELAY_MS=1000
RETRY_BACKOFF_MULTIPLIER=2

# Timeout Configuration
OPENAI_TIMEOUT_MS=30000
WORDPRESS_TIMEOUT_MS=10000
FUNCTION_TIMEOUT_MS=300000

# Security Configuration
ENABLE_CORS=true
ALLOWED_ORIGINS=*
ENABLE_RATE_LIMITING=true
ENABLE_AUTH=true
"@ | Out-File -FilePath ".env.example" -Encoding UTF8
Write-Host "✅ Created .env.example file" -ForegroundColor Green

# Update .gitignore to ensure .env.local is ignored
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -notmatch "\.env\.local") {
        Add-Content ".gitignore" ""
        Add-Content ".gitignore" "# Local environment files"
        Add-Content ".gitignore" ".env.local"
        Add-Content ".gitignore" ".env.development"
        Add-Content ".gitignore" ".env.staging"
        Add-Content ".gitignore" ".env.production"
        Write-Host "✅ Updated .gitignore to ignore environment files" -ForegroundColor Green
    } else {
        Write-Host "✅ .gitignore already includes environment files" -ForegroundColor Green
    }
} else {
    Write-Host "Creating .gitignore file..." -ForegroundColor Yellow
    @"
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env.local
.env.development
.env.staging
.env.production

# Build outputs
dist/
build/
.next/
out/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Temporary folders
tmp/
temp/
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
    Write-Host "✅ Created .gitignore file" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Local environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit .env.local and fill in your actual API keys and configuration" -ForegroundColor White
Write-Host "2. Install Docker Desktop for local Supabase development" -ForegroundColor White
Write-Host "3. Run 'npx supabase start' to start local development environment" -ForegroundColor White
Write-Host ""
Write-Host "Required API keys to configure:" -ForegroundColor Yellow
Write-Host "- OpenAI API key (get from https://platform.openai.com/api-keys)" -ForegroundColor White
Write-Host "- WordPress credentials (create application password in WordPress admin)" -ForegroundColor White
Write-Host "- Supabase keys (already configured for remote project)" -ForegroundColor White
