import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createHealthMonitor,
  performHealthCheck,
  getHealthConfig
} from '../content-automation/health-monitor.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'check'
    const detailed = url.searchParams.get('detailed') === 'true'
    
    console.log(`Health monitoring - Action: ${action}, Detailed: ${detailed}`)
    
    switch (action) {
      case 'check':
        return await handleHealthCheck(detailed)
      
      case 'status':
        return await handleStatus()
      
      case 'metrics':
        return await handleMetrics(req)
      
      case 'alerts':
        return await handleAlerts(req)
      
      case 'recommendations':
        return await handleRecommendations()
      
      case 'config':
        return await handleConfig()
      
      case 'history':
        return await handleHistory(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: check, status, metrics, alerts, recommendations, config, history' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Health monitoring error:', error)
    
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

async function handleHealthCheck(detailed: boolean): Promise<Response> {
  try {
    const health = await performHealthCheck()
    
    const response = {
      success: true,
      action: 'check',
      detailed: detailed,
      health: detailed ? health : {
        overall_status: health.overall_status,
        timestamp: health.timestamp,
        uptime_percentage: health.uptime_percentage,
        summary: health.summary,
        recommendations: health.recommendations
      },
      timestamp: new Date().toISOString()
    }
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: health.overall_status === 'down' ? 503 : 200
      }
    )
    
  } catch (error) {
    console.error('Error performing health check:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        health: {
          overall_status: 'down',
          timestamp: new Date().toISOString(),
          error: error.message
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503
      }
    )
  }
}

async function handleStatus(): Promise<Response> {
  try {
    // Get current system status from database
    // In a real implementation, this would query the database
    const status = {
      overall_status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime_percentage: 99.5,
      last_incident: null,
      recommendations: [],
      check_summary: {
        total_checks: 5,
        healthy_checks: 5,
        warning_checks: 0,
        critical_checks: 0,
        down_checks: 0,
        average_response_time: 250
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'status',
        status: status,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting status:', error)
    
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

async function handleMetrics(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url)
    const hours = parseInt(url.searchParams.get('hours') || '24')
    
    // In a real implementation, this would query the database
    const metrics = [
      {
        metric_name: 'uptime_percentage',
        metric_value: 99.5,
        metric_unit: 'percent',
        timestamp: new Date().toISOString(),
        status: 'excellent'
      },
      {
        metric_name: 'average_response_time',
        metric_value: 250,
        metric_unit: 'milliseconds',
        timestamp: new Date().toISOString(),
        status: 'excellent'
      },
      {
        metric_name: 'healthy_checks_percentage',
        metric_value: 95.0,
        metric_unit: 'percent',
        timestamp: new Date().toISOString(),
        status: 'good'
      },
      {
        metric_name: 'database_response_time',
        metric_value: 150,
        metric_unit: 'milliseconds',
        timestamp: new Date().toISOString(),
        status: 'excellent'
      },
      {
        metric_name: 'external_service_response_time',
        metric_value: 800,
        metric_unit: 'milliseconds',
        timestamp: new Date().toISOString(),
        status: 'good'
      }
    ]
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'metrics',
        hours: hours,
        metrics: metrics,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting metrics:', error)
    
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

async function handleAlerts(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url)
    const hours = parseInt(url.searchParams.get('hours') || '24')
    
    // In a real implementation, this would query the database
    const alerts = [
      {
        alert_id: 'alert_001',
        alert_type: 'health_check',
        severity: 'warning',
        message: 'Database response time is above threshold',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        resolved: true,
        resolution_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
      },
      {
        alert_id: 'alert_002',
        alert_type: 'health_check',
        severity: 'critical',
        message: 'External service timeout detected',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        resolved: true,
        resolution_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
      }
    ]
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'alerts',
        hours: hours,
        alerts: alerts,
        alert_count: alerts.length,
        unresolved_count: alerts.filter(alert => !alert.resolved).length,
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

async function handleRecommendations(): Promise<Response> {
  try {
    // In a real implementation, this would query the database
    const recommendations = [
      {
        recommendation_type: 'system_status',
        recommendation_message: 'System is healthy - continue monitoring',
        priority: 'low',
        affected_components: ['system'],
        estimated_impact: 'Low - System stable'
      },
      {
        recommendation_type: 'uptime_improvement',
        recommendation_message: 'Uptime is excellent - maintain current practices',
        priority: 'none',
        affected_components: ['reliability'],
        estimated_impact: 'Minimal - Excellent uptime'
      },
      {
        recommendation_type: 'performance_optimization',
        recommendation_message: 'Consider optimizing database queries for better performance',
        priority: 'low',
        affected_components: ['database', 'performance'],
        estimated_impact: 'Low - Minor performance improvement'
      }
    ]
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'recommendations',
        recommendations: recommendations,
        recommendation_count: recommendations.length,
        high_priority_count: recommendations.filter(r => r.priority === 'high').length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting recommendations:', error)
    
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

async function handleConfig(): Promise<Response> {
  try {
    const config = getHealthConfig()
    
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

async function handleHistory(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url)
    const days = parseInt(url.searchParams.get('days') || '7')
    
    // In a real implementation, this would query the database
    const history = [
      {
        date: '2024-01-15',
        total_checks: 24,
        healthy_checks: 24,
        warning_checks: 0,
        critical_checks: 0,
        down_checks: 0,
        average_uptime_percentage: 100.0,
        average_response_time: 200
      },
      {
        date: '2024-01-14',
        total_checks: 24,
        healthy_checks: 23,
        warning_checks: 1,
        critical_checks: 0,
        down_checks: 0,
        average_uptime_percentage: 99.2,
        average_response_time: 250
      },
      {
        date: '2024-01-13',
        total_checks: 24,
        healthy_checks: 24,
        warning_checks: 0,
        critical_checks: 0,
        down_checks: 0,
        average_uptime_percentage: 100.0,
        average_response_time: 180
      }
    ]
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'history',
        days: days,
        history: history,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting history:', error)
    
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
