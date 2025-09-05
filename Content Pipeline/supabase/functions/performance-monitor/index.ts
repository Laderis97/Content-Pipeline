import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  getPerformanceStatistics, 
  analyzePerformanceOptimizations,
  monitorPerformanceRealtime,
  generatePerformanceReport 
} from '../content-automation/performance-monitor.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'stats'
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    
    console.log(`Performance monitor - Action: ${action}`)
    
    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined
    
    switch (action) {
      case 'stats':
        return await handleGetStatistics(start, end)
      
      case 'optimizations':
        return await handleGetOptimizations()
      
      case 'monitor':
        return await handleRealtimeMonitoring()
      
      case 'report':
        return await handleGenerateReport()
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: stats, optimizations, monitor, report' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Performance monitor error:', error)
    
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

async function handleGetStatistics(startDate?: Date, endDate?: Date) {
  try {
    const stats = await getPerformanceStatistics(startDate, endDate)
    
    return new Response(
      JSON.stringify({
        success: true,
        statistics: stats,
        thresholds: {
          function_duration_ms: 2000,
          openai_duration_ms: 1500,
          wordpress_duration_ms: 500,
          database_duration_ms: 100
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting performance statistics:', error)
    
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

async function handleGetOptimizations() {
  try {
    const optimizations = await analyzePerformanceOptimizations()
    
    return new Response(
      JSON.stringify({
        success: true,
        optimizations
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting performance optimizations:', error)
    
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

async function handleRealtimeMonitoring() {
  try {
    const monitoring = await monitorPerformanceRealtime()
    
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
    console.error('Error monitoring performance real-time:', error)
    
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

async function handleGenerateReport() {
  try {
    const report = await generatePerformanceReport()
    
    return new Response(
      JSON.stringify({
        success: true,
        report
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error generating performance report:', error)
    
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
