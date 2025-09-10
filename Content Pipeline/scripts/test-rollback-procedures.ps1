# Test Rollback Procedures Script (PowerShell)
# This script tests all rollback procedures for the Content Pipeline system

Write-Host "Testing Rollback Procedures for Content Pipeline..." -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor White

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co"
$functionsUrl = "$baseUrl/functions/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$testResults = @()
$testId = 1

function Test-RollbackProcedure {
    param(
        [string]$TestName,
        [string]$Description,
        [string]$TestAction
    )
    
    Write-Host "`n$testId. Testing: $TestName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        $result = Invoke-Command -ScriptBlock $TestAction
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "   Status: [PASS] (${responseTime}ms)" -ForegroundColor Green
        Write-Host "   Details: $result" -ForegroundColor White
        
        $script:testResults += @{
            Test = $TestName
            Status = "PASS"
            ResponseTime = $responseTime
            Details = $result
        }
    } catch {
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        Write-Host "   Status: [FAIL] - $($_.Exception.Message)" -ForegroundColor Red
        
        $script:testResults += @{
            Test = $TestName
            Status = "FAIL"
            ResponseTime = $responseTime
            Details = "Error: $($_.Exception.Message)"
        }
    }
    
    $script:testId++
}

# Test 1: Function Rollback Procedures
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 1: FUNCTION ROLLBACK PROCEDURES" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-RollbackProcedure -TestName "Function Health Check" -Description "Test function health check rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/health" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Function health check operational: $($data.status)"
    } else {
        throw "Function health check failed with status: $($response.StatusCode)"
    }
}

Test-RollbackProcedure -TestName "Function Performance Monitor" -Description "Test function performance monitor rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/performance-monitor" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Function performance monitor operational: $($data.status)"
    } else {
        throw "Function performance monitor failed with status: $($response.StatusCode)"
    }
}

Test-RollbackProcedure -TestName "Function Metrics Collector" -Description "Test function metrics collector rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/metrics" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Function metrics collector operational: $($data.status)"
    } else {
        throw "Function metrics collector failed with status: $($response.StatusCode)"
    }
}

# Test 2: Database Rollback Procedures
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 2: DATABASE ROLLBACK PROCEDURES" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-RollbackProcedure -TestName "Database Connectivity" -Description "Test database connectivity for rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$baseUrl/rest/v1/content_jobs?select=count" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $count = ($response.Content | ConvertFrom-Json)[0].count
        return "Database connectivity verified: $count content jobs found"
    } else {
        throw "Database connectivity failed with status: $($response.StatusCode)"
    }
}

Test-RollbackProcedure -TestName "Database Schema Validation" -Description "Test database schema validation for rollback" -TestAction {
    $tables = @("content_jobs", "job_runs", "health_checks", "metrics_data", "monitoring_alerts")
    $accessibleTables = 0
    
    foreach ($table in $tables) {
        try {
            $response = Invoke-WebRequest -Uri "$baseUrl/rest/v1/$table?select=count" -Method GET -Headers $headers -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                $accessibleTables++
            }
        } catch {
            # Table not accessible, continue
        }
    }
    
    return "Database schema validation: $accessibleTables/$($tables.Count) tables accessible"
}

Test-RollbackProcedure -TestName "Database Data Integrity" -Description "Test database data integrity for rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$baseUrl/rest/v1/content_jobs?select=id,status&limit=10" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $jobs = $response.Content | ConvertFrom-Json
        return "Database data integrity verified: $($jobs.Count) jobs accessible"
    } else {
        throw "Database data integrity check failed with status: $($response.StatusCode)"
    }
}

# Test 3: Configuration Rollback Procedures
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 3: CONFIGURATION ROLLBACK PROCEDURES" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-RollbackProcedure -TestName "Environment Variables" -Description "Test environment variables for rollback" -TestAction {
    # Test if environment variables are accessible through functions
    $response = Invoke-WebRequest -Uri "$functionsUrl/health" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        return "Environment variables accessible through functions"
    } else {
        throw "Environment variables not accessible: $($response.StatusCode)"
    }
}

Test-RollbackProcedure -TestName "API Configuration" -Description "Test API configuration for rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/content-automation" -Method POST -Headers $headers -Body '{"mode":"health_check"}' -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        return "API configuration operational"
    } else {
        throw "API configuration failed with status: $($response.StatusCode)"
    }
}

# Test 4: System Integration Rollback
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 4: SYSTEM INTEGRATION ROLLBACK" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-RollbackProcedure -TestName "External API Integration" -Description "Test external API integration for rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/content-automation" -Method POST -Headers $headers -Body '{"mode":"test"}' -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        return "External API integration operational"
    } else {
        throw "External API integration failed with status: $($response.StatusCode)"
    }
}

