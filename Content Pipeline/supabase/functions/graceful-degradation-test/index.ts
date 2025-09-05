import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createGracefulDegradationManager,
  handlePartialFailure,
  getSystemHealthStatus,
  getDegradationHistory,
  PARTIAL_FAILURE_TYPES,
  DEGRADATION_STRATEGIES
} from '../content-automation/graceful-degradation.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    
    console.log(`Graceful degradation test - Action: ${action}`)
    
    switch (action) {
      case 'test':
        return await handleDegradationTest(req)
      
      case 'health':
        return await handleHealthTest()
      
      case 'history':
        return await handleHistoryTest()
      
      case 'simulate-failures':
        return await handleSimulateFailuresTest(req)
      
      case 'strategies':
        return await handleStrategiesTest(req)
      
      case 'fallback':
        return await handleFallbackTest(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, health, history, simulate-failures, strategies, fallback' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Graceful degradation test error:', error)
    
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

async function handleDegradationTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      failure_type = PARTIAL_FAILURE_TYPES.CONTENT_GENERATION,
      error_message = 'Content generation failed',
      error_code = 'generation_error',
      previous_attempts = 0
    } = body
    
    // Create mock job
    const mockJob = {
      id: 'test-job-123',
      topic: 'Test Topic',
      content_type: 'blog_post',
      model: 'gpt-4o-mini',
      retry_count: previous_attempts,
      generated_content: null
    }
    
    const result = await handlePartialFailure(
      mockJob,
      failure_type,
      {
        error: error_message,
        code: error_code,
        model: mockJob.model
      },
      previous_attempts
    )
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'test',
        failure_type: failure_type,
        mock_job: mockJob,
        failure_details: {
          error: error_message,
          code: error_code
        },
        degradation_result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing degradation:', error)
    
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

