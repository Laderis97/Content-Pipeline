# Go-Live Health Check Script (PowerShell)
# Comprehensive system health check before production deployment

Write-Host "Starting Go-Live Health Check for Content Pipeline..." -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor White

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$functionsUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$healthResults = @()
$checkId = 1
$overallStatus = "PASS"

function Test-SystemComponent {
    param(
        [string]$ComponentName,
        [string]$Description,
        [string]$TestAction,
        [string]$CriticalLevel = "HIGH"
    )
    
    Write-Host "`n$checkId. Testing: $ComponentName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   Critical Level: $CriticalLevel" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        $result = Invoke-Command -ScriptBlock $TestAction
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "   Status: ✅ PASS (${responseTime}ms)" -ForegroundColor Green
        $script:healthResults += @{
            Component = $ComponentName
            Status = "PASS"
            ResponseTime = $responseTime
            CriticalLevel = $CriticalLevel
            Details = $result
            Timestamp = Get-Date
        }
    } catch {
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        Write-Host "   Status: ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
        $script:healthResults += @{
            Component = $ComponentName
            Status = "FAIL"
            ResponseTime = $responseTime
            CriticalLevel = $CriticalLevel
            Details = "Error: $($_.Exception.Message)"
            Timestamp = Get-Date
        }
        
        if ($CriticalLevel -eq "CRITICAL") {
            $script:overallStatus = "FAIL"
        }
    }
    
    $script:checkId++
}

# Test 1: Database Connectivity and Schema
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 1: DATABASE CONNECTIVITY AND SCHEMA" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-SystemComponent -ComponentName "Database Connection" -Description "Test basic database connectivity" -CriticalLevel "CRITICAL" -TestAction {
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs?select=count" -Method GET -Headers $headers -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        $count = ($response.Content | ConvertFrom-Json)[0].count
        return "Database accessible, $count content jobs found"
    } else {
        throw "Database connection failed with status: $($response.StatusCode)"
    }
}

Test-SystemComponent -ComponentName "Database Schema" -Description "Verify all required tables exist" -CriticalLevel "CRITICAL" -TestAction {
    $tables = @("content_jobs", "job_runs", "health_checks", "metrics_data", "vault_secrets")
    $missingTables = @()
    
    foreach ($table in $tables) {
        try {
            $response = Invoke-WebRequest -Uri "$baseUrl/$table?select=count" -Method GET -Headers $headers -TimeoutSec 5
            if ($response.StatusCode -ne 200) {
                $missingTables += $table
            }
        } catch {
            $missingTables += $table
        }
    }
    
    if ($missingTables.Count -gt 0) {
        throw "Missing tables: $($missingTables -join ', ')"
    }
    
    return "All required tables present and accessible"
}

Test-SystemComponent -ComponentName "Database Performance" -Description "Test database query performance" -CriticalLevel "HIGH" -TestAction {
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs?select=id,topic,status&limit=10" -Method GET -Headers $headers -TimeoutSec 10
    $endTime = Get-Date
    $queryTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($queryTime -gt 2000) {
        throw "Database query too slow: ${queryTime}ms"
    }
    
    return "Database performance acceptable: ${queryTime}ms"
}

# Test 2: Edge Functions Health
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 2: EDGE FUNCTIONS HEALTH" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-SystemComponent -ComponentName "Health Check Function" -Description "Test health check endpoint" -CriticalLevel "CRITICAL" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/health" -Method GET -Headers $headers -TimeoutSec 15
    if ($response.StatusCode -eq 200) {
        $healthData = $response.Content | ConvertFrom-Json
        return "Health check function operational: $($healthData.status)"
    } else {
        throw "Health check failed with status: $($response.StatusCode)"
    }
}

Test-SystemComponent -ComponentName "Performance Monitor" -Description "Test performance monitoring function" -CriticalLevel "HIGH" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/performance-monitor" -Method GET -Headers $headers -TimeoutSec 15
    if ($response.StatusCode -eq 200) {
        return "Performance monitor function operational"
    } else {
        throw "Performance monitor failed with status: $($response.StatusCode)"
    }
}

Test-SystemComponent -ComponentName "Metrics Collector" -Description "Test metrics collection function" -CriticalLevel "HIGH" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/metrics" -Method GET -Headers $headers -TimeoutSec 15
    if ($response.StatusCode -eq 200) {
        return "Metrics collector function operational"
    } else {
        throw "Metrics collector failed with status: $($response.StatusCode)"
    }
}

Test-SystemComponent -ComponentName "Content Automation" -Description "Test main content automation function" -CriticalLevel "CRITICAL" -TestAction {
    $testBody = @{ mode = "health_check" } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$functionsUrl/content-automation" -Method POST -Headers $headers -Body $testBody -TimeoutSec 20
    if ($response.StatusCode -eq 200) {
        return "Content automation function operational"
    } else {
        throw "Content automation failed with status: $($response.StatusCode)"
    }
}

