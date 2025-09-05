import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createMetricsCollector,
  collectMetrics,
  getMetricsSummary,
  getMetricsConfig
} from '../content-automation/metrics-collector.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'collect'
    const timePeriod = url.searchParams.get('period') || 'hourly'
    const hours = parseInt(url.searchParams.get('hours') || '24')
    
    console.log(`Metrics collection - Action: ${action}, Period: ${timePeriod}, Hours: ${hours}`)
    
    switch (action) {
      case 'collect':
        return await handleCollectMetrics()
      
      case 'summary':
        return await handleGetSummary(timePeriod)
      
      case 'dashboard':
        return await handleGetDashboard(hours)
      
      case 'trends':
        return await handleGetTrends(req)
      
      case 'alerts':
        return await handleGetAlerts(hours)
      
      case 'config':
        return await handleGetConfig()
      
      case 'performance':
        return await handleGetPerformance(hours)
      
      case 'system':
        return await handleGetSystem(hours)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: collect, summary, dashboard, trends, alerts, config, performance, system' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Metrics collection error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function handleCollectMetrics(): Promise<Response> {
  try {
    const result = await collectMetrics()
    
    return new Response(
      JSON.stringify({
        success: result.success,
        action: 'collect',
        result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    )
    
  } catch (error) {
    console.error('Error collecting metrics:', error)
    
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

async function handleGetSummary(timePeriod: string): Promise<Response> {
  try {
    const summary = await getMetricsSummary(timePeriod)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'summary',
        time_period: timePeriod,
        summary: summary,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting summary:', error)
    
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

async function handleGetDashboard(hours: number): Promise<Response> {
  try {
    // In a real implementation, this would query the database
    const dashboard = {
      performance: {
        success_rate: 98.5,
        processing_time_avg: 2500,
        processing_time_p95: 5000,
        processing_time_p99: 8000,
        throughput_per_hour: 15,
        queue_size: 5,
        error_rate: 1.5,
        retry_rate: 2.0,
        completion_rate: 100,
        total_metrics: 150
      },
      system: {
        database_query_time_avg: 150,
        database_connection_count: 5,
        database_active_queries: 2,
        database_slow_queries: 0,
        openai_response_time: 800,
        wordpress_response_time: 600,
        openai_success_rate: 99.8,
        wordpress_success_rate: 99.2,
        memory_usage_percent: 45.2,
        cpu_usage_percent: 32.1,
        disk_usage_percent: 67.8,
        total_metrics: 75
      },
      alerts: {
        critical_alerts: 0,
        warning_alerts: 2,
        total_alerts: 2
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'dashboard',
        hours: hours,
        dashboard: dashboard,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting dashboard:', error)
    
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

async function handleGetTrends(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      metric_names = ['success_rate', 'processing_time_avg', 'throughput_per_hour'],
      hours_back = 24
    } = body
    
    // In a real implementation, this would query the database
    const trends = metric_names.map(metricName => ({
      metric_name: metricName,
      trends: [
        {
          time_bucket: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          metric_value: metricName === 'success_rate' ? 98.5 : metricName === 'processing_time_avg' ? 2500 : 15,
          metric_count: 10
        },
        {
          time_bucket: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          metric_value: metricName === 'success_rate' ? 99.1 : metricName === 'processing_time_avg' ? 2200 : 18,
          metric_count: 12
        },
        {
          time_bucket: new Date().toISOString(),
          metric_value: metricName === 'success_rate' ? 98.8 : metricName === 'processing_time_avg' ? 2400 : 16,
          metric_count: 11
        }
      ]
    }))
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'trends',
        metric_names: metric_names,
        hours_back: hours_back,
        trends: trends,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting trends:', error)
    
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

async function handleGetAlerts(hours: number): Promise<Response> {
  try {
    // In a real implementation, this would query the database
    const alerts = [
      {
        alert_type: 'performance',
        alert_message: 'Warning: Processing time above 10s',
        severity: 'warning',
        metric_name: 'processing_time_avg',
        current_value: 12500,
        threshold_value: 10000,
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        alert_type: 'performance',
        alert_message: 'Warning: Queue size above 50',
        severity: 'warning',
        metric_name: 'queue_size',
        current_value: 65,
        threshold_value: 50,
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      }
    ]
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'alerts',
        hours: hours,
        alerts: alerts,
        alert_count: alerts.length,
        critical_count: alerts.filter(a => a.severity === 'critical').length,
        warning_count: alerts.filter(a => a.severity === 'warning').length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting alerts:', error)
    
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

async function handleGetConfig(): Promise<Response> {
  try {
    const config = getMetricsConfig()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'config',
        config: config,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting config:', error)
    
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

async function handleGetPerformance(hours: number): Promise<Response> {
  try {
    // In a real implementation, this would query the database
    const performance = {
      success_rate: 98.5,
      processing_time_avg: 2500,
      processing_time_p95: 5000,
      processing_time_p99: 8000,
      throughput_per_hour: 15,
      queue_size: 5,
      error_rate: 1.5,
      retry_rate: 2.0,
      completion_rate: 100,
      total_metrics: 150,
      trends: {
        success_rate_trend: 'stable',
        processing_time_trend: 'improving',
        throughput_trend: 'stable'
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'performance',
        hours: hours,
        performance: performance,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting performance:', error)
    
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

async function handleGetSystem(hours: number): Promise<Response> {
  try {
    // In a real implementation, this would query the database
    const system = {
      database_performance: {
        query_time_avg: 150,
        connection_count: 5,
        active_queries: 2,
        slow_queries: 0
      },
      external_services: {
        openai_response_time: 800,
        wordpress_response_time: 600,
        openai_success_rate: 99.8,
        wordpress_success_rate: 99.2
      },
      resource_usage: {
        memory_usage_percent: 45.2,
        cpu_usage_percent: 32.1,
        disk_usage_percent: 67.8
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'system',
        hours: hours,
        system: system,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting system metrics:', error)
    
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
