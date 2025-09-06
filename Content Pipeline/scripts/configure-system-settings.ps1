# System Configuration Script (PowerShell)
# This script configures all system environment variables and settings

Write-Host "Configuring system environment variables and settings..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$configResults = @()
$configId = 1

function Configure-Setting {
    param(
        [string]$SettingName,
        [string]$Description,
        [string]$Value,
        [string]$Category = "configuration"
    )
    
    Write-Host "`n$configId. Configuring: $SettingName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   Value: $Value" -ForegroundColor White
    
    try {
        # Check if setting already exists
        $checkResponse = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.$SettingName" -Method GET -Headers $headers
        $existingSettings = $checkResponse.Content | ConvertFrom-Json
        
        if ($existingSettings.Count -gt 0) {
            # Update existing setting
            $body = @{
                value = $Value
                updated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                updated_by = "system"
            } | ConvertTo-Json
            
            $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.$SettingName" -Method PATCH -Headers $headers -Body $body
            Write-Host "   Status: Setting updated successfully" -ForegroundColor Green
            $script:configResults += @{Name=$SettingName; Status="UPDATED"; Details="Setting updated successfully"}
        } else {
            # Create new setting
            $body = @{
                name = $SettingName
                description = $Description
                value = $Value
                category = $Category
                required = $true
                created_by = "system"
            } | ConvertTo-Json
            
            $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets" -Method POST -Headers $headers -Body $body
            Write-Host "   Status: Setting created successfully" -ForegroundColor Green
            $script:configResults += @{Name=$SettingName; Status="CREATED"; Details="Setting created successfully"}
        }
    } catch {
        Write-Host "   Status: Error - $($_.Exception.Message)" -ForegroundColor Red
        $script:configResults += @{Name=$SettingName; Status="ERROR"; Details="Error: $($_.Exception.Message)"}
    }
    
    $script:configId++
}

# Configure WordPress URL and site configuration
Write-Host "`nConfiguring WordPress URL and site configuration..." -ForegroundColor Cyan
Configure-Setting -SettingName "wordpress_url" -Description "WordPress site URL" -Value "https://your-wordpress-site.com" -Category "configuration"
Configure-Setting -SettingName "wordpress_api_endpoint" -Description "WordPress REST API endpoint" -Value "/wp-json/wp/v2" -Category "configuration"
Configure-Setting -SettingName "wordpress_timeout" -Description "WordPress API timeout in seconds" -Value "30" -Category "configuration"

# Configure content generation settings
Write-Host "`nConfiguring content generation settings..." -ForegroundColor Cyan
Configure-Setting -SettingName "content_word_count" -Description "Target word count for generated content" -Value "800" -Category "content_settings"
Configure-Setting -SettingName "content_tone" -Description "Default tone for content generation" -Value "professional" -Category "content_settings"
Configure-Setting -SettingName "content_style" -Description "Default writing style" -Value "informative" -Category "content_settings"
Configure-Setting -SettingName "content_language" -Description "Content language" -Value "en" -Category "content_settings"
Configure-Setting -SettingName "content_temperature" -Description "OpenAI temperature setting" -Value "0.7" -Category "content_settings"

# Configure retry and timeout settings
Write-Host "`nConfiguring retry and timeout settings..." -ForegroundColor Cyan
Configure-Setting -SettingName "max_retries" -Description "Maximum number of retries for failed operations" -Value "3" -Category "retry_settings"
Configure-Setting -SettingName "retry_delay" -Description "Delay between retries in seconds" -Value "30" -Category "retry_settings"
Configure-Setting -SettingName "request_timeout" -Description "Request timeout in seconds" -Value "60" -Category "retry_settings"
Configure-Setting -SettingName "exponential_backoff" -Description "Use exponential backoff for retries" -Value "true" -Category "retry_settings"

