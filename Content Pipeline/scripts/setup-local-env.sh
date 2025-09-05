#!/bin/bash

# Local Environment Setup Script
# This script helps set up the local development environment

echo "Setting up local development environment..."

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    cat > .env.local << 'EOF'
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
EOF
    echo "✅ Created .env.local file"
else
    echo "✅ .env.local file already exists"
fi

# Create .env.example file
echo "Creating .env.example file..."
cat > .env.example << 'EOF'
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
EOF
echo "✅ Created .env.example file"

# Update .gitignore to ensure .env.local is ignored
if [ -f .gitignore ]; then
    if ! grep -q "\.env\.local" .gitignore; then
        echo "" >> .gitignore
        echo "# Local environment files" >> .gitignore
        echo ".env.local" >> .gitignore
        echo ".env.development" >> .gitignore
        echo ".env.staging" >> .gitignore
        echo ".env.production" >> .gitignore
        echo "✅ Updated .gitignore to ignore environment files"
    else
        echo "✅ .gitignore already includes environment files"
    fi
else
    echo "Creating .gitignore file..."
    cat > .gitignore << 'EOF'
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
EOF
    echo "✅ Created .gitignore file"
fi

echo ""
echo "🎉 Local environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local and fill in your actual API keys and configuration"
echo "2. Install Docker Desktop for local Supabase development"
echo "3. Run 'npx supabase start' to start local development environment"
echo ""
echo "Required API keys to configure:"
echo "- OpenAI API key (get from https://platform.openai.com/api-keys)"
echo "- WordPress credentials (create application password in WordPress admin)"
echo "- Supabase keys (already configured for remote project)"
