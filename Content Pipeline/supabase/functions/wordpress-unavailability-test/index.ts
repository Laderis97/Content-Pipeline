import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createWordPressUnavailabilityHandler,
  checkWordPressUnavailability,
  requeueJobForWordPressUnavailability,
  performWordPressHealthCheck,
  getWordPressAvailabilityStatus,
  resetWordPressCircuitBreaker
} from '../content-automation/wordpress-unavailability-handler.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const wordpressUrl = url.searchParams.get('wordpress_url') || Deno.env.get('WORDPRESS_BASE_URL') || 'https://example.com'
    const jobId = url.searchParams.get('job_id') || 'test-job-123'
    
    console.log(`WordPress unavailability test - Action: ${action}, WordPress URL: ${wordpressUrl}`)
    
    switch (action) {
      case 'test':
        return await handleUnavailabilityTest(wordpressUrl, req)
      
      case 'health-check':
        return await handleHealthCheckTest(wordpressUrl)
      
      case 'requeue':
        return await handleRequeueTest(wordpressUrl, jobId, req)
      
      case 'status':
        return await handleStatusTest(wordpressUrl)
      
      case 'circuit-breaker':
        return await handleCircuitBreakerTest(wordpressUrl, req)
      
      case 'simulate-errors':
        return await handleSimulateErrorsTest(wordpressUrl, req)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, health-check, requeue, status, circuit-breaker, simulate-errors' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('WordPress unavailability test error:', error)
    
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

async function handleUnavailabilityTest(wordpressUrl: string, req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      error_type = 'network',
      error_message = 'Connection refused',
      status_code = 503
    } = body
    
    // Create simulated error based on type
    let simulatedError: any
    
    switch (error_type) {
      case 'network':
        simulatedError = new Error('ECONNREFUSED: Connection refused')
        simulatedError.code = 'ECONNREFUSED'
        break
      case 'http':
        simulatedError = new Error(`HTTP ${status_code}: Service Unavailable`)
        simulatedError.status = status_code
        break
      case 'wordpress':
        simulatedError = new Error('WordPress site is down')
        break
      case 'rate_limit':
        simulatedError = new Error('Rate limit exceeded')
        simulatedError.status = 429
        break
      case 'timeout':
        simulatedError = new Error('Request timeout')
        simulatedError.code = 'ETIMEDOUT'
        break
      default:
        simulatedError = new Error(error_message)
    }
    
    const handler = createWordPressUnavailabilityHandler(wordpressUrl)
    const unavailabilityResult = await handler.checkWordPressUnavailability(simulatedError)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'test',
        wordpress_url: wordpressUrl,
        simulated_error: {
          type: error_type,
          message: simulatedError.message,
          code: simulatedError.code,
          status: simulatedError.status
        },
        unavailability_result: unavailabilityResult,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing unavailability:', error)
    
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

async function handleHealthCheckTest(wordpressUrl: string) {
  try {
    const healthCheckResult = await performWordPressHealthCheck(wordpressUrl)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'health-check',
        wordpress_url: wordpressUrl,
        health_check: healthCheckResult,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing health check:', error)
    
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

async function handleRequeueTest(wordpressUrl: string, jobId: string, req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      error_message = 'WordPress site is down',
      retry_count = 0
    } = body
    
    const simulatedError = new Error(error_message)
    simulatedError.status = 503
    
    const requeueResult = await requeueJobForWordPressUnavailability(
      wordpressUrl,
      jobId,
      simulatedError,
      retry_count
    )
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'requeue',
        wordpress_url: wordpressUrl,
        job_id: jobId,
        simulated_error: {
          message: simulatedError.message,
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

async function handleStatusTest(wordpressUrl: string) {
  try {
    const status = await getWordPressAvailabilityStatus(wordpressUrl)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'status',
        wordpress_url: wordpressUrl,
        availability_status: status,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing status:', error)
    
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

async function handleCircuitBreakerTest(wordpressUrl: string, req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { action: cbAction = 'status' } = body
    
    const handler = createWordPressUnavailabilityHandler(wordpressUrl)
    
    let result: any = {}
    
    switch (cbAction) {
      case 'status':
        result = {
          circuit_breaker_open: handler.isCircuitBreakerOpen(),
          availability_status: handler.getAvailabilityStatus()
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
          const error = new Error(`Simulated failure ${i + 1}`)
          error.status = 503
          await handler.checkWordPressUnavailability(error)
          await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
        }
        result = {
          simulated_failures: 6,
          circuit_breaker_open: handler.isCircuitBreakerOpen(),
          availability_status: handler.getAvailabilityStatus()
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
        wordpress_url: wordpressUrl,
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

async function handleSimulateErrorsTest(wordpressUrl: string, req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      error_types = ['network', 'http', 'wordpress', 'rate_limit', 'timeout'],
      iterations = 3
    } = body
    
    const handler = createWordPressUnavailabilityHandler(wordpressUrl)
    const results = []
    
    for (const errorType of error_types) {
      for (let i = 0; i < iterations; i++) {
        let simulatedError: any
        
        switch (errorType) {
          case 'network':
            simulatedError = new Error('ECONNREFUSED: Connection refused')
            simulatedError.code = 'ECONNREFUSED'
            break
          case 'http':
            simulatedError = new Error('HTTP 503: Service Unavailable')
            simulatedError.status = 503
            break
          case 'wordpress':
            simulatedError = new Error('WordPress site is down')
            break
          case 'rate_limit':
            simulatedError = new Error('Rate limit exceeded')
            simulatedError.status = 429
            break
          case 'timeout':
            simulatedError = new Error('Request timeout')
            simulatedError.code = 'ETIMEDOUT'
            break
          default:
            simulatedError = new Error(`Unknown error type: ${errorType}`)
        }
        
        const unavailabilityResult = await handler.checkWordPressUnavailability(simulatedError)
        
        results.push({
          iteration: i + 1,
          error_type: errorType,
          error_message: simulatedError.message,
          unavailability_result: unavailabilityResult
        })
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    const finalStatus = handler.getAvailabilityStatus()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'simulate-errors',
        wordpress_url: wordpressUrl,
        error_types: error_types,
        iterations: iterations,
        results: results,
        final_status: finalStatus,
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
