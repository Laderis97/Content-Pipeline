import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createRetryTracker,
  recordRetryAttempt,
  recordSuccess,
  getRetryHistory,
  canRetryJob,
  getRetryStatistics,
  cleanupRetryData
} from '../content-automation/retry-tracker.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const jobId = url.searchParams.get('job_id') || 'test-job-123'
    
    console.log(`Retry tracker test - Action: ${action}, Job ID: ${jobId}`)
    
    switch (action) {
      case 'test':
        return await handleRetryTrackingTest(jobId, req)
      
      case 'history':
        return await handleRetryHistoryTest(jobId)
      
      case 'eligibility':
        return await handleRetryEligibilityTest(jobId)
      
      case 'stats':
        return await handleRetryStatsTest(req)
      
      case 'cleanup':
        return await handleCleanupTest()
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, history, eligibility, stats, cleanup' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Retry tracker test error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function handleRetryTrackingTest(jobId: string, req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      test_type = 'retry_attempts',
      error_type = 'network',
      error_message = 'Mock network error'
    } = body
    
    const tracker = createRetryTracker(jobId)
    const results = []
    
    if (test_type === 'retry_attempts') {
      // Test multiple retry attempts
      for (let i = 1; i <= 3; i++) {
        const mockError = createMockError(error_type, `${error_message} (attempt ${i})`)
        const retryResult = await recordRetryAttempt(jobId, mockError, true)
        
        results.push({
          attempt: i,
          retry_result: retryResult,
          mock_error: mockError
        })
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } else if (test_type === 'success') {
      // Test success recording
      const successResult = await recordSuccess(jobId)
      results.push({
        test_type: 'success',
        success_result: successResult
      })
    } else if (test_type === 'mixed') {
      // Test mixed retry and success
      const mockError1 = createMockError('network', 'Network error')
      const retryResult1 = await recordRetryAttempt(jobId, mockError1, true)
      
      const mockError2 = createMockError('server', 'Server error')
      const retryResult2 = await recordRetryAttempt(jobId, mockError2, true)
      
      const successResult = await recordSuccess(jobId)
      
      results.push(
        { test: 'retry_1', result: retryResult1 },
        { test: 'retry_2', result: retryResult2 },
        { test: 'success', result: successResult }
      )
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        test_type,
        job_id: jobId,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing retry tracking:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleRetryHistoryTest(jobId: string) {
  try {
    const history = await getRetryHistory(jobId)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'history',
        job_id: jobId,
        history: history,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing retry history:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleRetryEligibilityTest(jobId: string) {
  try {
    const eligibility = await canRetryJob(jobId)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'eligibility',
        job_id: jobId,
        eligibility: eligibility,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing retry eligibility:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleRetryStatsTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { job_ids = ['test-job-1', 'test-job-2', 'test-job-3'] } = body
    
    const stats = await getRetryStatistics(job_ids)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'stats',
        job_ids: job_ids,
        statistics: stats,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing retry statistics:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleCleanupTest() {
  try {
    const cleanupResult = await cleanupRetryData()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'cleanup',
        cleanup_result: cleanupResult,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing cleanup:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

function createMockError(errorType: string, message: string): any {
  const baseError = new Error(message)
  
  switch (errorType) {
    case 'network':
      ;(baseError as any).status = 0
      ;(baseError as any).code = 'ECONNRESET'
      break
      
    case 'server':
      ;(baseError as any).status = 500
      ;(baseError as any).code = 'INTERNAL_SERVER_ERROR'
      break
      
    case 'rate_limit':
      ;(baseError as any).status = 429
      ;(baseError as any).code = 'RATE_LIMIT_EXCEEDED'
      break
      
    case 'timeout':
      ;(baseError as any).status = 408
      ;(baseError as any).code = 'TIMEOUT'
      break
      
    case 'authentication':
      ;(baseError as any).status = 401
      ;(baseError as any).code = 'UNAUTHORIZED'
      break
      
    case 'authorization':
      ;(baseError as any).status = 403
      ;(baseError as any).code = 'FORBIDDEN'
      break
      
    case 'validation':
      ;(baseError as any).status = 400
      ;(baseError as any).code = 'BAD_REQUEST'
      break
      
    default:
      ;(baseError as any).status = 500
      ;(baseError as any).code = 'UNKNOWN_ERROR'
  }
  
  return baseError
}
