#!/bin/bash

# Content Pipeline Health Check Script
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
CHECK_TYPE="${CHECK_TYPE:-all}"
VERBOSE="${VERBOSE:-false}"
TIMEOUT="${TIMEOUT:-30}"

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

# Function to make HTTP request with timeout
http_request() {
    local url="$1"
    local method="${2:-GET}"
    local headers="$3"
    local timeout="${4:-$TIMEOUT}"
    
    if command_exists curl; then
        curl -s -X "$method" "$url" \
            -H "$headers" \
            --max-time "$timeout" \
            --connect-timeout 10 \
            -w "%{http_code}" \
            -o /dev/null
    elif command_exists wget; then
        wget -q --spider --timeout="$timeout" --tries=1 "$url" 2>/dev/null && echo "200" || echo "000"
    else
        echo "000"
    fi
}

# Function to check Supabase connection
check_supabase_connection() {
    print_status "Checking Supabase connection..."
    
    if [ -z "$SUPABASE_PROJECT_ID" ]; then
        print_error "SUPABASE_PROJECT_ID not set"
        return 1
    fi
    
    local supabase_url="https://$SUPABASE_PROJECT_ID.supabase.co"
    local response_code=$(http_request "$supabase_url")
    
    if [ "$response_code" = "200" ]; then
        print_success "Supabase connection successful"
        return 0
    else
        print_error "Supabase connection failed (HTTP $response_code)"
        return 1
    fi
}