# Configure monitoring and alerting settings
Write-Host "`nConfiguring monitoring and alerting settings..." -ForegroundColor Cyan
Configure-Setting -SettingName "alert_email" -Description "Email address for system alerts" -Value "admin@your-domain.com" -Category "monitoring"
Configure-Setting -SettingName "slack_webhook" -Description "Slack webhook URL for notifications" -Value "https://hooks.slack.com/placeholder" -Category "monitoring"
Configure-Setting -SettingName "alert_threshold" -Description "Failure rate threshold for alerts" -Value "0.1" -Category "monitoring"
Configure-Setting -SettingName "health_check_interval" -Description "Health check interval in minutes" -Value "5" -Category "monitoring"

# Configure default categories, tags, and content settings
Write-Host "`nConfiguring default categories, tags, and content settings..." -ForegroundColor Cyan
Configure-Setting -SettingName "default_categories" -Description "Default WordPress categories (JSON array)" -Value '["Technology", "AI", "Automation", "Content Marketing"]' -Category "content_settings"
Configure-Setting -SettingName "default_tags" -Description "Default WordPress tags (JSON array)" -Value '["ai-generated", "automation", "content-pipeline", "seo-optimized"]' -Category "content_settings"
Configure-Setting -SettingName "content_validation_rules" -Description "Content validation rules (JSON object)" -Value '{"min_word_count": 500, "max_word_count": 1500, "require_images": false, "require_links": true}' -Category "content_settings"

# Configure system performance settings
Write-Host "`nConfiguring system performance settings..." -ForegroundColor Cyan
Configure-Setting -SettingName "concurrent_jobs_limit" -Description "Maximum concurrent jobs" -Value "5" -Category "performance"
Configure-Setting -SettingName "job_processing_interval" -Description "Job processing interval in minutes" -Value "30" -Category "performance"
Configure-Setting -SettingName "cleanup_interval" -Description "Cleanup interval in hours" -Value "24" -Category "performance"
Configure-Setting -SettingName "log_retention_days" -Description "Log retention period in days" -Value "30" -Category "performance"

# Configure security settings
Write-Host "`nConfiguring security settings..." -ForegroundColor Cyan
Configure-Setting -SettingName "enable_ssl" -Description "Enable SSL for external API calls" -Value "true" -Category "security"
Configure-Setting -SettingName "api_rate_limit" -Description "API rate limit per minute" -Value "60" -Category "security"
Configure-Setting -SettingName "enable_audit_logging" -Description "Enable audit logging" -Value "true" -Category "security"

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "SYSTEM CONFIGURATION SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$createdSettings = ($configResults | Where-Object { $_.Status -eq "CREATED" }).Count
$updatedSettings = ($configResults | Where-Object { $_.Status -eq "UPDATED" }).Count
$errorSettings = ($configResults | Where-Object { $_.Status -eq "ERROR" }).Count
$totalSettings = $configResults.Count

Write-Host "`nTotal Settings: $totalSettings" -ForegroundColor White
Write-Host "Created: $createdSettings" -ForegroundColor Green
Write-Host "Updated: $updatedSettings" -ForegroundColor Yellow
Write-Host "Errors: $errorSettings" -ForegroundColor Red

Write-Host "`nConfiguration Status:" -ForegroundColor White
$configResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "CREATED" -or $_.Status -eq "UPDATED") { "Green" } else { "Red" }
    Write-Host "   • $($_.Name): $($_.Status)" -ForegroundColor $statusColor
}

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "1. Update placeholder values with real configuration values" -ForegroundColor Yellow
Write-Host "2. Configure real WordPress site URL and credentials" -ForegroundColor Yellow
Write-Host "3. Set up real monitoring email and Slack webhook" -ForegroundColor Yellow
Write-Host "4. Test all external API integrations" -ForegroundColor Yellow
Write-Host "5. Verify system performance and monitoring" -ForegroundColor Yellow

if ($errorSettings -eq 0) {
    Write-Host "`n🎉 System configuration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some settings had errors - check the details above" -ForegroundColor Yellow
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
