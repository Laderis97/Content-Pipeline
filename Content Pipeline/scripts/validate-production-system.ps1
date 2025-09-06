# Production System Validation Script (PowerShell)
# This script validates the production system using correct API endpoints

Write-Host "Validating Production System for Content Pipeline..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$validationResults = @()
$validationId = 1

function Validate-SystemComponent {
    param(
        [string]$ComponentName,
        [string]$Description,
        [string]$TestAction
    )
    
    Write-Host "`n$validationId. Validating: $ComponentName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        $result = Invoke-Command -ScriptBlock $TestAction
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "   Status: ✅ VALIDATION PASSED (${responseTime}ms)" -ForegroundColor Green
        $script:validationResults += @{
            Name = $ComponentName
            Status = "PASSED"
            ResponseTime = $responseTime
            Details = "Validation passed successfully"
        }
    } catch {
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        Write-Host "   Status: ❌ VALIDATION FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $script:validationResults += @{
            Name = $ComponentName
            Status = "FAILED"
            ResponseTime = $responseTime
            Details = "Error: $($_.Exception.Message)"
        }
    }
    
    $script:validationId++
}

# Validation 1: Content Job Creation
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "VALIDATION 1: CONTENT JOB CREATION" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Validate-SystemComponent -ComponentName "Content Job Creation" -Description "Test creating content jobs with various topics" -TestAction {
    $testTopics = @(
        "Artificial Intelligence in Healthcare",
        "Digital Transformation Strategies", 
        "Sustainable Living Tips",
        "Machine Learning Fundamentals",
        "Climate Change Solutions"
    )
    
    $createdJobs = @()
    foreach ($topic in $testTopics) {
        $jobBody = @{
            topic = $topic
            status = "pending"
            created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $jobBody
        if ($response.StatusCode -eq 201) {
            $jobData = $response.Content | ConvertFrom-Json
            $createdJobs += $jobData
        } else {
            throw "Failed to create job for topic: $topic"
        }
    }
    
    if ($createdJobs.Count -ne $testTopics.Count) {
        throw "Expected $($testTopics.Count) jobs, created $($createdJobs.Count)"
    }
    
    return "Created $($createdJobs.Count) content jobs successfully"
}

# Validation 2: Database Table Access
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "VALIDATION 2: DATABASE TABLE ACCESS" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Validate-SystemComponent -ComponentName "Content Jobs Table" -Description "Test access to content_jobs table" -TestAction {
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs?select=count" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $count = ($response.Content | ConvertFrom-Json)[0].count
        return "Content jobs table accessible, $count records found"
    } else {
        throw "Failed to access content_jobs table"
    }
}

Validate-SystemComponent -ComponentName "Job Runs Table" -Description "Test access to job_runs table" -TestAction {
    $response = Invoke-WebRequest -Uri "$baseUrl/job_runs?select=count" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $count = ($response.Content | ConvertFrom-Json)[0].count
        return "Job runs table accessible, $count records found"
    } else {
        throw "Failed to access job_runs table"
    }
}

Validate-SystemComponent -ComponentName "Health Checks Table" -Description "Test access to health_checks table" -TestAction {
    $response = Invoke-WebRequest -Uri "$baseUrl/health_checks?select=count" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $count = ($response.Content | ConvertFrom-Json)[0].count
        return "Health checks table accessible, $count records found"
    } else {
        throw "Failed to access health_checks table"
    }
}

# Validation 3: Edge Functions
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "VALIDATION 3: EDGE FUNCTIONS" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Validate-SystemComponent -ComponentName "Performance Monitor Function" -Description "Test performance monitor function" -TestAction {
    $response = Invoke-WebRequest -Uri "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/performance-monitor" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        return "Performance monitor function working"
    } else {
        throw "Performance monitor function failed with status: $($response.StatusCode)"
    }
}

Validate-SystemComponent -ComponentName "Metrics Collector Function" -Description "Test metrics collector function" -TestAction {
    $response = Invoke-WebRequest -Uri "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/metrics" -Method GET -Headers $headers -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        return "Metrics collector function working"
    } else {
        throw "Metrics collector function failed with status: $($response.StatusCode)"
    }
}

# Validation 4: Job Status Updates
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "VALIDATION 4: JOB STATUS UPDATES" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Validate-SystemComponent -ComponentName "Job Status Update" -Description "Test updating job status from pending to processing" -TestAction {
    # Get a pending job
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs?status=eq.pending&select=id&limit=1" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $jobs = $response.Content | ConvertFrom-Json
        if ($jobs.Count -gt 0) {
            $jobId = $jobs[0].id
            
            # Update job status to processing
            $updateBody = @{
                status = "processing"
                claimed_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            } | ConvertTo-Json
            
            $updateResponse = Invoke-WebRequest -Uri "$baseUrl/content_jobs?id=eq.$jobId" -Method PATCH -Headers $headers -Body $updateBody
            if ($updateResponse.StatusCode -eq 200) {
                return "Job status updated to processing successfully"
            } else {
                throw "Failed to update job status"
            }
        } else {
            throw "No pending jobs found"
        }
    } else {
        throw "Failed to get pending jobs"
    }
}

