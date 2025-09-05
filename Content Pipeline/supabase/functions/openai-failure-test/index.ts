import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createOpenAIFailureHandler,
  analyzeOpenAIFailure,
  requeueJobForOpenAIFailure,
  getOpenAIFailureStatistics,
  resetOpenAICircuitBreaker,
  isOpenAICircuitBreakerOpen
} from '../content-automation/openai-failure-handler.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const jobId = url.searchParams.get('job_id') || 'test-job-123'
    
    console.log(`OpenAI failure test - Action: ${action}, Job ID: ${jobId}`)
    
    switch (action) {
      case 'test':
        return await handleFailureAnalysisTest(req)
      
      case 'requeue':
        return await handleRequeueTest(jobId, req)
      
      case 'statistics':
        return await handleStatisticsTest()
      
      case 'circuit-breaker':
        return await handleCircuitBreakerTest(req)
      
      case 'simulate-errors':
        return await handleSimulateErrorsTest(req)
      
      case 'categorize':
        return await handleCategorizationTest(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, requeue, statistics, circuit-breaker, simulate-errors, categorize' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('OpenAI failure test error:', error)
    
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

async function handleFailureAnalysisTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      error_type = 'rate_limit',
      error_message = 'Rate limit exceeded',
      error_code = 'rate_limit_exceeded',
      status_code = 429
    } = body
    
    // Create simulated error based on type
    let simulatedError: any
    
    switch (error_type) {
      case 'auth':
        simulatedError = new Error('Invalid API key')
        simulatedError.code = 'invalid_api_key'
        simulatedError.status = 401
        break
      case 'rate_limit':
        simulatedError = new Error('Rate limit exceeded')
        simulatedError.code = 'rate_limit_exceeded'
        simulatedError.status = 429
        simulatedError.headers = { 'retry-after': '60' }
        break
      case 'model':
        simulatedError = new Error('Model not found')
        simulatedError.code = 'model_not_found'
        simulatedError.status = 404
        break
      case 'content_policy':
        simulatedError = new Error('Content policy violation')
        simulatedError.code = 'content_filter'
        simulatedError.status = 400
        break
      case 'validation':
        simulatedError = new Error('Invalid request')
        simulatedError.code = 'invalid_request'
        simulatedError.status = 400
        break
      case 'network':
        simulatedError = new Error('Connection timeout')
        simulatedError.code = 'ETIMEDOUT'
        simulatedError.status = 0
        break
      case 'server':
        simulatedError = new Error('Internal server error')
        simulatedError.code = 'internal_server_error'
        simulatedError.status = 500
        break
      case 'token':
        simulatedError = new Error('Context length exceeded')
        simulatedError.code = 'context_length_exceeded'
        simulatedError.status = 400
        break
      default:
        simulatedError = new Error(error_message)
        simulatedError.code = error_code
        simulatedError.status = status_code
    }
    
    const failureResult = await analyzeOpenAIFailure(simulatedError)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'test',
        simulated_error: {
          type: error_type,
          message: simulatedError.message,
          code: simulatedError.code,
          status: simulatedError.status
        },
        failure_analysis: failureResult,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing failure analysis:', error)
    
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

async function handleRequeueTest(jobId: string, req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      error_message = 'Rate limit exceeded',
      retry_count = 0
    } = body
    
    const simulatedError = new Error(error_message)
    simulatedError.code = 'rate_limit_exceeded'
    simulatedError.status = 429
    
    const requeueResult = await requeueJobForOpenAIFailure(
      jobId,
      simulatedError,
      retry_count
    )
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'requeue',
        job_id: jobId,
        simulated_error: {
          message: simulatedError.message,
          code: simulatedError.code,
          status: simulatedError.status
        },
        requeue_result: requeueResult,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing requeue:', error)
    
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

async function handleStatisticsTest() {
  try {
    const statistics = await getOpenAIFailureStatistics()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'statistics',
        statistics: statistics,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing statistics:', error)
    
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

async function handleCircuitBreakerTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { action: cbAction = 'status' } = body
    
    const handler = createOpenAIFailureHandler()
    
    let result: any = {}
    
    switch (cbAction) {
      case 'status':
        result = {
          circuit_breaker_open: handler.isCircuitBreakerOpen(),
          failure_statistics: handler.getFailureStatistics()
        }
        break
      case 'reset':
        handler.resetCircuitBreaker()
        result = {
          circuit_breaker_reset: true,
          circuit_breaker_open: handler.isCircuitBreakerOpen()
        }
        break
      case 'simulate-failures':
        // Simulate multiple failures to trigger circuit breaker
        for (let i = 0; i < 6; i++) {
          const error = new Error(`Simulated critical failure ${i + 1}`)
          error.code = 'internal_server_error'
          error.status = 500
          await handler.analyzeOpenAIFailure(error)
          await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
        }
        result = {
          simulated_failures: 6,
          circuit_breaker_open: handler.isCircuitBreakerOpen(),
          failure_statistics: handler.getFailureStatistics()
        }
        break
      default:
        throw new Error(`Invalid circuit breaker action: ${cbAction}`)
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'circuit-breaker',
        circuit_breaker_action: cbAction,
        result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing circuit breaker:', error)
    
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

async function handleSimulateErrorsTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      error_types = ['auth', 'rate_limit', 'model', 'content_policy', 'validation', 'network', 'server', 'token'],
      iterations = 2
    } = body
    
    const handler = createOpenAIFailureHandler()
    const results = []
    
    for (const errorType of error_types) {
      for (let i = 0; i < iterations; i++) {
        let simulatedError: any
        
        switch (errorType) {
          case 'auth':
            simulatedError = new Error('Invalid API key')
            simulatedError.code = 'invalid_api_key'
            simulatedError.status = 401
            break
          case 'rate_limit':
            simulatedError = new Error('Rate limit exceeded')
            simulatedError.code = 'rate_limit_exceeded'
            simulatedError.status = 429
            break
          case 'model':
            simulatedError = new Error('Model not found')
            simulatedError.code = 'model_not_found'
            simulatedError.status = 404
            break
          case 'content_policy':
            simulatedError = new Error('Content policy violation')
            simulatedError.code = 'content_filter'
            simulatedError.status = 400
            break
          case 'validation':
            simulatedError = new Error('Invalid request')
            simulatedError.code = 'invalid_request'
            simulatedError.status = 400
            break
          case 'network':
            simulatedError = new Error('Connection timeout')
            simulatedError.code = 'ETIMEDOUT'
            simulatedError.status = 0
            break
          case 'server':
            simulatedError = new Error('Internal server error')
            simulatedError.code = 'internal_server_error'
            simulatedError.status = 500
            break
          case 'token':
            simulatedError = new Error('Context length exceeded')
            simulatedError.code = 'context_length_exceeded'
            simulatedError.status = 400
            break
          default:
            simulatedError = new Error(`Unknown error type: ${errorType}`)
        }
        
        const failureResult = await handler.analyzeOpenAIFailure(simulatedError)
        
        results.push({
          iteration: i + 1,
          error_type: errorType,
          error_message: simulatedError.message,
          failure_analysis: failureResult
        })
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    const finalStatistics = handler.getFailureStatistics()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'simulate-errors',
        error_types: error_types,
        iterations: iterations,
        results: results,
        final_statistics: finalStatistics,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error simulating errors:', error)
    
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

async function handleCategorizationTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      test_cases = [
        { message: 'Invalid API key', code: 'invalid_api_key', status: 401 },
        { message: 'Rate limit exceeded', code: 'rate_limit_exceeded', status: 429 },
        { message: 'Model not found', code: 'model_not_found', status: 404 },
        { message: 'Content policy violation', code: 'content_filter', status: 400 },
        { message: 'Invalid request format', code: 'invalid_request', status: 400 },
        { message: 'Connection timeout', code: 'ETIMEDOUT', status: 0 },
        { message: 'Internal server error', code: 'internal_server_error', status: 500 },
        { message: 'Context length exceeded', code: 'context_length_exceeded', status: 400 }
      ]
    } = body
    
    const handler = createOpenAIFailureHandler()
    const results = []
    
    for (const testCase of test_cases) {
      const simulatedError = new Error(testCase.message)
      simulatedError.code = testCase.code
      simulatedError.status = testCase.status
      
      const failureResult = await handler.analyzeOpenAIFailure(simulatedError)
      
      results.push({
        test_case: testCase,
        failure_analysis: failureResult
      })
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'categorize',
        test_cases: test_cases,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing categorization:', error)
    
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
