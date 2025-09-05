import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  RetryLogic,
  executeWithRetry,
  createRetryLogic,
  isRetryableError,
  getRetryDelay,
  formatRetryResult,
  getRetryConfig,
  updateRetryConfig
} from '../content-automation/retry-logic.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    
    console.log(`Retry logic test - Action: ${action}`)
    
    switch (action) {
      case 'test':
        return await handleRetryTest(req)
      
      case 'error':
        return await handleErrorTest(req)
      
      case 'config':
        return await handleConfigTest(req)
      
      case 'stats':
        return await handleStatsTest()
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, error, config, stats' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Retry logic test error:', error)
    
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

async function handleRetryTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      max_attempts = 3, 
      failure_rate = 0.7, 
      operation_type = 'mock',
      custom_config = {}
    } = body
    
    // Create mock operation that fails based on failure rate
    const mockOperation = createMockOperation(failure_rate, operation_type)
    
    // Create retry logic with custom config
    const retryLogic = createRetryLogic({
      max_attempts,
      base_delay_ms: 100,
      max_delay_ms: 1000,
      backoff_multiplier: 2,
      jitter_factor: 0.1,
      timeout_ms: 10000,
      ...custom_config
    })
    
    // Execute with retry logic
    const result = await retryLogic.execute(
      mockOperation,
      `Mock ${operation_type} operation`
    )
    
    // Get retry statistics
    const stats = retryLogic.getRetryStats()
    
    return new Response(
      JSON.stringify({
        success: true,
        test_config: {
          max_attempts,
          failure_rate,
          operation_type,
          custom_config
        },
        result: {
          success: result.success,
          final_attempt: result.final_attempt,
          total_duration_ms: result.total_duration_ms,
          error: result.error?.message || null
        },
        attempts: result.attempts,
        stats: stats,
        formatted_result: formatRetryResult(result)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing retry logic:', error)
    
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

async function handleErrorTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { error_type = 'network', error_message = 'Mock error' } = body
    
    // Create mock error
    const mockError = createMockError(error_type, error_message)
    
    // Test error analysis
    const retryLogic = new RetryLogic()
    const analysis = (retryLogic as any).analyzeError(mockError)
    
    // Test utility functions
    const isRetryable = isRetryableError(mockError)
    const retryDelay = getRetryDelay(mockError, 1)
    
    return new Response(
      JSON.stringify({
        success: true,
        error_test: {
          error_type,
          error_message,
          mock_error: mockError
        },
        analysis: {
          type: analysis.type,
          retryable: analysis.retryable,
          retry_after: analysis.retry_after,
          message: analysis.message
        },
        utility_results: {
          is_retryable: isRetryable,
          retry_delay: retryDelay
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing error handling:', error)
    
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

async function handleConfigTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { action = 'get', config = {} } = body
    
    if (action === 'get') {
      const currentConfig = getRetryConfig()
      
      return new Response(
        JSON.stringify({
          success: true,
          action: 'get',
          config: currentConfig
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    if (action === 'update') {
      updateRetryConfig(config)
      const updatedConfig = getRetryConfig()
      
      return new Response(
        JSON.stringify({
          success: true,
          action: 'update',
          updated_config: updatedConfig
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid config action. Use "get" or "update"'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
    
  } catch (error) {
    console.error('Error testing config:', error)
    
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

async function handleStatsTest() {
  try {
    // Test multiple retry scenarios
    const scenarios = [
      { name: 'success_first_try', failure_rate: 0 },
      { name: 'success_second_try', failure_rate: 0.5 },
      { name: 'success_third_try', failure_rate: 0.7 },
      { name: 'always_fails', failure_rate: 1.0 }
    ]
    
    const results = []
    
    for (const scenario of scenarios) {
      const mockOperation = createMockOperation(scenario.failure_rate, scenario.name)
      const retryLogic = createRetryLogic({ max_attempts: 3, base_delay_ms: 10 })
      
      const result = await retryLogic.execute(mockOperation, scenario.name)
      const stats = retryLogic.getRetryStats()
      
      results.push({
        scenario: scenario.name,
        result: {
          success: result.success,
          final_attempt: result.final_attempt,
          total_duration_ms: result.total_duration_ms
        },
        stats: stats
      })
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'stats',
        scenarios: results,
        summary: {
          total_scenarios: results.length,
          successful_scenarios: results.filter(r => r.result.success).length,
          failed_scenarios: results.filter(r => !r.result.success).length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing stats:', error)
    
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

function createMockOperation(failureRate: number, operationType: string): () => Promise<any> {
  return async () => {
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
    
    // Determine if operation should fail
    if (Math.random() < failureRate) {
      const errorType = getRandomErrorType()
      const error = createMockError(errorType, `Mock ${operationType} operation failed`)
      throw error
    }
    
    return {
      success: true,
      operation_type: operationType,
      timestamp: new Date().toISOString(),
      data: `Mock ${operationType} operation completed successfully`
    }
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
      ;(baseError as any).retry_after = 60000
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

function getRandomErrorType(): string {
  const errorTypes = ['network', 'server', 'rate_limit', 'timeout', 'authentication', 'authorization', 'validation']
  return errorTypes[Math.floor(Math.random() * errorTypes.length)]
}