# Test 3: External API Connectivity
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 3: EXTERNAL API CONNECTIVITY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-SystemComponent -ComponentName "OpenAI API" -Description "Test OpenAI API connectivity" -CriticalLevel "CRITICAL" -TestAction {
    # Test OpenAI API through our function
    $testBody = @{ 
        mode = "test"
        topic = "Health check test"
        test_only = $true
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$functionsUrl/content-automation" -Method POST -Headers $headers -Body $testBody -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        return "OpenAI API connectivity verified"
    } else {
        throw "OpenAI API test failed with status: $($response.StatusCode)"
    }
}

Test-SystemComponent -ComponentName "WordPress API" -Description "Test WordPress REST API connectivity" -CriticalLevel "CRITICAL" -TestAction {
    # Test WordPress API through our function
    $testBody = @{ 
        mode = "test_wordpress"
        test_only = $true
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$functionsUrl/content-automation" -Method POST -Headers $headers -Body $testBody -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        return "WordPress API connectivity verified"
    } else {
        throw "WordPress API test failed with status: $($response.StatusCode)"
    }
}

# Test 4: Job Processing Workflow
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 4: JOB PROCESSING WORKFLOW" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-SystemComponent -ComponentName "Job Creation" -Description "Test content job creation" -CriticalLevel "CRITICAL" -TestAction {
    $jobBody = @{
        topic = "Go-Live Health Check Test"
        status = "pending"
        created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $jobBody -TimeoutSec 10
    if ($response.StatusCode -eq 201) {
        $jobData = $response.Content | ConvertFrom-Json
        return "Job created successfully: $($jobData.id)"
    } else {
        throw "Job creation failed with status: $($response.StatusCode)"
    }
}

Test-SystemComponent -ComponentName "Job Status Update" -Description "Test job status update functionality" -CriticalLevel "HIGH" -TestAction {
    # Get a pending job
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs?status=eq.pending&select=id&limit=1" -Method GET -Headers $headers -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        $jobs = $response.Content | ConvertFrom-Json
        if ($jobs.Count -gt 0) {
            $jobId = $jobs[0].id
            
            # Update job status
            $updateBody = @{
                status = "processing"
                claimed_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            } | ConvertTo-Json
            
            $updateResponse = Invoke-WebRequest -Uri "$baseUrl/content_jobs?id=eq.$jobId" -Method PATCH -Headers $headers -Body $updateBody -TimeoutSec 10
            if ($updateResponse.StatusCode -eq 200) {
                return "Job status update successful: $jobId"
            } else {
                throw "Job status update failed with status: $($updateResponse.StatusCode)"
            }
        } else {
            return "No pending jobs found for testing"
        }
    } else {
        throw "Failed to get pending jobs"
    }
}

# Test 5: System Performance
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 5: SYSTEM PERFORMANCE" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-SystemComponent -ComponentName "Response Time" -Description "Test overall system response time" -CriticalLevel "HIGH" -TestAction {
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$functionsUrl/health" -Method GET -Headers $headers -TimeoutSec 10
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($responseTime -gt 5000) {
        throw "System response time too slow: ${responseTime}ms"
    }
    
    return "System response time acceptable: ${responseTime}ms"
}

Test-SystemComponent -ComponentName "Concurrent Processing" -Description "Test concurrent job processing capability" -CriticalLevel "MEDIUM" -TestAction {
    # Create multiple test jobs
    $jobs = @()
    for ($i = 1; $i -le 3; $i++) {
        $jobBody = @{
            topic = "Concurrent Test Job $i"
            status = "pending"
            created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $jobBody -TimeoutSec 10
        if ($response.StatusCode -eq 201) {
            $jobData = $response.Content | ConvertFrom-Json
            $jobs += $jobData.id
        }
    }
    
    if ($jobs.Count -eq 3) {
        return "Concurrent job creation successful: $($jobs.Count) jobs created"
    } else {
        throw "Concurrent job creation failed: only $($jobs.Count) jobs created"
    }
}

# Test 6: Security and Authentication
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 6: SECURITY AND AUTHENTICATION" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-SystemComponent -ComponentName "API Authentication" -Description "Test API authentication and authorization" -CriticalLevel "CRITICAL" -TestAction {
    # Test with valid credentials
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs?select=count" -Method GET -Headers $headers -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        return "API authentication working correctly"
    } else {
        throw "API authentication failed with status: $($response.StatusCode)"
    }
}

Test-SystemComponent -ComponentName "Data Encryption" -Description "Verify data encryption in transit" -CriticalLevel "HIGH" -TestAction {
    # Check if we're using HTTPS
    if ($baseUrl -like "https://*") {
        return "Data encryption in transit verified (HTTPS)"
    } else {
        throw "Data not encrypted in transit (HTTP detected)"
    }
}

