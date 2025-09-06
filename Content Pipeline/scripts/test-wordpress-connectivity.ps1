# WordPress API Connectivity Test Script (PowerShell)
# This script tests WordPress API connectivity and configuration

Write-Host "Testing WordPress API connectivity..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$testResults = @()
$testId = 1

function Test-WordPressConnection {
    param(
        [string]$TestName,
        [string]$Description,
        [scriptblock]$TestScript
    )
    
    Write-Host "`n$testId. Testing: $TestName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    
    try {
        $result = & $TestScript
        Write-Host "   Status: $result" -ForegroundColor Green
        $script:testResults += @{Test=$TestName; Status="PASS"; Details=$result}
    } catch {
        Write-Host "   Status: Error - $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += @{Test=$TestName; Status="FAIL"; Details="Error: $($_.Exception.Message)"}
    }
    
    $script:testId++
}

# Test 1: Check WordPress credentials in vault
Test-WordPressConnection -TestName "WordPress Credentials" -Description "Verify WordPress credentials are stored in vault" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_username" -Method GET -Headers $headers
    $usernameSecrets = $response.Content | ConvertFrom-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_password" -Method GET -Headers $headers
    $passwordSecrets = $response.Content | ConvertFrom-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_url" -Method GET -Headers $headers
    $urlSecrets = $response.Content | ConvertFrom-Json
    
    if ($usernameSecrets.Count -gt 0 -and $passwordSecrets.Count -gt 0 -and $urlSecrets.Count -gt 0) {
        "WordPress credentials found in vault"
    } else {
        "WordPress credentials missing from vault"
    }
}

# Test 2: Check WordPress URL format
Test-WordPressConnection -TestName "WordPress URL Format" -Description "Verify WordPress URL has correct format" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_url" -Method GET -Headers $headers
    $secrets = $response.Content | ConvertFrom-Json
    if ($secrets.Count -gt 0) {
        $wordpressUrl = $secrets[0].value
        if ($wordpressUrl -like "https://*" -or $wordpressUrl -like "http://*") {
            "WordPress URL format is correct: $wordpressUrl"
        } elseif ($wordpressUrl -like "*your-wordpress-site*") {
            "WordPress URL is placeholder - needs to be replaced with real URL"
        } else {
            "WordPress URL format is incorrect"
        }
    } else {
        "WordPress URL not found"
    }
}

# Test 3: Test WordPress REST API connectivity
Test-WordPressConnection -TestName "WordPress REST API" -Description "Test WordPress REST API accessibility" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_url" -Method GET -Headers $headers
    $secrets = $response.Content | ConvertFrom-Json
    if ($secrets.Count -gt 0) {
        $wordpressUrl = $secrets[0].value
        if ($wordpressUrl -like "*your-wordpress-site*") {
            "Skipped - placeholder URL detected. Replace with real URL to test connectivity."
        } else {
            try {
                $wpResponse = Invoke-WebRequest -Uri "$wordpressUrl/wp-json/wp/v2/" -Method GET -TimeoutSec 10
                if ($wpResponse.StatusCode -eq 200) {
                    "WordPress REST API is accessible"
                } else {
                    "WordPress REST API returned status: $($wpResponse.StatusCode)"
                }
            } catch {
                "WordPress REST API connection failed: $($_.Exception.Message)"
            }
        }
    } else {
        "WordPress URL not found"
    }
}

