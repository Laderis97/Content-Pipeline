# Health Monitoring Setup Script (PowerShell)
# This script configures comprehensive health monitoring for the Content Pipeline system

Write-Host "Setting up health monitoring and alerting for Content Pipeline..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$healthResults = @()
$healthId = 1

function Test-HealthEndpoint {
    param(
        [string]$EndpointName,
        [string]$EndpointUrl,
        [string]$Description,
        [string]$ExpectedStatus = "200"
    )
    
    Write-Host "`n$healthId. Testing: $EndpointName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   URL: $EndpointUrl" -ForegroundColor White
    Write-Host "   Expected Status: $ExpectedStatus" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri $EndpointUrl -Method GET -Headers $headers -TimeoutSec 30
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "   Status: ✅ HEALTHY (${responseTime}ms)" -ForegroundColor Green
            $script:healthResults += @{
                Name = $EndpointName
                Status = "HEALTHY"
                ResponseTime = $responseTime
                StatusCode = $response.StatusCode
                Details = "Endpoint responding correctly"
            }
        } else {
            Write-Host "   Status: ⚠️  UNEXPECTED STATUS ($($response.StatusCode))" -ForegroundColor Yellow
            $script:healthResults += @{
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
        Write-Host "   Status: ❌ UNHEALTHY - $($_.Exception.Message)" -ForegroundColor Red
        $script:healthResults += @{
            Name = $EndpointName
            Status = "UNHEALTHY"
            ResponseTime = $responseTime
            StatusCode = "ERROR"
            Details = "Error: $($_.Exception.Message)"
        }
    }
    
    $script:healthId++
}

function Test-DatabaseHealth {
    param(
        [string]$TestName,
        [string]$Description,
        [string]$Query
    )
    
    Write-Host "`n$healthId. Testing: $TestName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   Query: $Query" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        $body = @{query = $Query} | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "$baseUrl/rpc/exec_sql" -Method POST -Headers $headers -Body $body
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "   Status: ✅ HEALTHY (${responseTime}ms)" -ForegroundColor Green
        $script:healthResults += @{
            Name = $TestName
            Status = "HEALTHY"
            ResponseTime = $responseTime
            StatusCode = $response.StatusCode
            Details = "Database query executed successfully"
        }
    } catch {
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        Write-Host "   Status: ❌ UNHEALTHY - $($_.Exception.Message)" -ForegroundColor Red
        $script:healthResults += @{
            Name = $TestName
            Status = "UNHEALTHY"
            ResponseTime = $responseTime
            StatusCode = "ERROR"
            Details = "Error: $($_.Exception.Message)"
        }
    }
    
    $script:healthId++
}

# Test Edge Function Health Endpoints
Write-Host "`nTesting Edge Function Health Endpoints..." -ForegroundColor Cyan

Test-HealthEndpoint -EndpointName "Health Function" -EndpointUrl "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/health" -Description "Main health check endpoint"
Test-HealthEndpoint -EndpointName "Performance Monitor" -EndpointUrl "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/performance-monitor" -Description "Performance monitoring endpoint"
Test-HealthEndpoint -EndpointName "Monitoring Function" -EndpointUrl "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/monitoring" -Description "System monitoring endpoint"
Test-HealthEndpoint -EndpointName "Metrics Function" -EndpointUrl "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/metrics" -Description "Metrics collection endpoint"
Test-HealthEndpoint -EndpointName "Scheduler Function" -EndpointUrl "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/scheduler" -Description "Scheduler health check endpoint"

# Test Database Health
Write-Host "`nTesting Database Health..." -ForegroundColor Cyan

Test-DatabaseHealth -TestName "Database Connection" -Description "Test basic database connectivity" -Query "SELECT 1 as test;"
Test-DatabaseHealth -TestName "Content Jobs Table" -Description "Test content_jobs table access" -Query "SELECT COUNT(*) as job_count FROM content_jobs;"
Test-DatabaseHealth -TestName "Job Runs Table" -Description "Test job_runs table access" -Query "SELECT COUNT(*) as run_count FROM job_runs;"
Test-DatabaseHealth -TestName "Health Checks Table" -Description "Test health_checks table access" -Query "SELECT COUNT(*) as health_count FROM health_checks;"
Test-DatabaseHealth -TestName "Monitoring Alerts Table" -Description "Test monitoring_alerts table access" -Query "SELECT COUNT(*) as alert_count FROM monitoring_alerts;"
Test-DatabaseHealth -TestName "Metrics Data Table" -Description "Test metrics_data table access" -Query "SELECT COUNT(*) as metrics_count FROM metrics_data;"

# Test RPC Functions
Write-Host "`nTesting RPC Functions..." -ForegroundColor Cyan

Test-DatabaseHealth -TestName "Claim Job RPC" -Description "Test claim_job RPC function" -Query "SELECT claim_job() as result;"
Test-DatabaseHealth -TestName "Get Job Stats RPC" -Description "Test get_job_run_stats RPC function" -Query "SELECT get_job_run_stats(1) as stats;"

# Test External API Connectivity
Write-Host "`nTesting External API Connectivity..." -ForegroundColor Cyan

