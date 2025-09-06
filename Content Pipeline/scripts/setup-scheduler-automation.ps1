# Scheduler & Automation Setup Script (PowerShell)
# This script configures pg_cron for automated job processing

Write-Host "Setting up scheduler and automation for Content Pipeline..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$setupResults = @()
$setupId = 1

function Setup-ScheduledJob {
    param(
        [string]$JobName,
        [string]$Description,
        [string]$Schedule,
        [string]$Function,
        [string]$Parameters = ""
    )
    
    Write-Host "`n$setupId. Setting up: $JobName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   Schedule: $Schedule" -ForegroundColor White
    Write-Host "   Function: $Function" -ForegroundColor White
    
    try {
        # Check if job already exists
        $checkResponse = Invoke-WebRequest -Uri "$baseUrl/cron_jobs?name=eq.$JobName" -Method GET -Headers $headers
        $existingJobs = $checkResponse.Content | ConvertFrom-Json
        
        if ($existingJobs.Count -gt 0) {
            Write-Host "   Status: Job already exists" -ForegroundColor Yellow
            $script:setupResults += @{Name=$JobName; Status="EXISTS"; Details="Scheduled job already configured"}
        } else {
            # Create new scheduled job
            $body = @{
                name = $JobName
                description = $Description
                schedule = $Schedule
                function_name = $Function
                parameters = $Parameters
                enabled = $true
                created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            } | ConvertTo-Json
            
            $response = Invoke-WebRequest -Uri "$baseUrl/cron_jobs" -Method POST -Headers $headers -Body $body
            $jobData = $response.Content | ConvertFrom-Json
            
            Write-Host "   Status: Scheduled job created successfully" -ForegroundColor Green
            $script:setupResults += @{Name=$JobName; Status="CREATED"; Details="Scheduled job created successfully"}
        }
    } catch {
        Write-Host "   Status: Error - $($_.Exception.Message)" -ForegroundColor Red
        $script:setupResults += @{Name=$JobName; Status="ERROR"; Details="Error: $($_.Exception.Message)"}
    }
    
    $script:setupId++
}

# Check pg_cron status
Write-Host "`nChecking pg_cron status..." -ForegroundColor Cyan
try {
    $cronResponse = Invoke-WebRequest -Uri "$baseUrl/cron_jobs?select=count" -Method GET -Headers $headers
    $cronCount = ($cronResponse.Content | ConvertFrom-Json)[0].count
    Write-Host "pg_cron is accessible. Current scheduled jobs: $cronCount" -ForegroundColor Green
} catch {
    Write-Host "pg_cron may not be enabled or accessible. Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Note: pg_cron jobs are managed through Supabase Dashboard" -ForegroundColor Yellow
}

# Set up scheduled jobs
Write-Host "`nSetting up scheduled jobs..." -ForegroundColor Cyan

# Job 1: Main content processing (every 30 minutes)
Setup-ScheduledJob -JobName "content_processing_main" -Description "Main content generation job processing" -Schedule "*/30 * * * *" -Function "content-automation" -Parameters '{"mode": "single"}'

# Job 2: Concurrent content processing (every 15 minutes)
Setup-ScheduledJob -JobName "content_processing_concurrent" -Description "Concurrent content generation processing" -Schedule "*/15 * * * *" -Function "concurrent-content-processor" -Parameters '{"max_jobs": 5}'

# Job 3: Health monitoring (every 5 minutes)
Setup-ScheduledJob -JobName "health_monitoring" -Description "System health monitoring and checks" -Schedule "*/5 * * * *" -Function "health" -Parameters '{}'

# Job 4: Performance monitoring (every 10 minutes)
Setup-ScheduledJob -JobName "performance_monitoring" -Description "Performance metrics collection" -Schedule "*/10 * * * *" -Function "performance-monitor" -Parameters '{}'

# Job 5: System monitoring (every 15 minutes)
Setup-ScheduledJob -JobName "system_monitoring" -Description "System monitoring and alerting" -Schedule "*/15 * * * *" -Function "monitoring" -Parameters '{}'

# Job 6: Cleanup and maintenance (every hour)
Setup-ScheduledJob -JobName "cleanup_maintenance" -Description "Data cleanup and system maintenance" -Schedule "0 * * * *" -Function "cleanup" -Parameters '{}'

# Job 7: Sweeper for stale jobs (every 30 minutes)
Setup-ScheduledJob -JobName "sweeper_stale_jobs" -Description "Clean up stale and stuck jobs" -Schedule "*/30 * * * *" -Function "sweeper" -Parameters '{}'

# Job 8: Metrics collection (every 5 minutes)
Setup-ScheduledJob -JobName "metrics_collection" -Description "Collect and store system metrics" -Schedule "*/5 * * * *" -Function "metrics" -Parameters '{}'

# Job 9: Scheduler health check (every hour)
Setup-ScheduledJob -JobName "scheduler_health_check" -Description "Scheduler system health check" -Schedule "0 * * * *" -Function "scheduler" -Parameters '{}'

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "SCHEDULER & AUTOMATION SETUP SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$createdJobs = ($setupResults | Where-Object { $_.Status -eq "CREATED" }).Count
$existingJobs = ($setupResults | Where-Object { $_.Status -eq "EXISTS" }).Count
$errorJobs = ($setupResults | Where-Object { $_.Status -eq "ERROR" }).Count
$totalJobs = $setupResults.Count

Write-Host "`nTotal Scheduled Jobs: $totalJobs" -ForegroundColor White
Write-Host "Created: $createdJobs" -ForegroundColor Green
Write-Host "Already Exists: $existingJobs" -ForegroundColor Yellow
Write-Host "Errors: $errorJobs" -ForegroundColor Red

Write-Host "`nScheduled Jobs:" -ForegroundColor White
$setupResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "CREATED") { "Green" } elseif ($_.Status -eq "EXISTS") { "Yellow" } else { "Red" }
    Write-Host "   • $($_.Name): $($_.Status)" -ForegroundColor $statusColor
}

Write-Host "`nSchedule Overview:" -ForegroundColor White
Write-Host "   • Content Processing: Every 30 minutes" -ForegroundColor Green
Write-Host "   • Concurrent Processing: Every 15 minutes" -ForegroundColor Green
Write-Host "   • Health Monitoring: Every 5 minutes" -ForegroundColor Green
Write-Host "   • Performance Monitoring: Every 10 minutes" -ForegroundColor Green
Write-Host "   • System Monitoring: Every 15 minutes" -ForegroundColor Green
Write-Host "   • Cleanup & Maintenance: Every hour" -ForegroundColor Green
Write-Host "   • Sweeper (Stale Jobs): Every 30 minutes" -ForegroundColor Green
Write-Host "   • Metrics Collection: Every 5 minutes" -ForegroundColor Green
Write-Host "   • Scheduler Health Check: Every hour" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "1. Verify all scheduled jobs are running correctly" -ForegroundColor Yellow
Write-Host "2. Monitor job execution and performance" -ForegroundColor Yellow
Write-Host "3. Adjust schedules based on system load" -ForegroundColor Yellow
Write-Host "4. Set up alerting for job failures" -ForegroundColor Yellow
Write-Host "5. Test automated job processing workflow" -ForegroundColor Yellow

if ($errorJobs -eq 0) {
    Write-Host "`n🎉 Scheduler and automation setup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some scheduled jobs had errors - check the details above" -ForegroundColor Yellow
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
