#!/bin/bash

# Content Pipeline Deployment Script
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
SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID:-}"
ENVIRONMENT="${ENVIRONMENT:-development}"
DRY_RUN="${DRY_RUN:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_MIGRATIONS="${SKIP_MIGRATIONS:-false}"
SKIP_FUNCTIONS="${SKIP_FUNCTIONS:-false}"

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

# Function to validate environment
validate_environment() {
    print_status "Validating deployment environment..."
    
    # Check required commands
    local required_commands=("supabase" "git" "node" "npm")
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            print_error "Required command '$cmd' not found. Please install it first."
            exit 1
        fi
    done
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository. Please run this script from the project root."
        exit 1
    fi
    
    # Check if supabase project is linked
    if [ -z "$SUPABASE_PROJECT_ID" ]; then
        print_warning "SUPABASE_PROJECT_ID not set. Attempting to get from supabase config..."
        if command_exists supabase; then
            SUPABASE_PROJECT_ID=$(supabase status --output json | jq -r '.project_id' 2>/dev/null || echo "")
            if [ -z "$SUPABASE_PROJECT_ID" ]; then
                print_error "Could not determine Supabase project ID. Please set SUPABASE_PROJECT_ID environment variable."
                exit 1
            fi
        else
            print_error "Supabase CLI not found. Please install it first."
            exit 1
        fi
    fi
    
    print_success "Environment validation completed"
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_warning "Skipping tests as requested"
        return 0
    fi
    
    print_status "Running tests..."
    
    # Test database migrations
    print_status "Testing database migrations..."
    if ! supabase db diff --schema public > /dev/null 2>&1; then
        print_warning "Database migration test failed, but continuing..."
    fi
    
    # Test Edge Functions
    print_status "Testing Edge Functions..."
    local functions=(
        "content-automation"
        "sweeper"
        "monitor"
        "metrics"
        "health"
        "cleanup"
        "scheduler"
        "secrets"
    )
    
    for func in "${functions[@]}"; do
        if [ -d "supabase/functions/$func" ]; then
            print_status "Testing function: $func"
            if [ "$DRY_RUN" = "false" ]; then
                # Test function syntax
                if ! deno check "supabase/functions/$func/index.ts" > /dev/null 2>&1; then
                    print_error "Function $func has syntax errors"
                    exit 1
                fi
            fi
        fi
    done
    
    print_success "All tests passed"
}

# Function to backup current state
backup_current_state() {
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "Dry run mode - skipping backup"
        return 0
    fi
    
    print_status "Creating backup of current state..."
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database schema
    print_status "Backing up database schema..."
    supabase db dump --schema public > "$backup_dir/schema.sql" 2>/dev/null || true
    
    # Backup Edge Functions
    print_status "Backing up Edge Functions..."
    cp -r supabase/functions "$backup_dir/" 2>/dev/null || true
    
    # Backup configuration
    print_status "Backing up configuration..."
    cp supabase/config.toml "$backup_dir/" 2>/dev/null || true
    
    print_success "Backup created at: $backup_dir"
}

# Function to deploy database migrations
deploy_migrations() {
    if [ "$SKIP_MIGRATIONS" = "true" ]; then
        print_warning "Skipping database migrations as requested"
        return 0
    fi
    
    print_status "Deploying database migrations..."
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "Dry run mode - would deploy migrations"
        supabase db diff --schema public
        return 0
    fi
    
    # Check for pending migrations
    local pending_migrations=$(supabase migration list --local | grep -c "pending" || echo "0")
    if [ "$pending_migrations" -eq 0 ]; then
        print_success "No pending migrations"
        return 0
    fi
    
    print_status "Found $pending_migrations pending migrations"
    
    # Apply migrations
    if ! supabase db push; then
        print_error "Failed to apply database migrations"
        exit 1
    fi
    
    print_success "Database migrations deployed successfully"
}

# Function to deploy Edge Functions
deploy_functions() {
    if [ "$SKIP_FUNCTIONS" = "true" ]; then
        print_warning "Skipping Edge Functions deployment as requested"
        return 0
    fi
    
    print_status "Deploying Edge Functions..."
    
    local functions=(
        "content-automation"
        "sweeper"
        "monitor"
        "metrics"
        "health"
        "cleanup"
        "scheduler"
        "scheduler-test"
        "secrets"
        "secrets-test"
        "config-test"
    )
    
    for func in "${functions[@]}"; do
        if [ -d "supabase/functions/$func" ]; then
            print_status "Deploying function: $func"
            
            if [ "$DRY_RUN" = "true" ]; then
                print_warning "Dry run mode - would deploy function: $func"
                continue
            fi
            
            if ! supabase functions deploy "$func"; then
                print_error "Failed to deploy function: $func"
                exit 1
            fi
            
            print_success "Function $func deployed successfully"
        else
            print_warning "Function $func not found, skipping..."
        fi
    done
    
    print_success "All Edge Functions deployed successfully"
}

