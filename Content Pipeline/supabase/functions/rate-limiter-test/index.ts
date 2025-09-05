import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  getRateLimitStats,
  getRateLimitInfo,
  globalRateLimiter
} from '../content-automation/rate-limiter.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'stats'
    const service = url.searchParams.get('service') as 'openai' | 'wordpress' || 'openai'
    
    console.log(`Rate limiter test - Action: ${action}, Service: ${service}`)
    
    switch (action) {
      case 'stats':
        return await handleGetStats()
      
      case 'info':
        return await handleGetInfo(service)
      
      case 'test':
        return await handleTestRateLimit(service, req)
      
      case 'reset':
        return await handleReset()
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: stats, info, test, reset' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Rate limiter test error:', error)
    
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

async function handleGetStats() {
  try {
    const stats = getRateLimitStats()
    
    return new Response(
      JSON.stringify({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting rate limit stats:', error)
    
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

async function handleGetInfo(service: 'openai' | 'wordpress') {
  try {
    const info = getRateLimitInfo(service)
    
    return new Response(
      JSON.stringify({
        success: true,
        service,
        info,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting rate limit info:', error)
    
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

async function handleTestRateLimit(service: 'openai' | 'wordpress', req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { estimated_tokens, simulate_requests } = body
    
    const results = []
    
    if (simulate_requests && simulate_requests > 0) {
      // Simulate multiple requests
      for (let i = 0; i < Math.min(simulate_requests, 10); i++) {
        const canMake = await globalRateLimiter.canMakeRequest(
          service, 
          service === 'openai' ? (estimated_tokens || 1000) : undefined
        )
        
        results.push({
          request_number: i + 1,
          allowed: canMake.allowed,
          wait_time: canMake.waitTime,
          reason: canMake.reason
        })
        
        // Record a simulated request
        if (canMake.allowed) {
          globalRateLimiter.recordRequest(
            service,
            service === 'openai' ? (estimated_tokens || 1000) : undefined,
            Math.random() * 1000 + 500, // Random response time 500-1500ms
            Math.random() > 0.1 // 90% success rate
          )
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } else {
      // Single request test
      const canMake = await globalRateLimiter.canMakeRequest(
        service, 
        service === 'openai' ? (estimated_tokens || 1000) : undefined
      )
      
      results.push({
        allowed: canMake.allowed,
        wait_time: canMake.waitTime,
        reason: canMake.reason
      })
    }
    
    // Get current stats after test
    const stats = getRateLimitStats()
    
    return new Response(
      JSON.stringify({
        success: true,
        service,
        test_results: results,
        current_stats: stats,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing rate limit:', error)
    
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

async function handleReset() {
  try {
    globalRateLimiter.reset()
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Rate limiter data reset successfully',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error resetting rate limiter:', error)
    
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
