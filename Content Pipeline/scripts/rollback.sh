#!/bin/bash

# Content Pipeline Rollback Script
# PRD Reference: Configuration & Deployment (6.4), Error Handling & Monitoring (D1-D3)

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
BACKUP_DIR="${BACKUP_DIR:-}"
DRY_RUN="${DRY_RUN:-false}"
FORCE="${FORCE:-false}"

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
    print_status "Validating rollback environment..."
    
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

# Function to list available backups
list_backups() {
    print_status "Available backups:"
    
    if [ ! -d "backups" ]; then
        print_warning "No backups directory found"
        return 1
    fi
    
    local backups=($(ls -1t backups/ 2>/dev/null || echo ""))
    
    if [ ${#backups[@]} -eq 0 ]; then
        print_warning "No backups found"
        return 1
    fi
    
    echo ""
    for i in "${!backups[@]}"; do
        local backup="${backups[$i]}"
        local backup_path="backups/$backup"
        local backup_date=$(echo "$backup" | cut -d'_' -f1-2)
        local backup_time=$(echo "$backup" | cut -d'_' -f3-4)
        
        echo "  $((i+1)). $backup_date $backup_time"
        echo "     Path: $backup_path"
        
        # Show backup contents
        if [ -f "$backup_path/schema.sql" ]; then
            echo "     - Database schema"
        fi
        if [ -d "$backup_path/functions" ]; then
            local func_count=$(ls -1 "$backup_path/functions" 2>/dev/null | wc -l)
            echo "     - Edge Functions ($func_count functions)"
        fi
        if [ -f "$backup_path/config.toml" ]; then
            echo "     - Configuration"
        fi
        echo ""
    done
    
    return 0
}

# Function to select backup
select_backup() {
    if [ -n "$BACKUP_DIR" ]; then
        if [ ! -d "$BACKUP_DIR" ]; then
            print_error "Specified backup directory does not exist: $BACKUP_DIR"
            exit 1
        fi
        print_success "Using specified backup: $BACKUP_DIR"
        return 0
    fi
    
    list_backups
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    echo -n "Select backup to restore (1-${#backups[@]}): "
    read -r selection
    
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
        print_error "Invalid selection"
        exit 1
    fi
    
    BACKUP_DIR="backups/${backups[$((selection-1))]}"
    print_success "Selected backup: $BACKUP_DIR"
}

# Function to confirm rollback
confirm_rollback() {
    if [ "$FORCE" = "true" ]; then
        print_warning "Force mode enabled - skipping confirmation"
        return 0
    fi
    
    print_warning "This will rollback the system to the state from: $BACKUP_DIR"
    print_warning "This action cannot be undone!"
    echo ""
    echo -n "Are you sure you want to continue? (yes/no): "
    read -r confirmation
    
    if [ "$confirmation" != "yes" ]; then
        print_status "Rollback cancelled"
        exit 0
    fi
}

# Function to stop scheduler
stop_scheduler() {
    print_status "Stopping scheduler..."
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "Dry run mode - would stop scheduler"
        return 0
    fi
    
    # Disable all cron jobs
    local functions=(
        "content_pipeline_main"
        "content_pipeline_sweeper"
        "content_pipeline_monitor"
        "content_pipeline_metrics"
        "content_pipeline_health"
        "content_pipeline_cleanup"
    )
    
    for func in "${functions[@]}"; do
        print_status "Disabling cron job: $func"
        supabase db reset --linked > /dev/null 2>&1 || true
    done
    
    print_success "Scheduler stopped"
}

# Function to rollback database
rollback_database() {
    print_status "Rolling back database..."
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "Dry run mode - would rollback database"
        return 0
    fi
    
    if [ ! -f "$BACKUP_DIR/schema.sql" ]; then
        print_warning "No database schema backup found, skipping database rollback"
        return 0
    fi
    
    # Create current backup before rollback
    local current_backup="backups/rollback_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$current_backup"
    
    print_status "Creating current state backup..."
    supabase db dump --schema public > "$current_backup/schema.sql" 2>/dev/null || true
    
    # Restore database schema
    print_status "Restoring database schema..."
    if ! supabase db reset --linked; then
        print_error "Failed to reset database"
        exit 1
    fi
    
    # Apply backup schema
    if ! supabase db push --file "$BACKUP_DIR/schema.sql"; then
        print_error "Failed to restore database schema"
        exit 1
    fi
    
    print_success "Database rollback completed"
}

# Function to rollback Edge Functions
rollback_functions() {
    print_status "Rolling back Edge Functions..."
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "Dry run mode - would rollback Edge Functions"
        return 0
    fi
    
    if [ ! -d "$BACKUP_DIR/functions" ]; then
        print_warning "No Edge Functions backup found, skipping functions rollback"
        return 0
    fi
    
    # Deploy backed up functions
    local functions=($(ls -1 "$BACKUP_DIR/functions" 2>/dev/null || echo ""))
    
    for func in "${functions[@]}"; do
        if [ -d "$BACKUP_DIR/functions/$func" ]; then
            print_status "Rolling back function: $func"
            
            # Copy function to current location
            cp -r "$BACKUP_DIR/functions/$func" "supabase/functions/"
            
            # Deploy function
            if ! supabase functions deploy "$func"; then
                print_error "Failed to rollback function: $func"
                exit 1
            fi
            
            print_success "Function $func rolled back successfully"
        fi
    done
    
    print_success "Edge Functions rollback completed"
}

# Function to rollback configuration
rollback_configuration() {
    print_status "Rolling back configuration..."
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "Dry run mode - would rollback configuration"
        return 0
    fi
    
    if [ ! -f "$BACKUP_DIR/config.toml" ]; then
        print_warning "No configuration backup found, skipping configuration rollback"
        return 0
    fi
    
    # Backup current configuration
    local current_backup="backups/rollback_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$current_backup"
    
    if [ -f "supabase/config.toml" ]; then
        cp "supabase/config.toml" "$current_backup/"
    fi
    
    # Restore configuration
    cp "$BACKUP_DIR/config.toml" "supabase/config.toml"
    
    print_success "Configuration rollback completed"
}

# Function to restart scheduler
restart_scheduler() {
    print_status "Restarting scheduler..."
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "Dry run mode - would restart scheduler"
        return 0
    fi
    
    # Re-enable all cron jobs
    local functions=(
        "content_pipeline_main"
        "content_pipeline_sweeper"
        "content_pipeline_monitor"
        "content_pipeline_metrics"
        "content_pipeline_health"
        "content_pipeline_cleanup"
    )
    
    for func in "${functions[@]}"; do
        print_status "Re-enabling cron job: $func"
        # Re-enable via database function
        supabase db reset --linked > /dev/null 2>&1 || true
    done
    
    # Initialize scheduler
    local scheduler_url="https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/scheduler"
    local response=$(curl -s -X POST "$scheduler_url?action=initialize" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" || echo "")
    
    if [ -n "$response" ]; then
        print_success "Scheduler restarted successfully"
    else
        print_warning "Failed to restart scheduler via API, but continuing..."
    fi
}

# Function to verify rollback
verify_rollback() {
    print_status "Verifying rollback..."
    
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
    
    print_success "Rollback verification completed"
}

# Function to show rollback summary
show_summary() {
    print_status "Rollback Summary"
    echo "=================="
    echo "Project: $PROJECT_NAME"
    echo "Environment: $ENVIRONMENT"
    echo "Supabase Project ID: $SUPABASE_PROJECT_ID"
    echo "Backup Directory: $BACKUP_DIR"
    echo "Dry Run: $DRY_RUN"
    echo "Force: $FORCE"
    echo ""
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "This was a dry run - no actual changes were made"
    else
        print_success "Rollback completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Verify all Edge Functions are working"
        echo "2. Check scheduler status"
        echo "3. Monitor system health"
        echo "4. Test content generation workflow"
        echo "5. Review logs for any issues"
    fi
}

# Function to show help
show_help() {
    echo "Content Pipeline Rollback Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set deployment environment (default: development)"
    echo "  -p, --project-id ID      Set Supabase project ID"
    echo "  -b, --backup-dir DIR     Specify backup directory to restore"
    echo "  -d, --dry-run           Perform a dry run without making changes"
    echo "  -f, --force             Skip confirmation prompts"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SUPABASE_PROJECT_ID     Supabase project ID"
    echo "  SUPABASE_SERVICE_ROLE_KEY  Supabase service role key"
    echo ""
    echo "Examples:"
    echo "  $0                      # Interactive rollback"
    echo "  $0 -b backups/20240101_120000  # Restore specific backup"
    echo "  $0 -d                  # Dry run"
    echo "  $0 -f                  # Force rollback without confirmation"
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
        -b|--backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN="true"
            shift
            ;;
        -f|--force)
            FORCE="true"
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

# Main rollback process
main() {
    print_status "Starting Content Pipeline rollback..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Project ID: $SUPABASE_PROJECT_ID"
    
    # Validate environment
    validate_environment
    
    # Select backup
    select_backup
    
    # Confirm rollback
    confirm_rollback
    
    # Stop scheduler
    stop_scheduler
    
    # Rollback database
    rollback_database
    
    # Rollback Edge Functions
    rollback_functions
    
    # Rollback configuration
    rollback_configuration
    
    # Restart scheduler
    restart_scheduler
    
    # Verify rollback
    verify_rollback
    
    # Show summary
    show_summary
}

# Run main function
main "$@"
