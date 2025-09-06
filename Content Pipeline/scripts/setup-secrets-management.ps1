# Secrets Management Setup Script (PowerShell)
# This script sets up Supabase Vault and manages secrets for the Content Pipeline system

Write-Host "Setting up secrets management for Content Pipeline..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$setupResults = @()
$setupId = 1

function Setup-Secret {
    param(
        [string]$SecretName,
        [string]$Description,
        [string]$SecretValue,
        [string]$Category = "api_keys"
    )
    
    Write-Host "`n$setupId. Setting up: $SecretName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   Category: $Category" -ForegroundColor White
    
    try {
        # Check if secret already exists
        $checkResponse = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.$SecretName" -Method GET -Headers $headers
        $existingSecrets = $checkResponse.Content | ConvertFrom-Json
        
        if ($existingSecrets.Count -gt 0) {
            Write-Host "   Status: Secret already exists" -ForegroundColor Yellow
            $script:setupResults += @{Name=$SecretName; Status="EXISTS"; Details="Secret already configured"}
        } else {
            # Create new secret
            $body = @{
                name = $SecretName
                description = $Description
                value = $SecretValue
                category = $Category
                required = $true
                created_by = "system"
            } | ConvertTo-Json
            
            $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets" -Method POST -Headers $headers -Body $body
            $secretData = $response.Content | ConvertFrom-Json
            
            Write-Host "   Status: Secret created successfully" -ForegroundColor Green
            $script:setupResults += @{Name=$SecretName; Status="CREATED"; Details="Secret created successfully"}
        }
    } catch {
        Write-Host "   Status: Error - $($_.Exception.Message)" -ForegroundColor Red
        $script:setupResults += @{Name=$SecretName; Status="ERROR"; Details="Error: $($_.Exception.Message)"}
    }
    
    $script:setupId++
}

# Check Vault status
Write-Host "`nChecking Supabase Vault status..." -ForegroundColor Cyan
try {
    $vaultResponse = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?select=count" -Method GET -Headers $headers
    $vaultCount = ($vaultResponse.Content | ConvertFrom-Json)[0].count
    Write-Host "Vault is accessible. Current secrets count: $vaultCount" -ForegroundColor Green
} catch {
    Write-Host "Vault may not be enabled or accessible. Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Note: Vault secrets are managed through Supabase Dashboard" -ForegroundColor Yellow
}

# Set up required secrets (with placeholder values for now)
Write-Host "`nSetting up required secrets..." -ForegroundColor Cyan

# OpenAI API Key (placeholder - user needs to provide real key)
Setup-Secret -SecretName "openai_api_key" -Description "OpenAI API key for content generation" -SecretValue "sk-placeholder-openai-key" -Category "api_keys"

# WordPress Credentials (placeholder - user needs to provide real credentials)
Setup-Secret -SecretName "wordpress_username" -Description "WordPress username for content-bot" -SecretValue "content-bot" -Category "credentials"
Setup-Secret -SecretName "wordpress_password" -Description "WordPress app password for content-bot" -SecretValue "placeholder-wordpress-password" -Category "credentials"
Setup-Secret -SecretName "wordpress_url" -Description "WordPress site URL" -SecretValue "https://your-wordpress-site.com" -Category "configuration"

# Content Generation Settings
Setup-Secret -SecretName "content_word_count" -Description "Target word count for generated content" -SecretValue "800" -Category "configuration"
Setup-Secret -SecretName "content_tone" -Description "Default tone for content generation" -SecretValue "professional" -Category "configuration"
Setup-Secret -SecretName "content_style" -Description "Default writing style" -SecretValue "informative" -Category "configuration"

# Retry and Timeout Settings
Setup-Secret -SecretName "max_retries" -Description "Maximum number of retries for failed operations" -SecretValue "3" -Category "configuration"
Setup-Secret -SecretName "retry_delay" -Description "Delay between retries in seconds" -SecretValue "30" -Category "configuration"
Setup-Secret -SecretName "request_timeout" -Description "Request timeout in seconds" -SecretValue "60" -Category "configuration"

# Monitoring and Alerting Settings
Setup-Secret -SecretName "alert_email" -Description "Email address for system alerts" -SecretValue "admin@your-domain.com" -Category "monitoring"
Setup-Secret -SecretName "slack_webhook" -Description "Slack webhook URL for notifications" -SecretValue "https://hooks.slack.com/placeholder" -Category "monitoring"

# Default Categories and Tags
Setup-Secret -SecretName "default_categories" -Description "Default WordPress categories (JSON array)" -SecretValue '["Technology", "AI", "Automation"]' -Category "content_settings"
Setup-Secret -SecretName "default_tags" -Description "Default WordPress tags (JSON array)" -SecretValue '["ai-generated", "automation", "content-pipeline"]' -Category "content_settings"

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "SECRETS MANAGEMENT SETUP SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$createdSecrets = ($setupResults | Where-Object { $_.Status -eq "CREATED" }).Count
$existingSecrets = ($setupResults | Where-Object { $_.Status -eq "EXISTS" }).Count
$errorSecrets = ($setupResults | Where-Object { $_.Status -eq "ERROR" }).Count
$totalSecrets = $setupResults.Count

Write-Host "`nTotal Secrets: $totalSecrets" -ForegroundColor White
Write-Host "Created: $createdSecrets" -ForegroundColor Green
Write-Host "Already Exists: $existingSecrets" -ForegroundColor Yellow
Write-Host "Errors: $errorSecrets" -ForegroundColor Red

Write-Host "`nSecrets Status:" -ForegroundColor White
$setupResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "CREATED") { "Green" } elseif ($_.Status -eq "EXISTS") { "Yellow" } else { "Red" }
    Write-Host "   • $($_.Name): $($_.Status)" -ForegroundColor $statusColor
}

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "1. Update placeholder values with real API keys and credentials" -ForegroundColor Yellow
Write-Host "2. Configure WordPress site URL and credentials" -ForegroundColor Yellow
Write-Host "3. Set up monitoring email and Slack webhook" -ForegroundColor Yellow
Write-Host "4. Test API connectivity with real credentials" -ForegroundColor Yellow

if ($errorSecrets -eq 0) {
    Write-Host "`n🎉 Secrets management setup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some secrets had errors - check the details above" -ForegroundColor Yellow
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
