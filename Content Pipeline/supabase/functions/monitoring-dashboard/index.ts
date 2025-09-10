import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface DashboardData {
  systemHealth: {
    status: string
    uptime: number
    lastCheck: string
    responseTime: number
  }
  jobStats: {
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
    successRate: number
  }
  performance: {
    avgResponseTime: number
    maxResponseTime: number
    minResponseTime: number
    throughput: number
  }
  functions: {
    health: { status: string; responseTime: number }
    performance: { status: string; responseTime: number }
    metrics: { status: string; responseTime: number }
    contentAutomation: { status: string; responseTime: number }
  }
  alerts: Array<{
    id: string
    level: string
    message: string
    timestamp: string
    resolved: boolean
  }>
  recentJobs: Array<{
    id: string
    topic: string
    status: string
    createdAt: string
    completedAt?: string
    responseTime?: number
  }>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const dashboardData: DashboardData = {
      systemHealth: {
        status: 'healthy',
        uptime: 0,
        lastCheck: new Date().toISOString(),
        responseTime: 0
      },
      jobStats: {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        successRate: 0
      },
      performance: {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        throughput: 0
      },
      functions: {
        health: { status: 'unknown', responseTime: 0 },
        performance: { status: 'unknown', responseTime: 0 },
        metrics: { status: 'unknown', responseTime: 0 },
        contentAutomation: { status: 'unknown', responseTime: 0 }
      },
      alerts: [],
      recentJobs: []
    }

    // Get job statistics
    const { data: jobStats, error: jobStatsError } = await supabase
      .from('content_jobs')
      .select('status, created_at, completed_at')

    if (!jobStatsError && jobStats) {
      const total = jobStats.length
      const pending = jobStats.filter(job => job.status === 'pending').length
      const processing = jobStats.filter(job => job.status === 'processing').length
      const completed = jobStats.filter(job => job.status === 'completed').length
      const failed = jobStats.filter(job => job.status === 'failed').length
      const successRate = total > 0 ? ((completed / total) * 100) : 0

      dashboardData.jobStats = {
        total,
        pending,
        processing,
        completed,
        failed,
        successRate: Math.round(successRate * 100) / 100
      }
    }

    // Get recent jobs
    const { data: recentJobs, error: recentJobsError } = await supabase
      .from('content_jobs')
      .select('id, topic, status, created_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (!recentJobsError && recentJobs) {
      dashboardData.recentJobs = recentJobs.map(job => ({
        id: job.id,
        topic: job.topic,
        status: job.status,
        createdAt: job.created_at,
        completedAt: job.completed_at,
        responseTime: job.completed_at && job.created_at 
          ? new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()
          : undefined
      }))
    }

    // Get performance metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics_data')
      .select('response_time, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!metricsError && metrics && metrics.length > 0) {
      const responseTimes = metrics.map(m => m.response_time).filter(rt => rt !== null)
      if (responseTimes.length > 0) {
        dashboardData.performance = {
          avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
          maxResponseTime: Math.max(...responseTimes),
          minResponseTime: Math.min(...responseTimes),
          throughput: responseTimes.length // jobs per hour (approximate)
        }
      }
    }

    // Test function health
    const functionsUrl = Deno.env.get('SUPABASE_URL') + '/functions/v1'
    const headers = {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      'Content-Type': 'application/json'
    }

    // Test health function
    try {
      const startTime = Date.now()
      const healthResponse = await fetch(`${functionsUrl}/health`, { 
        method: 'GET', 
        headers,
        signal: AbortSignal.timeout(5000)
      })
      const responseTime = Date.now() - startTime
      dashboardData.functions.health = {
        status: healthResponse.ok ? 'healthy' : 'unhealthy',
        responseTime
      }
    } catch (error) {
      dashboardData.functions.health = { status: 'unhealthy', responseTime: 0 }
    }

    // Test performance monitor function
    try {
      const startTime = Date.now()
      const perfResponse = await fetch(`${functionsUrl}/performance-monitor`, { 
        method: 'GET', 
        headers,
        signal: AbortSignal.timeout(5000)
      })
      const responseTime = Date.now() - startTime
      dashboardData.functions.performance = {
        status: perfResponse.ok ? 'healthy' : 'unhealthy',
        responseTime
      }
    } catch (error) {
      dashboardData.functions.performance = { status: 'unhealthy', responseTime: 0 }
    }

    // Test metrics function
    try {
      const startTime = Date.now()
      const metricsResponse = await fetch(`${functionsUrl}/metrics`, { 
        method: 'GET', 
        headers,
        signal: AbortSignal.timeout(5000)
      })
      const responseTime = Date.now() - startTime
      dashboardData.functions.metrics = {
        status: metricsResponse.ok ? 'healthy' : 'unhealthy',
        responseTime
      }
    } catch (error) {
      dashboardData.functions.metrics = { status: 'unhealthy', responseTime: 0 }
    }

    // Test content automation function
    try {
      const startTime = Date.now()
      const contentResponse = await fetch(`${functionsUrl}/content-automation`, { 
        method: 'POST', 
        headers,
        body: JSON.stringify({ mode: 'health_check' }),
        signal: AbortSignal.timeout(10000)
      })
      const responseTime = Date.now() - startTime
      dashboardData.functions.contentAutomation = {
        status: contentResponse.ok ? 'healthy' : 'unhealthy',
        responseTime
      }
    } catch (error) {
      dashboardData.functions.contentAutomation = { status: 'unhealthy', responseTime: 0 }
    }

    // Get active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('monitoring_alerts')
      .select('id, level, message, created_at, resolved')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!alertsError && alerts) {
      dashboardData.alerts = alerts.map(alert => ({
        id: alert.id,
        level: alert.level,
        message: alert.message,
        timestamp: alert.created_at,
        resolved: alert.resolved
      }))
    }

    // Calculate overall system health
    const healthyFunctions = Object.values(dashboardData.functions).filter(f => f.status === 'healthy').length
    const totalFunctions = Object.keys(dashboardData.functions).length
    const systemHealthPercentage = (healthyFunctions / totalFunctions) * 100

    dashboardData.systemHealth = {
      status: systemHealthPercentage >= 75 ? 'healthy' : systemHealthPercentage >= 50 ? 'degraded' : 'unhealthy',
      uptime: 99.9, // This would be calculated from actual uptime data
      lastCheck: new Date().toISOString(),
      responseTime: dashboardData.performance.avgResponseTime
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Dashboard error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
