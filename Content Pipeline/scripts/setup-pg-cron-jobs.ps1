# pg_cron Jobs Setup Script (PowerShell)
# This script sets up pg_cron scheduled jobs using SQL commands

Write-Host "Setting up pg_cron scheduled jobs..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$setupResults = @()
$setupId = 1

function Setup-CronJob {
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
        # Create pg_cron job using SQL
        $sql = @"
-- $Description
SELECT cron.schedule(
    '$JobName',
    '$Schedule',
    'SELECT net.http_post(
        url := ''https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/$Function'',
        headers := ''{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA", "Content-Type": "application/json"}''::jsonb,
        body := ''$Parameters''::jsonb
    );'
);
"@
        
        $body = @{
            query = $sql
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$baseUrl/rpc/exec_sql" -Method POST -Headers $headers -Body $body
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "   Status: pg_cron job created successfully" -ForegroundColor Green
        $script:setupResults += @{Name=$JobName; Status="CREATED"; Details="pg_cron job created successfully"}
    } catch {
        Write-Host "   Status: Error - $($_.Exception.Message)" -ForegroundColor Red
        $script:setupResults += @{Name=$JobName; Status="ERROR"; Details="Error: $($_.Exception.Message)"}
    }
    
    $script:setupId++
}

# Check pg_cron extension status
Write-Host "`nChecking pg_cron extension status..." -ForegroundColor Cyan
try {
    $cronCheckSql = "SELECT * FROM cron.job;"
    $body = @{query = $cronCheckSql} | ConvertTo-Json
    $cronResponse = Invoke-WebRequest -Uri "$baseUrl/rpc/exec_sql" -Method POST -Headers $headers -Body $body
    $cronJobs = $cronResponse.Content | ConvertFrom-Json
    Write-Host "pg_cron is accessible. Current jobs: $($cronJobs.Count)" -ForegroundColor Green
} catch {
    Write-Host "pg_cron may not be enabled. Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Set up scheduled jobs
Write-Host "`nSetting up pg_cron scheduled jobs..." -ForegroundColor Cyan

# Job 1: Main content processing (every 30 minutes)
Setup-CronJob -JobName "content_processing_main" -Description "Main content generation job processing" -Schedule "*/30 * * * *" -Function "content-automation" -Parameters '{"mode": "single"}'

# Job 2: Concurrent content processing (every 15 minutes)
Setup-CronJob -JobName "content_processing_concurrent" -Description "Concurrent content generation processing" -Schedule "*/15 * * * *" -Function "concurrent-content-processor" -Parameters '{"max_jobs": 5}'

# Job 3: Health monitoring (every 5 minutes)
Setup-CronJob -JobName "health_monitoring" -Description "System health monitoring and checks" -Schedule "*/5 * * * *" -Function "health" -Parameters '{}'

# Job 4: Performance monitoring (every 10 minutes)
Setup-CronJob -JobName "performance_monitoring" -Description "Performance metrics collection" -Schedule "*/10 * * * *" -Function "performance-monitor" -Parameters '{}'

# Job 5: System monitoring (every 15 minutes)
Setup-CronJob -JobName "system_monitoring" -Description "System monitoring and alerting" -Schedule "*/15 * * * *" -Function "monitoring" -Parameters '{}'

# Job 6: Cleanup and maintenance (every hour)
Setup-CronJob -JobName "cleanup_maintenance" -Description "Data cleanup and system maintenance" -Schedule "0 * * * *" -Function "cleanup" -Parameters '{}'

# Job 7: Sweeper for stale jobs (every 30 minutes)
Setup-CronJob -JobName "sweeper_stale_jobs" -Description "Clean up stale and stuck jobs" -Schedule "*/30 * * * *" -Function "sweeper" -Parameters '{}'

# Job 8: Metrics collection (every 5 minutes)
Setup-CronJob -JobName "metrics_collection" -Description "Collect and store system metrics" -Schedule "*/5 * * * *" -Function "metrics" -Parameters '{}'

# Job 9: Scheduler health check (every hour)
Setup-CronJob -JobName "scheduler_health_check" -Description "Scheduler system health check" -Schedule "0 * * * *" -Function "scheduler" -Parameters '{}'

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "PG_CRON JOBS SETUP SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$createdJobs = ($setupResults | Where-Object { $_.Status -eq "CREATED" }).Count
$errorJobs = ($setupResults | Where-Object { $_.Status -eq "ERROR" }).Count
$totalJobs = $setupResults.Count

Write-Host "`nTotal pg_cron Jobs: $totalJobs" -ForegroundColor White
Write-Host "Created: $createdJobs" -ForegroundColor Green
Write-Host "Errors: $errorJobs" -ForegroundColor Red

Write-Host "`npg_cron Jobs:" -ForegroundColor White
$setupResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "CREATED") { "Green" } else { "Red" }
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
Write-Host "1. Verify all pg_cron jobs are scheduled correctly" -ForegroundColor Yellow
Write-Host "2. Monitor job execution in Supabase Dashboard" -ForegroundColor Yellow
Write-Host "3. Test automated job processing workflow" -ForegroundColor Yellow
Write-Host "4. Set up alerting for job failures" -ForegroundColor Yellow
Write-Host "5. Adjust schedules based on system performance" -ForegroundColor Yellow

if ($errorJobs -eq 0) {
    Write-Host "`n🎉 pg_cron jobs setup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some pg_cron jobs had errors - check the details above" -ForegroundColor Yellow
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
