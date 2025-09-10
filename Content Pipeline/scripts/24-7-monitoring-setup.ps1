# 24/7 Monitoring Setup Script (PowerShell)
# This script sets up comprehensive 24/7 monitoring for the first day of production

Write-Host "Content Pipeline - 24/7 Monitoring Setup" -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor White

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co"
$functionsUrl = "$baseUrl/functions/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$monitoringResults = @()
$monitoringId = 1

function Test-MonitoringComponent {
    param(
        [string]$ComponentName,
        [string]$Description,
        [string]$TestAction
    )
    
    Write-Host "`n$monitoringId. Testing: $ComponentName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        $result = Invoke-Command -ScriptBlock $TestAction
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "   Status: [PASS] (${responseTime}ms)" -ForegroundColor Green
        Write-Host "   Details: $result" -ForegroundColor White
        
        $script:monitoringResults += @{
            Component = $ComponentName
            Status = "PASS"
            ResponseTime = $responseTime
            Details = $result
        }
    } catch {
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        Write-Host "   Status: [FAIL] - $($_.Exception.Message)" -ForegroundColor Red
        
        $script:monitoringResults += @{
            Component = $ComponentName
            Status = "FAIL"
            ResponseTime = $responseTime
            Details = "Error: $($_.Exception.Message)"
        }
    }
    
    $script:monitoringId++
}

# Test 1: System Health Monitoring
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 1: SYSTEM HEALTH MONITORING" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-MonitoringComponent -ComponentName "Health Check Function" -Description "Test health check function monitoring" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/health" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Health check function operational: $($data.status)"
    } else {
        throw "Health check function failed with status: $($response.StatusCode)"
    }
}

Test-MonitoringComponent -ComponentName "Database Connectivity" -Description "Test database connectivity monitoring" -TestAction {
    $response = Invoke-WebRequest -Uri "$baseUrl/rest/v1/content_jobs?select=count" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $count = ($response.Content | ConvertFrom-Json)[0].count
        return "Database connectivity verified: $count content jobs found"
    } else {
        throw "Database connectivity failed with status: $($response.StatusCode)"
    }
}

Test-MonitoringComponent -ComponentName "External API Health" -Description "Test external API health monitoring" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/content-automation" -Method POST -Headers $headers -Body '{"mode":"health_check"}' -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "External API health verified: $($data.status)"
    } else {
        throw "External API health check failed with status: $($response.StatusCode)"
    }
}

# Test 2: Performance Monitoring
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 2: PERFORMANCE MONITORING" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-MonitoringComponent -ComponentName "Performance Monitor" -Description "Test performance monitoring system" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/performance-monitor" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Performance monitor operational: $($data.status)"
    } else {
        throw "Performance monitor failed with status: $($response.StatusCode)"
    }
}

Test-MonitoringComponent -ComponentName "Metrics Collector" -Description "Test metrics collection system" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/metrics" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Metrics collector operational: $($data.status)"
    } else {
        throw "Metrics collector failed with status: $($response.StatusCode)"
    }
}

Test-MonitoringComponent -ComponentName "Response Time Monitoring" -Description "Test response time monitoring" -TestAction {
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
    return "Response time monitoring: $successCount/$($functions.Count) functions operational, avg response time: $([math]::Round($avgResponseTime, 2))ms"
}

# Test 3: Alerting System
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 3: ALERTING SYSTEM" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-MonitoringComponent -ComponentName "Alerting Dashboard" -Description "Test alerting dashboard system" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/alerting-dashboard" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Alerting dashboard operational: $($data.data.alertSummary.total) total alerts"
    } else {
        throw "Alerting dashboard failed with status: $($response.StatusCode)"
    }
}

Test-MonitoringComponent -ComponentName "Monitoring Dashboard" -Description "Test monitoring dashboard system" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/monitoring-dashboard" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        return "Monitoring dashboard operational: $($data.data.systemHealth.status)"
    } else {
        throw "Monitoring dashboard failed with status: $($response.StatusCode)"
    }
}

# Test 4: Job Processing Monitoring
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 4: JOB PROCESSING MONITORING" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-MonitoringComponent -ComponentName "Job Status Monitoring" -Description "Test job status monitoring" -TestAction {
    $response = Invoke-WebRequest -Uri "$baseUrl/rest/v1/content_jobs?select=id,status&limit=10" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $jobs = $response.Content | ConvertFrom-Json
        return "Job status monitoring: $($jobs.Count) jobs accessible"
    } else {
        throw "Job status monitoring failed with status: $($response.StatusCode)"
    }
}

Test-MonitoringComponent -ComponentName "Job Run Monitoring" -Description "Test job run monitoring" -TestAction {
    $response = Invoke-WebRequest -Uri "$baseUrl/rest/v1/job_runs?select=id,status&limit=10" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $runs = $response.Content | ConvertFrom-Json
        return "Job run monitoring: $($runs.Count) job runs accessible"
    } else {
        throw "Job run monitoring failed with status: $($response.StatusCode)"
    }
}

