#!/bin/bash

# Content Pipeline Setup Script
# PRD Reference: Configuration & Deployment (6.4), Performance & Scalability (F1-F3)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="content-pipeline"
ENVIRONMENT="${ENVIRONMENT:-development}"
SKIP_DEPS="${SKIP_DEPS:-false}"
SKIP_SUPABASE="${SKIP_SUPABASE:-false}"
SKIP_CONFIG="${SKIP_CONFIG:-false}"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if we're on the right platform
check_platform() {
    print_status "Checking platform compatibility..."
    
    case "$(uname -s)" in
        Linux*)
            PLATFORM="linux"
            print_success "Running on Linux"
            ;;
        Darwin*)
            PLATFORM="macos"
            print_success "Running on macOS"
            ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*)
            PLATFORM="windows"
            print_success "Running on Windows"
            ;;
        *)
            print_error "Unsupported platform: $(uname -s)"
            exit 1
            ;;
    esac
}

# Function to install dependencies
install_dependencies() {
    if [ "$SKIP_DEPS" = "true" ]; then
        print_warning "Skipping dependency installation as requested"
        return 0
    fi
    
    print_status "Installing dependencies..."
    
    # Check if Node.js is installed
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18 or later."
        print_status "Visit: https://nodejs.org/"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or later is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js version: $(node --version)"
    
    # Check if npm is installed
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    print_success "npm version: $(npm --version)"
    
    # Install project dependencies
    print_status "Installing project dependencies..."
    if [ -f "package.json" ]; then
        npm install
        print_success "Project dependencies installed"
    else
        print_warning "No package.json found, skipping npm install"
    fi
    
    # Check if Deno is installed
    if ! command_exists deno; then
        print_warning "Deno is not installed. Installing Deno..."
        
        case "$PLATFORM" in
            linux|macos)
                curl -fsSL https://deno.land/install.sh | sh
                export PATH="$HOME/.deno/bin:$PATH"
                ;;
            windows)
                print_error "Please install Deno manually on Windows: https://deno.land/manual/getting_started/installation"
                exit 1
                ;;
        esac
        
        print_success "Deno installed"
    else
        print_success "Deno version: $(deno --version)"
    fi
    
    # Check if Supabase CLI is installed
    if ! command_exists supabase; then
        print_warning "Supabase CLI is not installed. Installing Supabase CLI..."
        
        case "$PLATFORM" in
            linux|macos)
                npm install -g supabase
                ;;
            windows)
                print_error "Please install Supabase CLI manually on Windows: https://supabase.com/docs/guides/cli"
                exit 1
                ;;
        esac
        
        print_success "Supabase CLI installed"
    else
        print_success "Supabase CLI version: $(supabase --version)"
    fi
    
    # Check if Git is installed
    if ! command_exists git; then
        print_error "Git is not installed. Please install Git."
        exit 1
    fi
    
    print_success "Git version: $(git --version)"
}