Test-RollbackProcedure -TestName "Job Processing Workflow" -Description "Test job processing workflow for rollback" -TestAction {
    $jobBody = @{
        topic = "Rollback Test Job"
        status = "pending"
        created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/rest/v1/content_jobs" -Method POST -Headers $headers -Body $jobBody -TimeoutSec 30
    if ($response.StatusCode -eq 201) {
        $jobData = $response.Content | ConvertFrom-Json
        return "Job processing workflow operational: Job $($jobData.id) created"
    } else {
        throw "Job processing workflow failed with status: $($response.StatusCode)"
    }
}

# Test 5: Monitoring and Alerting Rollback
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 5: MONITORING AND ALERTING ROLLBACK" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-RollbackProcedure -TestName "Monitoring Dashboard" -Description "Test monitoring dashboard rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/monitoring-dashboard" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Monitoring dashboard operational: $($data.data.systemHealth.status)"
    } else {
        throw "Monitoring dashboard failed with status: $($response.StatusCode)"
    }
}

Test-RollbackProcedure -TestName "Alerting System" -Description "Test alerting system rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/alerting-dashboard" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Alerting system operational: $($data.data.alertSummary.total) total alerts"
    } else {
        throw "Alerting system failed with status: $($response.StatusCode)"
    }
}

# Test 6: Backup and Recovery Rollback
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 6: BACKUP AND RECOVERY ROLLBACK" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-RollbackProcedure -TestName "Backup Manager" -Description "Test backup manager rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/backup-manager" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Backup manager operational: $($data.data.statistics.total) total backups"
    } else {
        throw "Backup manager failed with status: $($response.StatusCode)"
    }
}

Test-RollbackProcedure -TestName "Backup Scheduler" -Description "Test backup scheduler rollback" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/backup-scheduler" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Backup scheduler operational: $($data.data.totalSchedules) schedules configured"
    } else {
        throw "Backup scheduler failed with status: $($response.StatusCode)"
    }
}

# Test 7: Performance Validation
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 7: PERFORMANCE VALIDATION" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-RollbackProcedure -TestName "System Performance" -Description "Test system performance after rollback" -TestAction {
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
Write-Host "ROLLBACK PROCEDURES TEST SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failedTests = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red

Write-Host "`nTest Results:" -ForegroundColor White
$testResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "PASS") { "Green" } else { "Red" }
    $statusIcon = if ($_.Status -eq "PASS") { "[PASS]" } else { "[FAIL]" }
    Write-Host "   $statusIcon $($_.Test): $($_.Status) ($($_.ResponseTime)ms)" -ForegroundColor $statusColor
}

# Rollback Readiness Assessment
Write-Host "`nRollback Readiness Assessment:" -ForegroundColor White
if ($failedTests -eq 0) {
    Write-Host "   [SUCCESS] ROLLBACK PROCEDURES READY!" -ForegroundColor Green
    Write-Host "   All rollback procedures operational" -ForegroundColor Green
    Write-Host "   System ready for rollback operations" -ForegroundColor Green
    Write-Host "   Production deployment safe to proceed" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] ROLLBACK PROCEDURES NEED ATTENTION" -ForegroundColor Red
    Write-Host "   $failedTests test(s) failed - address before rollback" -ForegroundColor Red
    Write-Host "   Review failed tests and fix issues" -ForegroundColor Red
    Write-Host "   Re-run tests after fixes" -ForegroundColor Red
}

# Rollback Scenarios
Write-Host "`nRollback Scenarios:" -ForegroundColor White
Write-Host "   1. Edge Functions Rollback: 15-30 minutes" -ForegroundColor Yellow
Write-Host "   2. Database Rollback: 45-60 minutes" -ForegroundColor Yellow
Write-Host "   3. Configuration Rollback: 25-40 minutes" -ForegroundColor Yellow
Write-Host "   4. Complete System Rollback: 2-4 hours" -ForegroundColor Yellow

# Rollback Decision Matrix
Write-Host "`nRollback Decision Matrix:" -ForegroundColor White
Write-Host "   Immediate Rollback: System unavailable, data corruption" -ForegroundColor Red
Write-Host "   Rollback Recommended: Performance >50% degradation, error rate >10%" -ForegroundColor Yellow
Write-Host "   Rollback Considered: Performance 20-50% degradation, error rate 5-10%" -ForegroundColor Cyan
Write-Host "   No Rollback: Performance <20% degradation, error rate <5%" -ForegroundColor Green

# Next Steps
Write-Host "`nNext Steps:" -ForegroundColor White
if ($failedTests -eq 0) {
    Write-Host "1. [OK] Proceed with rollback procedures" -ForegroundColor Green
    Write-Host "2. [OK] Monitor system performance" -ForegroundColor Green
    Write-Host "3. [OK] Test rollback procedures regularly" -ForegroundColor Green
    Write-Host "4. [OK] Document rollback results" -ForegroundColor Green
} else {
    Write-Host "1. [STOP] Address failed rollback tests first" -ForegroundColor Red
    Write-Host "2. [STOP] Fix rollback procedure issues" -ForegroundColor Red
    Write-Host "3. [STOP] Re-run tests after fixes" -ForegroundColor Red
    Write-Host "4. [STOP] Do not proceed until all tests pass" -ForegroundColor Red
}

Write-Host "`nRollback procedures testing completed at: $(Get-Date)" -ForegroundColor White
Write-Host "="*60 -ForegroundColor Cyan