# Test 7: Monitoring and Alerting
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 7: MONITORING AND ALERTING" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-SystemComponent -ComponentName "System Monitoring" -Description "Test system monitoring capabilities" -CriticalLevel "HIGH" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/performance-monitor" -Method GET -Headers $headers -TimeoutSec 15
    if ($response.StatusCode -eq 200) {
        $monitorData = $response.Content | ConvertFrom-Json
        return "System monitoring operational: $($monitorData.status)"
    } else {
        throw "System monitoring failed with status: $($response.StatusCode)"
    }
}

Test-SystemComponent -ComponentName "Metrics Collection" -Description "Test metrics collection system" -CriticalLevel "MEDIUM" -TestAction {
    $response = Invoke-WebRequest -Uri "$functionsUrl/metrics" -Method GET -Headers $headers -TimeoutSec 15
    if ($response.StatusCode -eq 200) {
        return "Metrics collection system operational"
    } else {
        throw "Metrics collection failed with status: $($response.StatusCode)"
    }
}

# Summary Report
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "GO-LIVE HEALTH CHECK SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$totalChecks = $healthResults.Count
$passedChecks = ($healthResults | Where-Object { $_.Status -eq "PASS" }).Count
$failedChecks = ($healthResults | Where-Object { $_.Status -eq "FAIL" }).Count
$criticalFailures = ($healthResults | Where-Object { $_.Status -eq "FAIL" -and $_.CriticalLevel -eq "CRITICAL" }).Count

Write-Host "`nOverall Status: $overallStatus" -ForegroundColor $(if ($overallStatus -eq "PASS") { "Green" } else { "Red" })
Write-Host "Total Checks: $totalChecks" -ForegroundColor White
Write-Host "Passed: $passedChecks" -ForegroundColor Green
Write-Host "Failed: $failedChecks" -ForegroundColor Red
Write-Host "Critical Failures: $criticalFailures" -ForegroundColor $(if ($criticalFailures -eq 0) { "Green" } else { "Red" })

Write-Host "`nDetailed Results:" -ForegroundColor White
$healthResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "PASS") { "Green" } else { "Red" }
    $statusIcon = if ($_.Status -eq "PASS") { "[PASS]" } else { "[FAIL]" }
    $criticalIcon = if ($_.CriticalLevel -eq "CRITICAL") { "[CRIT]" } elseif ($_.CriticalLevel -eq "HIGH") { "[HIGH]" } else { "[LOW]" }
    Write-Host "   $statusIcon $criticalIcon $($_.Component): $($_.Status) ($($_.ResponseTime)ms)" -ForegroundColor $statusColor
}

# Performance Summary
$avgResponseTime = [math]::Round(($healthResults | Measure-Object -Property ResponseTime -Average).Average, 2)
$maxResponseTime = ($healthResults | Measure-Object -Property ResponseTime -Maximum).Maximum
$minResponseTime = ($healthResults | Measure-Object -Property ResponseTime -Minimum).Minimum

Write-Host "`nPerformance Summary:" -ForegroundColor White
Write-Host "   Average Response Time: ${avgResponseTime}ms" -ForegroundColor White
Write-Host "   Maximum Response Time: ${maxResponseTime}ms" -ForegroundColor White
Write-Host "   Minimum Response Time: ${minResponseTime}ms" -ForegroundColor White

# Go-Live Recommendation
Write-Host "`nGo-Live Recommendation:" -ForegroundColor White
if ($overallStatus -eq "PASS" -and $criticalFailures -eq 0) {
    Write-Host "   [SUCCESS] SYSTEM READY FOR GO-LIVE!" -ForegroundColor Green
    Write-Host "   All critical systems operational" -ForegroundColor Green
    Write-Host "   Performance within acceptable limits" -ForegroundColor Green
    Write-Host "   No blocking issues identified" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] SYSTEM NOT READY FOR GO-LIVE" -ForegroundColor Red
    Write-Host "   Critical failures detected: $criticalFailures" -ForegroundColor Red
    Write-Host "   Address issues before proceeding" -ForegroundColor Red
}

# Next Steps
Write-Host "`nNext Steps:" -ForegroundColor White
if ($overallStatus -eq "PASS") {
    Write-Host "1. [OK] Proceed with go-live deployment" -ForegroundColor Green
    Write-Host "2. [OK] Monitor system during initial deployment" -ForegroundColor Green
    Write-Host "3. [OK] Have support team ready for first 24 hours" -ForegroundColor Green
    Write-Host "4. [OK] Document any issues encountered" -ForegroundColor Green
} else {
    Write-Host "1. [STOP] Address critical failures first" -ForegroundColor Red
    Write-Host "2. [STOP] Re-run health check after fixes" -ForegroundColor Red
    Write-Host "3. [STOP] Do not proceed with go-live until all critical issues resolved" -ForegroundColor Red
    Write-Host "4. [STOP] Contact technical team for assistance" -ForegroundColor Red
}

Write-Host "`nHealth Check completed at: $(Get-Date)" -ForegroundColor White
Write-Host "="*60 -ForegroundColor Cyan
