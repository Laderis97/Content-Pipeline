import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  processJobsConcurrently, 
  getProcessingStatistics, 
  monitorConcurrentProcessing,
  optimizeConcurrentProcessing 
} from '../content-automation/concurrent-processor.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'process'
    
    console.log(`Concurrent content processor - Action: ${action}`)
    
    switch (action) {
      case 'process':
        return await handleConcurrentProcessing(req)
      
      case 'stats':
        return await handleGetStatistics()
      
      case 'monitor':
        return await handleMonitoring()
      
      case 'optimize':
        return await handleOptimization()
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: process, stats, monitor, optimize' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Concurrent content processor error:', error)
    
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

async function handleConcurrentProcessing(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const maxJobs = body.max_jobs || 5
    
    console.log(`Starting concurrent processing with max ${maxJobs} jobs`)
    
    const result = await processJobsConcurrently(maxJobs)
    
    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error in concurrent processing:', error)
    
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

async function handleGetStatistics() {
  try {
    const stats = await getProcessingStatistics()
    
    return new Response(
      JSON.stringify({
        success: true,
        statistics: stats
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting processing statistics:', error)
    
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

async function handleMonitoring() {
  try {
    const monitoring = await monitorConcurrentProcessing()
    
    return new Response(
      JSON.stringify({
        success: true,
        monitoring
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error monitoring concurrent processing:', error)
    
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

async function handleOptimization() {
  try {
    const optimization = await optimizeConcurrentProcessing()
    
    return new Response(
      JSON.stringify({
        success: true,
        optimization
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error optimizing concurrent processing:', error)
    
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