# Function to check Edge Functions
check_edge_functions() {
    print_status "Checking Edge Functions..."
    
    if [ -z "$SUPABASE_PROJECT_ID" ]; then
        print_error "SUPABASE_PROJECT_ID not set"
        return 1
    fi
    
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
    local failed_functions=()
    local successful_functions=()
    
    for func in "${functions[@]}"; do
        local func_url="$base_url/$func"
        local response_code=$(http_request "$func_url")
        
        if [ "$response_code" = "200" ] || [ "$response_code" = "405" ]; then
            successful_functions+=("$func")
            if [ "$VERBOSE" = "true" ]; then
                print_success "Function $func is responding (HTTP $response_code)"
            fi
        else
            failed_functions+=("$func")
            print_error "Function $func failed (HTTP $response_code)"
        fi
    done
    
    if [ ${#failed_functions[@]} -eq 0 ]; then
        print_success "All Edge Functions are responding"
        return 0
    else
        print_error "Failed functions: ${failed_functions[*]}"
        return 1
    fi
}

# Function to check scheduler
check_scheduler() {
    print_status "Checking scheduler..."
    
    if [ -z "$SUPABASE_PROJECT_ID" ]; then
        print_error "SUPABASE_PROJECT_ID not set"
        return 1
    fi
    
    local scheduler_url="https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/scheduler?action=status"
    local response_code=$(http_request "$scheduler_url")
    
    if [ "$response_code" = "200" ]; then
        print_success "Scheduler is responding"
        return 0
    else
        print_error "Scheduler failed (HTTP $response_code)"
        return 1
    fi
}

# Function to check database
check_database() {
    print_status "Checking database..."
    
    if [ -z "$SUPABASE_PROJECT_ID" ]; then
        print_error "SUPABASE_PROJECT_ID not set"
        return 1
    fi
    
    # Test database connection via Edge Function
    local db_url="https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/health?action=check&components=database"
    local response_code=$(http_request "$db_url")
    
    if [ "$response_code" = "200" ]; then
        print_success "Database is responding"
        return 0
    else
        print_error "Database failed (HTTP $response_code)"
        return 1
    fi
}

# Function to check external services
check_external_services() {
    print_status "Checking external services..."
    
    # Check OpenAI API
    local openai_url="https://api.openai.com/v1/models"
    local openai_response=$(http_request "$openai_url" "GET" "Authorization: Bearer $OPENAI_API_KEY")
    
    if [ "$openai_response" = "200" ]; then
        print_success "OpenAI API is responding"
    else
        print_warning "OpenAI API failed (HTTP $openai_response)"
    fi
    
    # Check WordPress
    if [ -n "$WORDPRESS_URL" ]; then
        local wp_response=$(http_request "$WORDPRESS_URL")
        
        if [ "$wp_response" = "200" ]; then
            print_success "WordPress is responding"
        else
            print_warning "WordPress failed (HTTP $wp_response)"
        fi
    else
        print_warning "WORDPRESS_URL not set, skipping WordPress check"
    fi
}

# Function to check system resources
check_system_resources() {
    print_status "Checking system resources..."
    
    # Check disk space
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        print_error "Disk usage is high: ${disk_usage}%"
    elif [ "$disk_usage" -gt 80 ]; then
        print_warning "Disk usage is moderate: ${disk_usage}%"
    else
        print_success "Disk usage is normal: ${disk_usage}%"
    fi
    
    # Check memory usage
    if command_exists free; then
        local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [ "$memory_usage" -gt 90 ]; then
            print_error "Memory usage is high: ${memory_usage}%"
        elif [ "$memory_usage" -gt 80 ]; then
            print_warning "Memory usage is moderate: ${memory_usage}%"
        else
            print_success "Memory usage is normal: ${memory_usage}%"
        fi
    fi
    
    # Check CPU load
    if command_exists uptime; then
        local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        local cpu_cores=$(nproc 2>/dev/null || echo "1")
        local load_percent=$(echo "scale=0; $load_avg * 100 / $cpu_cores" | bc -l 2>/dev/null || echo "0")
        
        if [ "$load_percent" -gt 90 ]; then
            print_error "CPU load is high: ${load_percent}%"
        elif [ "$load_percent" -gt 80 ]; then
            print_warning "CPU load is moderate: ${load_percent}%"
        else
            print_success "CPU load is normal: ${load_percent}%"
        fi
    fi
}

# Function to check network connectivity
check_network_connectivity() {
    print_status "Checking network connectivity..."
    
    # Check internet connectivity
    if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        print_success "Internet connectivity is working"
    else
        print_error "Internet connectivity failed"
        return 1
    fi
    
    # Check DNS resolution
    if nslookup google.com > /dev/null 2>&1; then
        print_success "DNS resolution is working"
    else
        print_error "DNS resolution failed"
        return 1
    fi
    
    # Check HTTPS connectivity
    if command_exists openssl; then
        if echo | openssl s_client -connect google.com:443 -servername google.com > /dev/null 2>&1; then
            print_success "HTTPS connectivity is working"
        else
            print_error "HTTPS connectivity failed"
            return 1
        fi
    fi
}

# Function to check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    local required_commands=("node" "npm" "deno" "supabase" "git" "curl")
    local missing_commands=()
    
    for cmd in "${required_commands[@]}"; do
        if command_exists "$cmd"; then
            if [ "$VERBOSE" = "true" ]; then
                print_success "Command $cmd is available"
            fi
        else
            missing_commands+=("$cmd")
            print_error "Command $cmd is missing"
        fi
    done
    
    if [ ${#missing_commands[@]} -eq 0 ]; then
        print_success "All required dependencies are available"
        return 0
    else
        print_error "Missing dependencies: ${missing_commands[*]}"
        return 1
    fi
}

# Function to check configuration
check_configuration() {
    print_status "Checking configuration..."
    
    local required_vars=(
        "SUPABASE_PROJECT_ID"
        "SUPABASE_SERVICE_ROLE_KEY"
        "OPENAI_API_KEY"
        "WORDPRESS_URL"
        "WORDPRESS_USERNAME"
        "WORDPRESS_PASSWORD"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -n "${!var}" ]; then
            if [ "$VERBOSE" = "true" ]; then
                print_success "Environment variable $var is set"
            fi
        else
            missing_vars+=("$var")
            print_error "Environment variable $var is not set"
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        print_success "All required configuration variables are set"
        return 0
    else
        print_error "Missing configuration variables: ${missing_vars[*]}"
        return 1
    fi
}

# Function to check file permissions
check_file_permissions() {
    print_status "Checking file permissions..."
    
    # Check if scripts are executable
    local scripts=("scripts/deploy.sh" "scripts/rollback.sh" "scripts/setup.sh" "scripts/health-check.sh")
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                if [ "$VERBOSE" = "true" ]; then
                    print_success "Script $script is executable"
                fi
            else
                print_error "Script $script is not executable"
                chmod +x "$script"
                print_success "Made $script executable"
            fi
        fi
    done
    
    # Check for overly permissive files
    local permissive_files=$(find . -type f -perm 777 -not -path "./.git/*" 2>/dev/null || echo "")
    if [ -n "$permissive_files" ]; then
        print_warning "Found overly permissive files:"
        echo "$permissive_files"
    fi
    
    print_success "File permissions check completed"
}

# Function to check logs
check_logs() {
    print_status "Checking logs..."
    
    # Check for error logs
    local error_logs=$(find . -name "*.log" -exec grep -l "ERROR\|FATAL\|CRITICAL" {} \; 2>/dev/null || echo "")
    if [ -n "$error_logs" ]; then
        print_warning "Found error logs:"
        echo "$error_logs"
    fi
    
    # Check for recent log files
    local recent_logs=$(find . -name "*.log" -mtime -1 2>/dev/null || echo "")
    if [ -n "$recent_logs" ]; then
        if [ "$VERBOSE" = "true" ]; then
            print_success "Found recent log files:"
            echo "$recent_logs"
        fi
    fi
    
    print_success "Log check completed"
}

# Function to generate health report
generate_health_report() {
    print_status "Generating health report..."
    
    local report_file="health-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Content Pipeline Health Report"
        echo "Generated: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo "Project ID: $SUPABASE_PROJECT_ID"
        echo "=================================="
        echo ""
        
        echo "System Information:"
        echo "  OS: $(uname -s)"
        echo "  Architecture: $(uname -m)"
        echo "  Hostname: $(hostname)"
        echo "  Uptime: $(uptime)"
        echo ""
        
        echo "Dependencies:"
        for cmd in node npm deno supabase git curl; do
            if command_exists "$cmd"; then
                echo "  ✅ $cmd: $(which $cmd)"
            else
                echo "  ❌ $cmd: Not found"
            fi
        done
        echo ""
        
        echo "Configuration:"
        for var in SUPABASE_PROJECT_ID SUPABASE_SERVICE_ROLE_KEY OPENAI_API_KEY WORDPRESS_URL WORDPRESS_USERNAME WORDPRESS_PASSWORD; do
            if [ -n "${!var}" ]; then
                echo "  ✅ $var: Set"
            else
                echo "  ❌ $var: Not set"
            fi
        done
        echo ""
        
        echo "Network Connectivity:"
        if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
            echo "  ✅ Internet connectivity: Working"
        else
            echo "  ❌ Internet connectivity: Failed"
        fi
        
        if nslookup google.com > /dev/null 2>&1; then
            echo "  ✅ DNS resolution: Working"
        else
            echo "  ❌ DNS resolution: Failed"
        fi
        echo ""
        
        echo "System Resources:"
        echo "  Disk usage: $(df -h . | awk 'NR==2 {print $5}')"
        if command_exists free; then
            echo "  Memory usage: $(free | awk 'NR==2{printf "%.0f%%", $3*100/$2}')"
        fi
        if command_exists uptime; then
            echo "  Load average: $(uptime | awk -F'load average:' '{print $2}')"
        fi
        echo ""
        
    } > "$report_file"
    
    print_success "Health report generated: $report_file"
}

# Function to show health summary
show_health_summary() {
    print_status "Health Check Summary"
    echo "====================="
    echo "Project: $PROJECT_NAME"
    echo "Environment: $ENVIRONMENT"
    echo "Project ID: $SUPABASE_PROJECT_ID"
    echo "Check Type: $CHECK_TYPE"
    echo "Verbose: $VERBOSE"
    echo "Timeout: $TIMEOUT"
    echo ""
    
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        print_success "System is healthy!"
    elif [ "$HEALTH_STATUS" = "warning" ]; then
        print_warning "System has warnings!"
    else
        print_error "System has issues!"
    fi
}

# Function to show help
show_help() {
    echo "Content Pipeline Health Check Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (default: development)"
    echo "  -p, --project-id ID      Set Supabase project ID"
    echo "  -t, --type TYPE          Set check type (all, connection, functions, scheduler, database, external, system, network, deps, config, files, logs)"
    echo "  -v, --verbose            Enable verbose output"
    echo "  -T, --timeout SECONDS    Set timeout for HTTP requests (default: 30)"
    echo "  -r, --report             Generate health report"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SUPABASE_PROJECT_ID      Supabase project ID"
    echo "  SUPABASE_SERVICE_ROLE_KEY  Supabase service role key"
    echo "  OPENAI_API_KEY           OpenAI API key"
    echo "  WORDPRESS_URL            WordPress site URL"
    echo "  WORDPRESS_USERNAME       WordPress username"
    echo "  WORDPRESS_PASSWORD       WordPress password"
    echo ""
    echo "Examples:"
    echo "  $0                      # Full health check"
    echo "  $0 -t functions         # Check only Edge Functions"
    echo "  $0 -v                   # Verbose output"
    echo "  $0 -r                   # Generate health report"
    echo "  $0 -T 60                # Set 60 second timeout"
}

# Main health check process
main() {
    print_status "Starting Content Pipeline health check..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Project ID: $SUPABASE_PROJECT_ID"
    
    local health_status="healthy"
    local failed_checks=()
    
    # Run checks based on type
    case "$CHECK_TYPE" in
        "all")
            check_dependencies || { health_status="error"; failed_checks+=("dependencies") }
            check_configuration || { health_status="error"; failed_checks+=("configuration") }
            check_network_connectivity || { health_status="error"; failed_checks+=("network") }
            check_supabase_connection || { health_status="error"; failed_checks+=("supabase") }
            check_edge_functions || { health_status="error"; failed_checks+=("functions") }
            check_scheduler || { health_status="warning"; failed_checks+=("scheduler") }
            check_database || { health_status="warning"; failed_checks+=("database") }
            check_external_services || { health_status="warning"; failed_checks+=("external") }
            check_system_resources || { health_status="warning"; failed_checks+=("system") }
            check_file_permissions || { health_status="warning"; failed_checks+=("permissions") }
            check_logs || { health_status="warning"; failed_checks+=("logs") }
            ;;
        "connection")
            check_supabase_connection || { health_status="error"; failed_checks+=("supabase") }
            ;;
        "functions")
            check_edge_functions || { health_status="error"; failed_checks+=("functions") }
            ;;
        "scheduler")
            check_scheduler || { health_status="error"; failed_checks+=("scheduler") }
            ;;
        "database")
            check_database || { health_status="error"; failed_checks+=("database") }
            ;;
        "external")
            check_external_services || { health_status="warning"; failed_checks+=("external") }
            ;;
        "system")
            check_system_resources || { health_status="warning"; failed_checks+=("system") }
            ;;
        "network")
            check_network_connectivity || { health_status="error"; failed_checks+=("network") }
            ;;
        "deps")
            check_dependencies || { health_status="error"; failed_checks+=("dependencies") }
            ;;
        "config")
            check_configuration || { health_status="error"; failed_checks+=("configuration") }
            ;;
        "files")
            check_file_permissions || { health_status="warning"; failed_checks+=("permissions") }
            ;;
        "logs")
            check_logs || { health_status="warning"; failed_checks+=("logs") }
            ;;
        *)
            print_error "Unknown check type: $CHECK_TYPE"
            exit 1
            ;;
    esac
    
    # Set global health status
    HEALTH_STATUS="$health_status"
    
    # Generate report if requested
    if [ "$GENERATE_REPORT" = "true" ]; then
        generate_health_report
    fi
    
    # Show summary
    show_health_summary
    
    # Exit with appropriate code
    if [ "$health_status" = "error" ]; then
        exit 1
    elif [ "$health_status" = "warning" ]; then
        exit 2
    else
        exit 0
    fi
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
        -t|--type)
            CHECK_TYPE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -T|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -r|--report)
            GENERATE_REPORT="true"
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

# Run main function
main "$@"
