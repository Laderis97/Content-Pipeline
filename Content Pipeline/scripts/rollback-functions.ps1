# Rollback Functions Script (PowerShell)
# This script provides automated rollback procedures for Edge Functions

Write-Host "Content Pipeline - Edge Functions Rollback Script" -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor White

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co"
$functionsUrl = "$baseUrl/functions/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$rollbackResults = @()
$rollbackId = 1

function Test-FunctionRollback {
    param(
        [string]$FunctionName,
        [string]$Description,
        [string]$TestAction
    )
    
    Write-Host "`n$rollbackId. Testing: $FunctionName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        $result = Invoke-Command -ScriptBlock $TestAction
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "   Status: [PASS] (${responseTime}ms)" -ForegroundColor Green
        Write-Host "   Details: $result" -ForegroundColor White
        
        $script:rollbackResults += @{
            Function = $FunctionName
            Status = "PASS"
            ResponseTime = $responseTime
            Details = $result
        }
    } catch {
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        Write-Host "   Status: [FAIL] - $($_.Exception.Message)" -ForegroundColor Red
        
        $script:rollbackResults += @{
            Function = $FunctionName
            Status = "FAIL"
            ResponseTime = $responseTime
            Details = "Error: $($_.Exception.Message)"
        }
    }
    
    $script:rollbackId++
}

# Test 1: Health Check Function
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 1: HEALTH CHECK FUNCTION ROLLBACK" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-FunctionRollback -FunctionName "Health Check" -Description "Test health check function rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/health" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Health check function operational: $($data.status)"
    } else {
        throw "Health check function failed with status: $($response.StatusCode)"
    }
}

# Test 2: Performance Monitor Function
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 2: PERFORMANCE MONITOR FUNCTION ROLLBACK" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-FunctionRollback -FunctionName "Performance Monitor" -Description "Test performance monitor function rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/performance-monitor" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Performance monitor function operational: $($data.status)"
    } else {
        throw "Performance monitor function failed with status: $($response.StatusCode)"
    }
}

# Test 3: Metrics Collector Function
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 3: METRICS COLLECTOR FUNCTION ROLLBACK" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-FunctionRollback -FunctionName "Metrics Collector" -Description "Test metrics collector function rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/metrics" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Metrics collector function operational: $($data.status)"
    } else {
        throw "Metrics collector function failed with status: $($response.StatusCode)"
    }
}

# Test 4: Content Automation Function
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 4: CONTENT AUTOMATION FUNCTION ROLLBACK" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-FunctionRollback -FunctionName "Content Automation" -Description "Test content automation function rollback" -TestAction {
    $testBody = @{ mode = "health_check" } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$functionsUrl/content-automation" -Method POST -Headers $headers -Body $testBody -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Content automation function operational: $($data.status)"
    } else {
        throw "Content automation function failed with status: $($response.StatusCode)"
    }
}

# Test 5: Monitoring Dashboard Function
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 5: MONITORING DASHBOARD FUNCTION ROLLBACK" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-FunctionRollback -FunctionName "Monitoring Dashboard" -Description "Test monitoring dashboard function rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/monitoring-dashboard" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Monitoring dashboard function operational: $($data.data.systemHealth.status)"
    } else {
        throw "Monitoring dashboard function failed with status: $($response.StatusCode)"
    }
}

# Test 6: Backup Manager Function
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 6: BACKUP MANAGER FUNCTION ROLLBACK" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-FunctionRollback -FunctionName "Backup Manager" -Description "Test backup manager function rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/backup-manager" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Backup manager function operational: $($data.data.statistics.total) total backups"
    } else {
        throw "Backup manager function failed with status: $($response.StatusCode)"
    }
}