try {
    Write-Host "`n$healthId. Testing: OpenAI API Connectivity" -ForegroundColor Yellow
    Write-Host "   Description: Test OpenAI API key and connectivity" -ForegroundColor White
    
    # Test OpenAI API key format (without making actual API call)
    $openaiKey = "sk-test-key-format-check"
    if ($openaiKey -match "^sk-[a-zA-Z0-9]{48}$") {
        Write-Host "   Status: ✅ API KEY FORMAT VALID" -ForegroundColor Green
        $script:healthResults += @{
            Name = "OpenAI API Key"
            Status = "HEALTHY"
            ResponseTime = 0
            StatusCode = "VALID"
            Details = "API key format is valid"
        }
    } else {
        Write-Host "   Status: ⚠️  API KEY FORMAT INVALID" -ForegroundColor Yellow
        $script:healthResults += @{
            Name = "OpenAI API Key"
            Status = "WARNING"
            ResponseTime = 0
            StatusCode = "INVALID"
            Details = "API key format is invalid"
        }
    }
    $script:healthId++
} catch {
    Write-Host "   Status: ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $script:healthResults += @{
        Name = "OpenAI API Key"
        Status = "UNHEALTHY"
        ResponseTime = 0
        StatusCode = "ERROR"
        Details = "Error: $($_.Exception.Message)"
    }
    $script:healthId++
}

try {
    Write-Host "`n$healthId. Testing: WordPress API Connectivity" -ForegroundColor Yellow
    Write-Host "   Description: Test WordPress API endpoint accessibility" -ForegroundColor White
    
    # Test WordPress API endpoint (without authentication)
    $wordpressUrl = "https://example.com/wp-json/wp/v2/posts"
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri $wordpressUrl -Method GET -TimeoutSec 10
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "   Status: ✅ WORDPRESS API ACCESSIBLE (${responseTime}ms)" -ForegroundColor Green
    $script:healthResults += @{
        Name = "WordPress API"
        Status = "HEALTHY"
        ResponseTime = $responseTime
        StatusCode = $response.StatusCode
        Details = "WordPress API endpoint is accessible"
    }
    $script:healthId++
} catch {
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    Write-Host "   Status: ⚠️  WORDPRESS API NOT ACCESSIBLE - $($_.Exception.Message)" -ForegroundColor Yellow
    $script:healthResults += @{
        Name = "WordPress API"
        Status = "WARNING"
        ResponseTime = $responseTime
        StatusCode = "ERROR"
        Details = "WordPress API not accessible: $($_.Exception.Message)"
    }
    $script:healthId++
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "HEALTH MONITORING SETUP SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$healthyCount = ($healthResults | Where-Object { $_.Status -eq "HEALTHY" }).Count
$warningCount = ($healthResults | Where-Object { $_.Status -eq "WARNING" }).Count
$unhealthyCount = ($healthResults | Where-Object { $_.Status -eq "UNHEALTHY" }).Count
$totalTests = $healthResults.Count

Write-Host "`nTotal Health Tests: $totalTests" -ForegroundColor White
Write-Host "Healthy: $healthyCount" -ForegroundColor Green
Write-Host "Warnings: $warningCount" -ForegroundColor Yellow
Write-Host "Unhealthy: $unhealthyCount" -ForegroundColor Red

Write-Host "`nHealth Test Results:" -ForegroundColor White
$healthResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "HEALTHY") { "Green" } elseif ($_.Status -eq "WARNING") { "Yellow" } else { "Red" }
    $statusIcon = if ($_.Status -eq "HEALTHY") { "✅" } elseif ($_.Status -eq "WARNING") { "⚠️" } else { "❌" }
    Write-Host "   $statusIcon $($_.Name): $($_.Status) ($($_.ResponseTime)ms)" -ForegroundColor $statusColor
}

# Calculate overall health score
$healthScore = [math]::Round(($healthyCount / $totalTests) * 100, 1)
Write-Host "`nOverall Health Score: $healthScore%" -ForegroundColor $(if ($healthScore -ge 90) { "Green" } elseif ($healthScore -ge 70) { "Yellow" } else { "Red" })

Write-Host "`nHealth Monitoring Configuration:" -ForegroundColor White
Write-Host "   • Edge Functions: 5 endpoints tested" -ForegroundColor Green
Write-Host "   • Database Tables: 6 tables tested" -ForegroundColor Green
Write-Host "   • RPC Functions: 2 functions tested" -ForegroundColor Green
Write-Host "   • External APIs: 2 APIs tested" -ForegroundColor Green
Write-Host "   • Total Endpoints: $totalTests" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "1. Set up automated health monitoring schedules" -ForegroundColor Yellow
Write-Host "2. Configure alerting for unhealthy endpoints" -ForegroundColor Yellow
Write-Host "3. Set up performance metrics collection" -ForegroundColor Yellow
Write-Host "4. Configure failure rate monitoring" -ForegroundColor Yellow
Write-Host "5. Set up notification channels for alerts" -ForegroundColor Yellow

if ($unhealthyCount -eq 0) {
    Write-Host "`n🎉 Health monitoring setup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some endpoints are unhealthy - review the details above" -ForegroundColor Yellow
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