# Test 4: Test WordPress authentication
Test-WordPressConnection -TestName "WordPress Authentication" -Description "Test WordPress user authentication" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_url" -Method GET -Headers $headers
    $urlSecrets = $response.Content | ConvertFrom-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_username" -Method GET -Headers $headers
    $usernameSecrets = $response.Content | ConvertFrom-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_password" -Method GET -Headers $headers
    $passwordSecrets = $response.Content | ConvertFrom-Json
    
    if ($urlSecrets.Count -gt 0 -and $usernameSecrets.Count -gt 0 -and $passwordSecrets.Count -gt 0) {
        $wordpressUrl = $urlSecrets[0].value
        $username = $usernameSecrets[0].value
        $password = $passwordSecrets[0].value
        
        if ($wordpressUrl -like "*your-wordpress-site*" -or $username -like "*placeholder*" -or $password -like "*placeholder*") {
            "Skipped - placeholder credentials detected. Replace with real credentials to test authentication."
        } else {
            try {
                $authString = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$username`:$password"))
                $wpHeaders = @{
                    "Authorization" = "Basic $authString"
                    "Content-Type" = "application/json"
                }
                $wpResponse = Invoke-WebRequest -Uri "$wordpressUrl/wp-json/wp/v2/users/me" -Method GET -Headers $wpHeaders -TimeoutSec 10
                if ($wpResponse.StatusCode -eq 200) {
                    "WordPress authentication successful"
                } else {
                    "WordPress authentication failed with status: $($wpResponse.StatusCode)"
                }
            } catch {
                "WordPress authentication failed: $($_.Exception.Message)"
            }
        }
    } else {
        "WordPress credentials not found"
    }
}

# Test 5: Test WordPress post creation capability
Test-WordPressConnection -TestName "WordPress Post Creation" -Description "Test WordPress post creation capability" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_url" -Method GET -Headers $headers
    $urlSecrets = $response.Content | ConvertFrom-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_username" -Method GET -Headers $headers
    $usernameSecrets = $response.Content | ConvertFrom-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_password" -Method GET -Headers $headers
    $passwordSecrets = $response.Content | ConvertFrom-Json
    
    if ($urlSecrets.Count -gt 0 -and $usernameSecrets.Count -gt 0 -and $passwordSecrets.Count -gt 0) {
        $wordpressUrl = $urlSecrets[0].value
        $username = $usernameSecrets[0].value
        $password = $passwordSecrets[0].value
        
        if ($wordpressUrl -like "*your-wordpress-site*" -or $username -like "*placeholder*" -or $password -like "*placeholder*") {
            "Skipped - placeholder credentials detected. Replace with real credentials to test post creation."
        } else {
            try {
                $authString = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$username`:$password"))
                $wpHeaders = @{
                    "Authorization" = "Basic $authString"
                    "Content-Type" = "application/json"
                }
                $testPost = @{
                    title = "Test Post from Content Pipeline"
                    content = "This is a test post created by the Content Pipeline system."
                    status = "draft"
                } | ConvertTo-Json
                
                $wpResponse = Invoke-WebRequest -Uri "$wordpressUrl/wp-json/wp/v2/posts" -Method POST -Headers $wpHeaders -Body $testPost -TimeoutSec 10
                if ($wpResponse.StatusCode -eq 201) {
                    "WordPress post creation test successful"
                } else {
                    "WordPress post creation failed with status: $($wpResponse.StatusCode)"
                }
            } catch {
                "WordPress post creation failed: $($_.Exception.Message)"
            }
        }
    } else {
        "WordPress credentials not found"
    }
}

# Test 6: Test WordPress categories and tags
Test-WordPressConnection -TestName "WordPress Categories and Tags" -Description "Test WordPress categories and tags access" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.wordpress_url" -Method GET -Headers $headers
    $secrets = $response.Content | ConvertFrom-Json
    if ($secrets.Count -gt 0) {
        $wordpressUrl = $secrets[0].value
        if ($wordpressUrl -like "*your-wordpress-site*") {
            "Skipped - placeholder URL detected. Replace with real URL to test categories and tags."
        } else {
            try {
                $categoriesResponse = Invoke-WebRequest -Uri "$wordpressUrl/wp-json/wp/v2/categories" -Method GET -TimeoutSec 10
                $tagsResponse = Invoke-WebRequest -Uri "$wordpressUrl/wp-json/wp/v2/tags" -Method GET -TimeoutSec 10
                
                if ($categoriesResponse.StatusCode -eq 200 -and $tagsResponse.StatusCode -eq 200) {
                    "WordPress categories and tags are accessible"
                } else {
                    "WordPress categories and tags access failed"
                }
            } catch {
                "WordPress categories and tags access failed: $($_.Exception.Message)"
            }
        }
    } else {
        "WordPress URL not found"
    }
}

# Test 7: Check default content settings
Test-WordPressConnection -TestName "Content Settings" -Description "Check default content generation settings" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?category=eq.content_settings" -Method GET -Headers $headers
    $contentSecrets = $response.Content | ConvertFrom-Json
    if ($contentSecrets.Count -gt 0) {
        "Content settings found: $($contentSecrets.Count) items"
    } else {
        "No content settings found - using defaults"
    }
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "WORDPRESS API CONNECTIVITY TEST SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$passedTests = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failedTests = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalTests = $testResults.Count

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red

Write-Host "`nTest Results:" -ForegroundColor White
$testResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "   • $($_.Test): $($_.Details)" -ForegroundColor $statusColor
}

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "1. Replace placeholder WordPress URL with real site URL" -ForegroundColor Yellow
Write-Host "2. Replace placeholder credentials with real WordPress user credentials" -ForegroundColor Yellow
Write-Host "3. Test actual WordPress API connectivity with real credentials" -ForegroundColor Yellow
Write-Host "4. Verify WordPress user has appropriate permissions for post creation" -ForegroundColor Yellow
Write-Host "5. Test content generation and posting workflow" -ForegroundColor Yellow

if ($passedTests -eq $totalTests) {
    Write-Host "`n🎉 All WordPress connectivity tests passed!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some tests failed or need real credentials" -ForegroundColor Yellow
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
