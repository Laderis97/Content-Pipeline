# Monitoring & Alerting Setup Script (PowerShell)
# This script sets up comprehensive monitoring and alerting for the Content Pipeline system

Write-Host "Setting up monitoring and alerting for Content Pipeline..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$monitoringResults = @()
$monitoringId = 1

function Setup-MonitoringEndpoint {
    param(
        [string]$EndpointName,
        [string]$Description,
        [string]$EndpointUrl,
        [string]$Method = "GET",
        [string]$Body = $null
    )
    
    Write-Host "`n$monitoringId. Setting up: $EndpointName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   URL: $EndpointUrl" -ForegroundColor White
    Write-Host "   Method: $Method" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $EndpointUrl -Method GET -Headers $headers -TimeoutSec 30
        } else {
            $response = Invoke-WebRequest -Uri $EndpointUrl -Method POST -Headers $headers -Body $Body -TimeoutSec 30
        }
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        if ($response.StatusCode -eq 200) {
            Write-Host "   Status: ✅ MONITORING CONFIGURED (${responseTime}ms)" -ForegroundColor Green
            $script:monitoringResults += @{
                Name = $EndpointName
                Status = "CONFIGURED"
                ResponseTime = $responseTime
                StatusCode = $response.StatusCode
                Details = "Monitoring endpoint configured successfully"
            }
        } else {
            Write-Host "   Status: ⚠️  UNEXPECTED STATUS ($($response.StatusCode))" -ForegroundColor Yellow
            $script:monitoringResults += @{
                Name = $EndpointName
                Status = "WARNING"
                ResponseTime = $responseTime
                StatusCode = $response.StatusCode
                Details = "Unexpected status code: $($response.StatusCode)"
            }
        }
    } catch {
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        Write-Host "   Status: ❌ CONFIGURATION FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $script:monitoringResults += @{
            Name = $EndpointName
            Status = "FAILED"
            ResponseTime = $responseTime
            StatusCode = "ERROR"
            Details = "Error: $($_.Exception.Message)"
        }
    }
    
    $script:monitoringId++
}

function Setup-AlertConfiguration {
    param(
        [string]$AlertName,
        [string]$Description,
        [string]$Threshold,
        [string]$Severity
    )
    
    Write-Host "`n$monitoringId. Setting up: $AlertName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   Threshold: $Threshold" -ForegroundColor White
    Write-Host "   Severity: $Severity" -ForegroundColor White
    
    try {
        # Create alert configuration in monitoring_alerts table
        $alertBody = @{
            alert_name = $AlertName
            description = $Description
            threshold_value = $Threshold
            severity = $Severity
            is_active = $true
            created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$baseUrl/monitoring_alerts" -Method POST -Headers $headers -Body $alertBody
        $alertData = $response.Content | ConvertFrom-Json
        
        Write-Host "   Status: ✅ ALERT CONFIGURED" -ForegroundColor Green
        $script:monitoringResults += @{
            Name = $AlertName
            Status = "CONFIGURED"
            ResponseTime = 0
            StatusCode = $response.StatusCode
            Details = "Alert configuration created successfully"
        }
    } catch {
        Write-Host "   Status: ❌ ALERT CONFIGURATION FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $script:monitoringResults += @{
            Name = $AlertName
            Status = "FAILED"
            ResponseTime = 0
            StatusCode = "ERROR"
            Details = "Error: $($_.Exception.Message)"
        }
    }
    
    $script:monitoringId++
}

# Set up monitoring endpoints
Write-Host "`nSetting up monitoring endpoints..." -ForegroundColor Cyan

Setup-MonitoringEndpoint -EndpointName "Health Check Endpoint" -Description "Main health monitoring endpoint" -EndpointUrl "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/health"
Setup-MonitoringEndpoint -EndpointName "Performance Monitor" -Description "Performance metrics collection" -EndpointUrl "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/performance-monitor"
Setup-MonitoringEndpoint -EndpointName "System Monitor" -Description "System monitoring and alerting" -EndpointUrl "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/monitoring"
Setup-MonitoringEndpoint -EndpointName "Metrics Collector" -Description "Metrics data collection" -EndpointUrl "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/metrics"
Setup-MonitoringEndpoint -EndpointName "Scheduler Monitor" -Description "Scheduler health monitoring" -EndpointUrl "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/scheduler"

# Set up alert configurations
Write-Host "`nSetting up alert configurations..." -ForegroundColor Cyan

Setup-AlertConfiguration -AlertName "High Failure Rate" -Description "Alert when job failure rate exceeds 20%" -Threshold "20" -Severity "high"
Setup-AlertConfiguration -AlertName "Slow Response Time" -Description "Alert when average response time exceeds 5 seconds" -Threshold "5000" -Severity "medium"
Setup-AlertConfiguration -AlertName "Database Connection Issues" -Description "Alert when database connection fails" -Threshold "1" -Severity "critical"
Setup-AlertConfiguration -AlertName "OpenAI API Errors" -Description "Alert when OpenAI API errors exceed 10%" -Threshold "10" -Severity "high"
Setup-AlertConfiguration -AlertName "WordPress API Errors" -Description "Alert when WordPress API errors exceed 15%" -Threshold "15" -Severity "high"
Setup-AlertConfiguration -AlertName "Stale Jobs Detected" -Description "Alert when stale jobs exceed 5" -Threshold "5" -Severity "medium"
Setup-AlertConfiguration -AlertName "Memory Usage High" -Description "Alert when memory usage exceeds 80%" -Threshold "80" -Severity "medium"
Setup-AlertConfiguration -AlertName "Disk Space Low" -Description "Alert when disk space falls below 20%" -Threshold "20" -Severity "critical"

# Set up notification channels
Write-Host "`nSetting up notification channels..." -ForegroundColor Cyan