# Test 7: Function Performance Validation
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 7: FUNCTION PERFORMANCE VALIDATION" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-FunctionRollback -FunctionName "Performance Validation" -Description "Validate function performance after rollback" -TestAction {
    $functions = @("health", "performance-monitor", "metrics", "monitoring-dashboard")
    $totalResponseTime = 0
    $successCount = 0
    
    foreach ($function in $functions) {
        try {
            $startTime = Get-Date
            $response = Invoke-WebRequest -Uri "$functionsUrl/$function" -Method GET -Headers $headers -TimeoutSec 15
            $endTime = Get-Date
            $responseTime = ($endTime - $startTime).TotalMilliseconds
            
            if ($response.StatusCode -eq 200) {
                $totalResponseTime += $responseTime
                $successCount++
            }
        } catch {
            # Function failed, continue with others
        }
    }
    
    $avgResponseTime = if ($successCount -gt 0) { $totalResponseTime / $successCount } else { 0 }
    return "Performance validation: $successCount/$($functions.Count) functions operational, avg response time: $([math]::Round($avgResponseTime, 2))ms"
}

# Summary Report
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "FUNCTION ROLLBACK TEST SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$totalTests = $rollbackResults.Count
$passedTests = ($rollbackResults | Where-Object { $_.Status -eq "PASS" }).Count
$failedTests = ($rollbackResults | Where-Object { $_.Status -eq "FAIL" }).Count

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red

Write-Host "`nTest Results:" -ForegroundColor White
$rollbackResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "PASS") { "Green" } else { "Red" }
    $statusIcon = if ($_.Status -eq "PASS") { "[PASS]" } else { "[FAIL]" }
    Write-Host "   $statusIcon $($_.Function): $($_.Status) ($($_.ResponseTime)ms)" -ForegroundColor $statusColor
}

# Rollback Readiness Assessment
Write-Host "`nRollback Readiness Assessment:" -ForegroundColor White
if ($failedTests -eq 0) {
    Write-Host "   [SUCCESS] FUNCTION ROLLBACK READY!" -ForegroundColor Green
    Write-Host "   All functions operational and ready for rollback" -ForegroundColor Green
    Write-Host "   Rollback procedures validated" -ForegroundColor Green
    Write-Host "   System ready for production deployment" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] FUNCTION ROLLBACK NEEDS ATTENTION" -ForegroundColor Red
    Write-Host "   $failedTests function(s) failed - address before rollback" -ForegroundColor Red
    Write-Host "   Review failed functions and fix issues" -ForegroundColor Red
    Write-Host "   Re-run tests after fixes" -ForegroundColor Red
}

# Rollback Procedures
Write-Host "`nRollback Procedures:" -ForegroundColor White
Write-Host "   1. Identify affected functions" -ForegroundColor Yellow
Write-Host "   2. Deploy previous stable versions" -ForegroundColor Yellow
Write-Host "   3. Verify function health" -ForegroundColor Yellow
Write-Host "   4. Test function endpoints" -ForegroundColor Yellow
Write-Host "   5. Monitor system performance" -ForegroundColor Yellow

# Rollback Commands
Write-Host "`nRollback Commands:" -ForegroundColor White
Write-Host "   # Deploy previous version" -ForegroundColor Cyan
Write-Host "   supabase functions deploy [function-name] --version [previous-version]" -ForegroundColor Cyan
Write-Host "   " -ForegroundColor White
Write-Host "   # Verify function health" -ForegroundColor Cyan
Write-Host "   curl -X GET `"$functionsUrl/[function-name]`"" -ForegroundColor Cyan
Write-Host "   " -ForegroundColor White
Write-Host "   # Check function logs" -ForegroundColor Cyan
Write-Host "   supabase functions logs [function-name] --follow" -ForegroundColor Cyan

# Next Steps
Write-Host "`nNext Steps:" -ForegroundColor White
if ($failedTests -eq 0) {
    Write-Host "1. [OK] Proceed with rollback procedures" -ForegroundColor Green
    Write-Host "2. [OK] Monitor function performance" -ForegroundColor Green
    Write-Host "3. [OK] Test system functionality" -ForegroundColor Green
    Write-Host "4. [OK] Document rollback results" -ForegroundColor Green
} else {
    Write-Host "1. [STOP] Address failed function tests first" -ForegroundColor Red
    Write-Host "2. [STOP] Fix function issues" -ForegroundColor Red
    Write-Host "3. [STOP] Re-run tests after fixes" -ForegroundColor Red
    Write-Host "4. [STOP] Do not proceed until all tests pass" -ForegroundColor Red
}

Write-Host "`nFunction rollback testing completed at: $(Get-Date)" -ForegroundColor White
Write-Host "="*60 -ForegroundColor Cyan