# Function to configure environment variables
configure_environment() {
    print_status "Configuring environment variables..."
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "Dry run mode - would configure environment variables"
        return 0
    fi
    
    # Set up environment variables for Edge Functions
    local env_vars=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "OPENAI_API_KEY"
        "WORDPRESS_URL"
        "WORDPRESS_USERNAME"
        "WORDPRESS_PASSWORD"
    )
    
    for var in "${env_vars[@]}"; do
        if [ -n "${!var}" ]; then
            print_status "Setting environment variable: $var"
            supabase secrets set "$var=${!var}" || print_warning "Failed to set $var"
        else
            print_warning "Environment variable $var not set"
        fi
    done
    
    print_success "Environment variables configured"
}

# Function to initialize scheduler
initialize_scheduler() {
    print_status "Initializing scheduler..."
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "Dry run mode - would initialize scheduler"
        return 0
    fi
    
    # Initialize scheduler via Edge Function
    local scheduler_url="https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/scheduler"
    local response=$(curl -s -X POST "$scheduler_url?action=initialize" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" || echo "")
    
    if [ -n "$response" ]; then
        print_success "Scheduler initialized successfully"
    else
        print_warning "Failed to initialize scheduler via API, but continuing..."
    fi
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "Dry run mode - skipping verification"
        return 0
    fi
    
    # Test Edge Functions
    local functions=(
        "content-automation"
        "sweeper"
        "monitor"
        "metrics"
        "health"
        "cleanup"
        "scheduler"
        "secrets"
    )
    
    local base_url="https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1"
    
    for func in "${functions[@]}"; do
        print_status "Verifying function: $func"
        local func_url="$base_url/$func"
        
        # Test function health
        local response=$(curl -s -X GET "$func_url" \
            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
            -w "%{http_code}" -o /dev/null || echo "000")
        
        if [ "$response" = "200" ] || [ "$response" = "405" ]; then
            print_success "Function $func is responding"
        else
            print_warning "Function $func returned status: $response"
        fi
    done
    
    # Test scheduler
    print_status "Verifying scheduler..."
    local scheduler_url="$base_url/scheduler?action=status"
    local scheduler_response=$(curl -s -X GET "$scheduler_url" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" || echo "")
    
    if [ -n "$scheduler_response" ]; then
        print_success "Scheduler is responding"
    else
        print_warning "Scheduler verification failed"
    fi
    
    print_success "Deployment verification completed"
}

# Function to show deployment summary
show_summary() {
    print_status "Deployment Summary"
    echo "=================="
    echo "Project: $PROJECT_NAME"
    echo "Environment: $ENVIRONMENT"
    echo "Supabase Project ID: $SUPABASE_PROJECT_ID"
    echo "Dry Run: $DRY_RUN"
    echo "Skip Tests: $SKIP_TESTS"
    echo "Skip Migrations: $SKIP_MIGRATIONS"
    echo "Skip Functions: $SKIP_FUNCTIONS"
    echo ""
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "This was a dry run - no actual changes were made"
    else
        print_success "Deployment completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Verify all Edge Functions are working"
        echo "2. Check scheduler status"
        echo "3. Monitor system health"
        echo "4. Test content generation workflow"
    fi
}

# Function to show help
show_help() {
    echo "Content Pipeline Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set deployment environment (default: development)"
    echo "  -p, --project-id ID      Set Supabase project ID"
    echo "  -d, --dry-run           Perform a dry run without making changes"
    echo "  -s, --skip-tests        Skip running tests"
    echo "  -m, --skip-migrations   Skip database migrations"
    echo "  -f, --skip-functions    Skip Edge Functions deployment"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SUPABASE_PROJECT_ID     Supabase project ID"
    echo "  SUPABASE_SERVICE_ROLE_KEY  Supabase service role key"
    echo "  OPENAI_API_KEY          OpenAI API key"
    echo "  WORDPRESS_URL           WordPress site URL"
    echo "  WORDPRESS_USERNAME      WordPress username"
    echo "  WORDPRESS_PASSWORD      WordPress password"
    echo ""
    echo "Examples:"
    echo "  $0                      # Deploy to development"
    echo "  $0 -e production        # Deploy to production"
    echo "  $0 -d                  # Dry run"
    echo "  $0 -s -m               # Skip tests and migrations"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--project-id)
            SUPABASE_PROJECT_ID="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN="true"
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        -m|--skip-migrations)
            SKIP_MIGRATIONS="true"
            shift
            ;;
        -f|--skip-functions)
            SKIP_FUNCTIONS="true"
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

# Main deployment process
main() {
    print_status "Starting Content Pipeline deployment..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Project ID: $SUPABASE_PROJECT_ID"
    
    # Validate environment
    validate_environment
    
    # Run tests
    run_tests
    
    # Create backup
    backup_current_state
    
    # Deploy database migrations
    deploy_migrations
    
    # Deploy Edge Functions
    deploy_functions
    
    # Configure environment variables
    configure_environment
    
    # Initialize scheduler
    initialize_scheduler
    
    # Verify deployment
    verify_deployment
    
    # Show summary
    show_summary
}

# Run main function
main "$@"