# Function to setup Supabase
setup_supabase() {
    if [ "$SKIP_SUPABASE" = "true" ]; then
        print_warning "Skipping Supabase setup as requested"
        return 0
    fi
    
    print_status "Setting up Supabase..."
    
    # Check if we're in a Supabase project
    if [ ! -f "supabase/config.toml" ]; then
        print_warning "No Supabase project found. Initializing Supabase project..."
        supabase init
        print_success "Supabase project initialized"
    else
        print_success "Supabase project already exists"
    fi
    
    # Check if Supabase is running locally
    if ! supabase status > /dev/null 2>&1; then
        print_status "Starting Supabase locally..."
        supabase start
        print_success "Supabase started locally"
    else
        print_success "Supabase is already running locally"
    fi
    
    # Apply database migrations
    print_status "Applying database migrations..."
    if [ -d "supabase/migrations" ]; then
        supabase db reset
        print_success "Database migrations applied"
    else
        print_warning "No migrations found"
    fi
    
    # Deploy Edge Functions locally
    print_status "Deploying Edge Functions locally..."
    if [ -d "supabase/functions" ]; then
        for func in supabase/functions/*/; do
            if [ -f "$func/index.ts" ]; then
                local func_name=$(basename "$func")
                print_status "Deploying function: $func_name"
                supabase functions deploy "$func_name" --no-verify-jwt
            fi
        done
        print_success "Edge Functions deployed locally"
    else
        print_warning "No Edge Functions found"
    fi
}

# Function to setup configuration
setup_configuration() {
    if [ "$SKIP_CONFIG" = "true" ]; then
        print_warning "Skipping configuration setup as requested"
        return 0
    fi
    
    print_status "Setting up configuration..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_status "Creating .env file..."
        cat > .env << EOF
# Content Pipeline Environment Variables
# Copy this file to .env.local and fill in your values

# Supabase Configuration
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# WordPress Configuration
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=content-bot
WORDPRESS_PASSWORD=your-wordpress-password-here

# Environment
ENVIRONMENT=development
EOF
        print_success ".env file created"
    else
        print_success ".env file already exists"
    fi
    
    # Create .env.local file if it doesn't exist
    if [ ! -f ".env.local" ]; then
        print_status "Creating .env.local file..."
        cp .env .env.local
        print_success ".env.local file created"
        print_warning "Please edit .env.local with your actual values"
    else
        print_success ".env.local file already exists"
    fi
    
    # Check if required environment variables are set
    print_status "Checking environment variables..."
    
    local required_vars=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "OPENAI_API_KEY"
        "WORDPRESS_URL"
        "WORDPRESS_USERNAME"
        "WORDPRESS_PASSWORD"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_warning "Missing environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        print_warning "Please set these variables in your .env.local file"
    else
        print_success "All required environment variables are set"
    fi
}

# Function to setup Git hooks
setup_git_hooks() {
    print_status "Setting up Git hooks..."
    
    # Create pre-commit hook
    if [ ! -f ".git/hooks/pre-commit" ]; then
        print_status "Creating pre-commit hook..."
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Pre-commit hook for Content Pipeline
echo "Running pre-commit checks..."

# Check for hardcoded secrets
if grep -r "sk-" supabase/functions/; then
    echo "ERROR: Hardcoded OpenAI API key found"
    exit 1
fi

if grep -r "password.*=" supabase/functions/; then
    echo "ERROR: Hardcoded password found"
    exit 1
fi

# Check TypeScript compilation
if command -v npx >/dev/null 2>&1; then
    npx tsc --noEmit
    if [ $? -ne 0 ]; then
        echo "ERROR: TypeScript compilation failed"
        exit 1
    fi
fi

echo "Pre-commit checks passed"
EOF
        chmod +x .git/hooks/pre-commit
        print_success "Pre-commit hook created"
    else
        print_success "Pre-commit hook already exists"
    fi
    
    # Create pre-push hook
    if [ ! -f ".git/hooks/pre-push" ]; then
        print_status "Creating pre-push hook..."
        cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash

# Pre-push hook for Content Pipeline
echo "Running pre-push checks..."

# Check for hardcoded secrets
if grep -r "sk-" supabase/functions/; then
    echo "ERROR: Hardcoded OpenAI API key found"
    exit 1
fi

if grep -r "password.*=" supabase/functions/; then
    echo "ERROR: Hardcoded password found"
    exit 1
fi

# Check TypeScript compilation
if command -v npx >/dev/null 2>&1; then
    npx tsc --noEmit
    if [ $? -ne 0 ]; then
        echo "ERROR: TypeScript compilation failed"
        exit 1
    fi
fi

# Check Edge Function syntax
if command -v deno >/dev/null 2>&1; then
    for func in supabase/functions/*/; do
        if [ -f "$func/index.ts" ]; then
            echo "Checking $(basename "$func")..."
            deno check "$func/index.ts"
            if [ $? -ne 0 ]; then
                echo "ERROR: Edge Function syntax error in $(basename "$func")"
                exit 1
            fi
        fi
    done
fi

echo "Pre-push checks passed"
EOF
        chmod +x .git/hooks/pre-push
        print_success "Pre-push hook created"
    else
        print_success "Pre-push hook already exists"
    fi
}

# Function to setup development tools
setup_dev_tools() {
    print_status "Setting up development tools..."
    
    # Create VS Code settings if .vscode doesn't exist
    if [ ! -d ".vscode" ]; then
        print_status "Creating VS Code settings..."
        mkdir -p .vscode
        
        cat > .vscode/settings.json << 'EOF'
{
    "typescript.preferences.importModuleSpecifier": "relative",
    "deno.enable": true,
    "deno.lint": true,
    "deno.unstable": true,
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll": true
    },
    "files.associations": {
        "*.ts": "typescript"
    }
}
EOF
        
        cat > .vscode/extensions.json << 'EOF'
{
    "recommendations": [
        "denoland.vscode-deno",
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode"
    ]
}
EOF
        
        print_success "VS Code settings created"
    else
        print_success "VS Code settings already exist"
    fi
    
    # Create .gitignore if it doesn't exist
    if [ ! -f ".gitignore" ]; then
        print_status "Creating .gitignore..."
        cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Supabase