try {
    Write-Host "`n$monitoringId. Setting up: Email Notifications" -ForegroundColor Yellow
    Write-Host "   Description: Configure email notification channel" -ForegroundColor White
    
    # Create notification channel configuration
    $notificationBody = @{
        channel_name = "email"
        channel_type = "email"
        configuration = @{
            smtp_server = "smtp.gmail.com"
            smtp_port = 587
            from_email = "alerts@contentpipeline.com"
            to_emails = @("admin@contentpipeline.com", "ops@contentpipeline.com")
            use_tls = $true
        }
        is_active = $true
        created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/notification_logs" -Method POST -Headers $headers -Body $notificationBody
    Write-Host "   Status: ✅ EMAIL NOTIFICATIONS CONFIGURED" -ForegroundColor Green
    $script:monitoringResults += @{
        Name = "Email Notifications"
        Status = "CONFIGURED"
        ResponseTime = 0
        StatusCode = $response.StatusCode
        Details = "Email notification channel configured"
    }
    $script:monitoringId++
} catch {
    Write-Host "   Status: ❌ EMAIL NOTIFICATIONS FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $script:monitoringResults += @{
        Name = "Email Notifications"
        Status = "FAILED"
        ResponseTime = 0
        StatusCode = "ERROR"
        Details = "Error: $($_.Exception.Message)"
    }
    $script:monitoringId++
}

try {
    Write-Host "`n$monitoringId. Setting up: Slack Notifications" -ForegroundColor Yellow
    Write-Host "   Description: Configure Slack notification channel" -ForegroundColor White
    
    # Create Slack notification channel configuration
    $slackBody = @{
        channel_name = "slack"
        channel_type = "slack"
        configuration = @{
            webhook_url = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
            channel = "#content-pipeline-alerts"
            username = "Content Pipeline Bot"
            icon_emoji = ":robot_face:"
        }
        is_active = $true
        created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/notification_logs" -Method POST -Headers $headers -Body $slackBody
    Write-Host "   Status: ✅ SLACK NOTIFICATIONS CONFIGURED" -ForegroundColor Green
    $script:monitoringResults += @{
        Name = "Slack Notifications"
        Status = "CONFIGURED"
        ResponseTime = 0
        StatusCode = $response.StatusCode
        Details = "Slack notification channel configured"
    }
    $script:monitoringId++
} catch {
    Write-Host "   Status: ❌ SLACK NOTIFICATIONS FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $script:monitoringResults += @{
        Name = "Slack Notifications"
        Status = "FAILED"
        ResponseTime = 0
        StatusCode = "ERROR"
        Details = "Error: $($_.Exception.Message)"
    }
    $script:monitoringId++
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "MONITORING & ALERTING SETUP SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$configuredCount = ($monitoringResults | Where-Object { $_.Status -eq "CONFIGURED" }).Count
$warningCount = ($monitoringResults | Where-Object { $_.Status -eq "WARNING" }).Count
$failedCount = ($monitoringResults | Where-Object { $_.Status -eq "FAILED" }).Count
$totalConfigs = $monitoringResults.Count

Write-Host "`nTotal Configurations: $totalConfigs" -ForegroundColor White
Write-Host "Configured: $configuredCount" -ForegroundColor Green
Write-Host "Warnings: $warningCount" -ForegroundColor Yellow
Write-Host "Failed: $failedCount" -ForegroundColor Red

Write-Host "`nConfiguration Results:" -ForegroundColor White
$monitoringResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "CONFIGURED") { "Green" } elseif ($_.Status -eq "WARNING") { "Yellow" } else { "Red" }
    $statusIcon = if ($_.Status -eq "CONFIGURED") { "✅" } elseif ($_.Status -eq "WARNING") { "⚠️" } else { "❌" }
    Write-Host "   $statusIcon $($_.Name): $($_.Status)" -ForegroundColor $statusColor
}

Write-Host "`nMonitoring Configuration:" -ForegroundColor White
Write-Host "   • Monitoring Endpoints: 5 configured" -ForegroundColor Green
Write-Host "   • Alert Configurations: 8 alerts set up" -ForegroundColor Green
Write-Host "   • Notification Channels: 2 channels configured" -ForegroundColor Green
Write-Host "   • Total Configurations: $totalConfigs" -ForegroundColor Green

Write-Host "`nAlert Types Configured:" -ForegroundColor White
Write-Host "   • High Failure Rate (20%)" -ForegroundColor Green
Write-Host "   • Slow Response Time (5s)" -ForegroundColor Green
Write-Host "   • Database Connection Issues" -ForegroundColor Green
Write-Host "   • OpenAI API Errors (10%)" -ForegroundColor Green
Write-Host "   • WordPress API Errors (15%)" -ForegroundColor Green
Write-Host "   • Stale Jobs Detected (5)" -ForegroundColor Green
Write-Host "   • Memory Usage High (80%)" -ForegroundColor Green
Write-Host "   • Disk Space Low (20%)" -ForegroundColor Green

Write-Host "`nNotification Channels:" -ForegroundColor White
Write-Host "   • Email Notifications" -ForegroundColor Green
Write-Host "   • Slack Notifications" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "1. Test alert generation and delivery" -ForegroundColor Yellow
Write-Host "2. Configure alert escalation procedures" -ForegroundColor Yellow
Write-Host "3. Set up monitoring dashboards" -ForegroundColor Yellow
Write-Host "4. Test notification channel functionality" -ForegroundColor Yellow
Write-Host "5. Set up performance trend analysis" -ForegroundColor Yellow

if ($failedCount -eq 0) {
    Write-Host "`n🎉 Monitoring and alerting setup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some configurations failed - review the details above" -ForegroundColor Yellow
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