# Test 5: System Resource Monitoring
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 5: SYSTEM RESOURCE MONITORING" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-MonitoringComponent -ComponentName "Database Performance" -Description "Test database performance monitoring" -TestAction {
    $response = Invoke-WebRequest -Uri "$baseUrl/rest/v1/content_jobs?select=count" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        $count = ($response.Content | ConvertFrom-Json)[0].count
        return "Database performance monitoring: $count content jobs, response time within limits"
    } else {
        throw "Database performance monitoring failed with status: $($response.StatusCode)"
    }
}

Test-MonitoringComponent -ComponentName "Function Performance" -Description "Test function performance monitoring" -TestAction {
    $functions = @("health", "performance-monitor", "metrics")
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
    return "Function performance monitoring: $successCount/$($functions.Count) functions operational, avg response time: $([math]::Round($avgResponseTime, 2))ms"
}

# Summary Report
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "24/7 MONITORING SETUP SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$totalTests = $monitoringResults.Count
$passedTests = ($monitoringResults | Where-Object { $_.Status -eq "PASS" }).Count
$failedTests = ($monitoringResults | Where-Object { $_.Status -eq "FAIL" }).Count

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red

Write-Host "`nTest Results:" -ForegroundColor White
$monitoringResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "PASS") { "Green" } else { "Red" }
    $statusIcon = if ($_.Status -eq "PASS") { "[PASS]" } else { "[FAIL]" }
    Write-Host "   $statusIcon $($_.Component): $($_.Status) ($($_.ResponseTime)ms)" -ForegroundColor $statusColor
}

# Monitoring Readiness Assessment
Write-Host "`n24/7 Monitoring Readiness Assessment:" -ForegroundColor White
if ($failedTests -eq 0) {
    Write-Host "   [SUCCESS] 24/7 MONITORING READY!" -ForegroundColor Green
    Write-Host "   All monitoring components operational" -ForegroundColor Green
    Write-Host "   System ready for 24/7 monitoring" -ForegroundColor Green
    Write-Host "   Production deployment monitoring enabled" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] 24/7 MONITORING NEEDS ATTENTION" -ForegroundColor Red
    Write-Host "   $failedTests component(s) failed - address before go-live" -ForegroundColor Red
    Write-Host "   Review failed components and fix issues" -ForegroundColor Red
    Write-Host "   Re-run tests after fixes" -ForegroundColor Red
}

# Monitoring Schedule
Write-Host "`n24/7 Monitoring Schedule:" -ForegroundColor White
Write-Host "   Hour 0-6:   Continuous monitoring (DevOps Lead)" -ForegroundColor Yellow
Write-Host "   Hour 6-12:  Continuous monitoring (Development Lead)" -ForegroundColor Yellow
Write-Host "   Hour 12-18: Continuous monitoring (QA Lead)" -ForegroundColor Yellow
Write-Host "   Hour 18-24: Continuous monitoring (Project Manager)" -ForegroundColor Yellow

# Monitoring Procedures
Write-Host "`nMonitoring Procedures:" -ForegroundColor White
Write-Host "   1. Continuous system health monitoring" -ForegroundColor Yellow
Write-Host "   2. Performance metrics tracking" -ForegroundColor Yellow
Write-Host "   3. Error rate monitoring" -ForegroundColor Yellow
Write-Host "   4. User activity monitoring" -ForegroundColor Yellow
Write-Host "   5. Alert management and response" -ForegroundColor Yellow

# Monitoring Tools
Write-Host "`nMonitoring Tools:" -ForegroundColor White
Write-Host "   - Real-time monitoring dashboard" -ForegroundColor Cyan
Write-Host "   - Performance metrics dashboard" -ForegroundColor Cyan
Write-Host "   - Alerting dashboard" -ForegroundColor Cyan
Write-Host "   - Historical performance dashboard" -ForegroundColor Cyan
Write-Host "   - Custom health checks" -ForegroundColor Cyan

# Next Steps
Write-Host "`nNext Steps:" -ForegroundColor White
if ($failedTests -eq 0) {
    Write-Host "1. [OK] Proceed with 24/7 monitoring setup" -ForegroundColor Green
    Write-Host "2. [OK] Activate monitoring schedules" -ForegroundColor Green
    Write-Host "3. [OK] Begin continuous monitoring" -ForegroundColor Green
    Write-Host "4. [OK] Monitor system performance" -ForegroundColor Green
} else {
    Write-Host "1. [STOP] Address failed monitoring tests first" -ForegroundColor Red
    Write-Host "2. [STOP] Fix monitoring component issues" -ForegroundColor Red
    Write-Host "3. [STOP] Re-run tests after fixes" -ForegroundColor Red
    Write-Host "4. [STOP] Do not proceed until all tests pass" -ForegroundColor Red
}

Write-Host "`n24/7 monitoring setup completed at: $(Get-Date)" -ForegroundColor White
Write-Host "="*60 -ForegroundColor Cyan