.supabase/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
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

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Temporary folders
tmp/
temp/
EOF
        print_success ".gitignore created"
    else
        print_success ".gitignore already exists"
    fi
}

# Function to run initial tests
run_initial_tests() {
    print_status "Running initial tests..."
    
    # Test TypeScript compilation
    if command -v npx >/dev/null 2>&1; then
        print_status "Testing TypeScript compilation..."
        npx tsc --noEmit
        if [ $? -eq 0 ]; then
            print_success "TypeScript compilation passed"
        else
            print_error "TypeScript compilation failed"
            exit 1
        fi
    fi
    
    # Test Edge Function syntax
    if command -v deno >/dev/null 2>&1; then
        print_status "Testing Edge Function syntax..."
        for func in supabase/functions/*/; do
            if [ -f "$func/index.ts" ]; then
                echo "Testing $(basename "$func")..."
                deno check "$func/index.ts"
                if [ $? -ne 0 ]; then
                    print_error "Edge Function syntax error in $(basename "$func")"
                    exit 1
                fi
            fi
        done
        print_success "Edge Function syntax tests passed"
    fi
    
    # Test deployment scripts
    print_status "Testing deployment scripts..."
    if [ -f "scripts/deploy.sh" ]; then
        bash -n scripts/deploy.sh
        if [ $? -eq 0 ]; then
            print_success "Deploy script syntax passed"
        else
            print_error "Deploy script syntax failed"
            exit 1
        fi
    fi
    
    if [ -f "scripts/rollback.sh" ]; then
        bash -n scripts/rollback.sh
        if [ $? -eq 0 ]; then
            print_success "Rollback script syntax passed"
        else
            print_error "Rollback script syntax failed"
            exit 1
        fi
    fi
    
    print_success "All initial tests passed"
}

# Function to show setup summary
show_summary() {
    print_status "Setup Summary"
    echo "=============="
    echo "Project: $PROJECT_NAME"
    echo "Environment: $ENVIRONMENT"
    echo "Platform: $PLATFORM"
    echo ""
    echo "Installed components:"
    echo "  ✅ Dependencies"
    echo "  ✅ Supabase (local)"
    echo "  ✅ Configuration"
    echo "  ✅ Git hooks"
    echo "  ✅ Development tools"
    echo "  ✅ Initial tests"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env.local with your actual values"
    echo "2. Run 'supabase start' to start local development"
    echo "3. Run 'npm run dev' to start development server"
    echo "4. Visit http://localhost:54321 to access Supabase Studio"
    echo "5. Test your Edge Functions at http://localhost:54321/functions/v1/"
    echo ""
    echo "Useful commands:"
    echo "  supabase start          # Start Supabase locally"
    echo "  supabase stop           # Stop Supabase locally"
    echo "  supabase status         # Check Supabase status"
    echo "  supabase db reset       # Reset database"
    echo "  supabase functions deploy <name>  # Deploy function"
    echo "  npm run test            # Run tests"
    echo "  npm run deploy          # Deploy to production"
    echo ""
    print_success "Setup completed successfully!"
}

# Function to show help
show_help() {
    echo "Content Pipeline Setup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (default: development)"
    echo "  -d, --skip-deps         Skip dependency installation"
    echo "  -s, --skip-supabase     Skip Supabase setup"
    echo "  -c, --skip-config       Skip configuration setup"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT             Set environment (development, staging, production)"
    echo "  SKIP_DEPS              Skip dependency installation"
    echo "  SKIP_SUPABASE          Skip Supabase setup"
    echo "  SKIP_CONFIG            Skip configuration setup"
    echo ""
    echo "Examples:"
    echo "  $0                      # Full setup"
    echo "  $0 -d                  # Skip dependency installation"
    echo "  $0 -s -c               # Skip Supabase and configuration setup"
    echo "  $0 -e production       # Setup for production environment"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--skip-deps)
            SKIP_DEPS="true"
            shift
            ;;
        -s|--skip-supabase)
            SKIP_SUPABASE="true"
            shift
            ;;
        -c|--skip-config)
            SKIP_CONFIG="true"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main setup process
main() {
    print_status "Starting Content Pipeline setup..."
    print_status "Environment: $ENVIRONMENT"
    
    # Check platform
    check_platform
    
    # Install dependencies
    install_dependencies
    
    # Setup Supabase
    setup_supabase
    
    # Setup configuration
    setup_configuration
    
    # Setup Git hooks
    setup_git_hooks
    
    # Setup development tools
    setup_dev_tools
    
    # Run initial tests
    run_initial_tests
    
    # Show summary
    show_summary
}

# Run main function
main "$@"