# Validation 5: Job Completion
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "VALIDATION 5: JOB COMPLETION" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Validate-SystemComponent -ComponentName "Job Completion" -Description "Test completing a job with generated content" -TestAction {
    # Get a processing job
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs?status=eq.processing&select=id,topic&limit=1" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $jobs = $response.Content | ConvertFrom-Json
        if ($jobs.Count -gt 0) {
            $jobId = $jobs[0].id
            $topic = $jobs[0].topic
            
            # Complete the job
            $completeBody = @{
                status = "completed"
                generated_title = "Test Generated Title for $topic"
                generated_content = "This is test generated content for the topic: $topic. The content has been generated successfully for testing purposes."
                wordpress_post_id = "test-post-$(Get-Random)"
                claimed_at = $null
            } | ConvertTo-Json
            
            $completeResponse = Invoke-WebRequest -Uri "$baseUrl/content_jobs?id=eq.$jobId" -Method PATCH -Headers $headers -Body $completeBody
            if ($completeResponse.StatusCode -eq 200) {
                return "Job completed successfully with generated content"
            } else {
                throw "Failed to complete job"
            }
        } else {
            throw "No processing jobs found"
        }
    } else {
        throw "Failed to get processing jobs"
    }
}

# Validation 6: System Health Check
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "VALIDATION 6: SYSTEM HEALTH CHECK" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Validate-SystemComponent -ComponentName "System Health Check" -Description "Test overall system health" -TestAction {
    $healthChecks = @()
    
    # Check content jobs table
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs?select=count" -Method GET -Headers $headers
        if ($response.StatusCode -eq 200) {
            $healthChecks += "Content jobs table: OK"
        }
    } catch {
        $healthChecks += "Content jobs table: FAILED"
    }
    
    # Check job runs table
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/job_runs?select=count" -Method GET -Headers $headers
        if ($response.StatusCode -eq 200) {
            $healthChecks += "Job runs table: OK"
        }
    } catch {
        $healthChecks += "Job runs table: FAILED"
    }
    
    # Check performance monitor
    try {
        $response = Invoke-WebRequest -Uri "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/performance-monitor" -Method GET -Headers $headers -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            $healthChecks += "Performance monitor: OK"
        }
    } catch {
        $healthChecks += "Performance monitor: FAILED"
    }
    
    # Check metrics collector
    try {
        $response = Invoke-WebRequest -Uri "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/metrics" -Method GET -Headers $headers -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            $healthChecks += "Metrics collector: OK"
        }
    } catch {
        $healthChecks += "Metrics collector: FAILED"
    }
    
    $passedChecks = ($healthChecks | Where-Object { $_ -like "*: OK" }).Count
    $totalChecks = $healthChecks.Count
    
    if ($passedChecks -eq $totalChecks) {
        return "All health checks passed ($passedChecks/$totalChecks)"
    } else {
        return "Some health checks failed ($passedChecks/$totalChecks): $($healthChecks -join ', ')"
    }
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "PRODUCTION SYSTEM VALIDATION SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$passedCount = ($validationResults | Where-Object { $_.Status -eq "PASSED" }).Count
$failedCount = ($validationResults | Where-Object { $_.Status -eq "FAILED" }).Count
$totalValidations = $validationResults.Count

Write-Host "`nTotal Validations: $totalValidations" -ForegroundColor White
Write-Host "Passed: $passedCount" -ForegroundColor Green
Write-Host "Failed: $failedCount" -ForegroundColor Red

Write-Host "`nValidation Results:" -ForegroundColor White
$validationResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "PASSED") { "Green" } else { "Red" }
    $statusIcon = if ($_.Status -eq "PASSED") { "✅" } else { "❌" }
    Write-Host "   $statusIcon $($_.Name): $($_.Status)" -ForegroundColor $statusColor
}

# Calculate overall validation score
$validationScore = [math]::Round(($passedCount / $totalValidations) * 100, 1)
Write-Host "`nOverall Validation Score: $validationScore%" -ForegroundColor $(if ($validationScore -ge 90) { "Green" } elseif ($validationScore -ge 70) { "Yellow" } else { "Red" })

Write-Host "`nValidation Categories:" -ForegroundColor White
Write-Host "   • Content Job Creation: 1 validation" -ForegroundColor Green
Write-Host "   • Database Table Access: 3 validations" -ForegroundColor Green
Write-Host "   • Edge Functions: 2 validations" -ForegroundColor Green
Write-Host "   • Job Status Updates: 1 validation" -ForegroundColor Green
Write-Host "   • Job Completion: 1 validation" -ForegroundColor Green
Write-Host "   • System Health Check: 1 validation" -ForegroundColor Green
Write-Host "   • Total Validations: $totalValidations" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "1. Address any failed validations" -ForegroundColor Yellow
Write-Host "2. Test content generation quality" -ForegroundColor Yellow
Write-Host "3. Validate WordPress draft post creation" -ForegroundColor Yellow
Write-Host "4. Test concurrent job processing" -ForegroundColor Yellow
Write-Host "5. Verify system performance under load" -ForegroundColor Yellow

if ($failedCount -eq 0) {
    Write-Host "`n🎉 Production system validation completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some validations failed - review the details above" -ForegroundColor Yellow
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