async function handleHealthTest() {
  try {
    const health = await getSystemHealthStatus()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'health',
        system_health: health,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing health:', error)
    
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

async function handleHistoryTest() {
  try {
    const history = await getDegradationHistory()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'history',
        degradation_history: history,
        history_count: history.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing history:', error)
    
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

async function handleSimulateFailuresTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      failure_types = [
        PARTIAL_FAILURE_TYPES.CONTENT_GENERATION,
        PARTIAL_FAILURE_TYPES.CONTENT_VALIDATION,
        PARTIAL_FAILURE_TYPES.WORDPRESS_POSTING,
        PARTIAL_FAILURE_TYPES.TAXONOMY_RESOLUTION
      ],
      iterations = 3
    } = body
    
    const manager = createGracefulDegradationManager()
    const results = []
    
    for (const failureType of failure_types) {
      for (let i = 0; i < iterations; i++) {
        const mockJob = {
          id: `test-job-${failureType}-${i}`,
          topic: `Test Topic ${i}`,
          content_type: 'blog_post',
          model: 'gpt-4o-mini',
          retry_count: i,
          generated_content: null
        }
        
        const result = await manager.handlePartialFailure({
          job: mockJob,
          failure_type: failureType,
          failure_details: {
            error: `Simulated ${failureType} failure ${i + 1}`,
            code: `${failureType}_error`
          },
          previous_attempts: i,
          system_health: manager.getSystemHealth()
        })
        
        results.push({
          iteration: i + 1,
          failure_type: failureType,
          job_id: mockJob.id,
          result: result
        })
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    const finalHealth = manager.getSystemHealth()
    const history = manager.getDegradationHistory()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'simulate-failures',
        failure_types: failure_types,
        iterations: iterations,
        results: results,
        final_health: finalHealth,
        degradation_history: history,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error simulating failures:', error)
    
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

async function handleStrategiesTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      test_strategies = [
        DEGRADATION_STRATEGIES.FALLBACK_MODEL,
        DEGRADATION_STRATEGIES.SIMPLIFIED_PROMPT,
        DEGRADATION_STRATEGIES.TEMPLATE_FALLBACK,
        DEGRADATION_STRATEGIES.RELAXED_VALIDATION,
        DEGRADATION_STRATEGIES.SKIP_VALIDATION,
        DEGRADATION_STRATEGIES.MANUAL_REVIEW,
        DEGRADATION_STRATEGIES.RETRY_LATER,
        DEGRADATION_STRATEGIES.SAVE_LOCALLY,
        DEGRADATION_STRATEGIES.MANUAL_POSTING,
        DEGRADATION_STRATEGIES.DEFAULT_CATEGORIES,
        DEGRADATION_STRATEGIES.SKIP_TAXONOMY,
        DEGRADATION_STRATEGIES.MANUAL_ASSIGNMENT
      ]
    } = body
    
    const manager = createGracefulDegradationManager()
    const results = []
    
    for (const strategy of test_strategies) {
      const mockJob = {
        id: `test-job-${strategy}`,
        topic: 'Test Topic',
        content_type: 'blog_post',
        model: 'gpt-4o-mini',
        retry_count: 0,
        generated_content: null
      }
      
      // Create a mock failure that would trigger this strategy
      const failureType = getFailureTypeForStrategy(strategy)
      
      const result = await manager.handlePartialFailure({
        job: mockJob,
        failure_type: failureType,
        failure_details: {
          error: `Test failure for strategy ${strategy}`,
          code: `${strategy}_test`
        },
        previous_attempts: 0,
        system_health: manager.getSystemHealth()
      })
      
      results.push({
        strategy: strategy,
        failure_type: failureType,
        result: result
      })
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'strategies',
        test_strategies: test_strategies,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing strategies:', error)
    
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

async function handleFallbackTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      fallback_type = 'template',
      content_type = 'blog_post',
      topic = 'Test Topic'
    } = body
    
    const mockJob = {
      id: 'test-job-fallback',
      topic: topic,
      content_type: content_type,
      model: 'gpt-4o-mini',
      retry_count: 2,
      generated_content: null
    }
    
    let result: any
    
    if (fallback_type === 'template') {
      // Test template fallback
      result = await handlePartialFailure(
        mockJob,
        PARTIAL_FAILURE_TYPES.CONTENT_GENERATION,
        {
          error: 'OpenAI API unavailable',
          code: 'api_unavailable'
        },
        2
      )
    } else if (fallback_type === 'model') {
      // Test model fallback
      result = await handlePartialFailure(
        mockJob,
        PARTIAL_FAILURE_TYPES.CONTENT_GENERATION,
        {
          error: 'Model overloaded',
          code: 'model_overloaded',
          fallback_data: { model: 'gpt-3.5-turbo' }
        },
        1
      )
    } else if (fallback_type === 'validation') {
      // Test validation fallback
      result = await handlePartialFailure(
        mockJob,
        PARTIAL_FAILURE_TYPES.CONTENT_VALIDATION,
        {
          error: 'Validation failed',
          code: 'validation_error'
        },
        0
      )
    } else {
      throw new Error(`Unknown fallback type: ${fallback_type}`)
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'fallback',
        fallback_type: fallback_type,
        mock_job: mockJob,
        fallback_result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing fallback:', error)
    
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

/**
 * Helper function to get failure type for strategy
 */
function getFailureTypeForStrategy(strategy: string): string {
  const strategyToFailureType: Record<string, string> = {
    [DEGRADATION_STRATEGIES.FALLBACK_MODEL]: PARTIAL_FAILURE_TYPES.CONTENT_GENERATION,
    [DEGRADATION_STRATEGIES.SIMPLIFIED_PROMPT]: PARTIAL_FAILURE_TYPES.CONTENT_GENERATION,
    [DEGRADATION_STRATEGIES.TEMPLATE_FALLBACK]: PARTIAL_FAILURE_TYPES.CONTENT_GENERATION,
    [DEGRADATION_STRATEGIES.RELAXED_VALIDATION]: PARTIAL_FAILURE_TYPES.CONTENT_VALIDATION,
    [DEGRADATION_STRATEGIES.SKIP_VALIDATION]: PARTIAL_FAILURE_TYPES.CONTENT_VALIDATION,
    [DEGRADATION_STRATEGIES.MANUAL_REVIEW]: PARTIAL_FAILURE_TYPES.CONTENT_VALIDATION,
    [DEGRADATION_STRATEGIES.RETRY_LATER]: PARTIAL_FAILURE_TYPES.NETWORK_TIMEOUT,
    [DEGRADATION_STRATEGIES.SAVE_LOCALLY]: PARTIAL_FAILURE_TYPES.WORDPRESS_POSTING,
    [DEGRADATION_STRATEGIES.MANUAL_POSTING]: PARTIAL_FAILURE_TYPES.WORDPRESS_POSTING,
    [DEGRADATION_STRATEGIES.DEFAULT_CATEGORIES]: PARTIAL_FAILURE_TYPES.TAXONOMY_RESOLUTION,
    [DEGRADATION_STRATEGIES.SKIP_TAXONOMY]: PARTIAL_FAILURE_TYPES.TAXONOMY_RESOLUTION,
    [DEGRADATION_STRATEGIES.MANUAL_ASSIGNMENT]: PARTIAL_FAILURE_TYPES.TAXONOMY_RESOLUTION
  }
  
  return strategyToFailureType[strategy] || PARTIAL_FAILURE_TYPES.CONTENT_GENERATION
}
