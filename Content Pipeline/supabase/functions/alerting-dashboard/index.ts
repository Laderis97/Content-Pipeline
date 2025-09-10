import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface AlertingData {
  alertSummary: {
    total: number
    active: number
    resolved: number
    critical: number
    warning: number
    info: number
  }
  recentAlerts: Array<{
    id: string
    level: string
    message: string
    timestamp: string
    resolved: boolean
    resolvedAt?: string
    functionName?: string
    responseTime?: number
  }>
  alertTrends: Array<{
    date: string
    critical: number
    warning: number
    info: number
    resolved: number
  }>
  topAlertSources: Array<{
    source: string
    count: number
    lastOccurred: string
  }>
  alertRules: Array<{
    name: string
    condition: string
    threshold: string
    enabled: boolean
    lastTriggered?: string
  }>
  systemHealth: {
    overallStatus: string
    functionsHealthy: number
    functionsTotal: number
    avgResponseTime: number
    errorRate: number
  }
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

    const alertingData: AlertingData = {
      alertSummary: {
        total: 0,
        active: 0,
        resolved: 0,
        critical: 0,
        warning: 0,
        info: 0
      },
      recentAlerts: [],
      alertTrends: [],
      topAlertSources: [],
      alertRules: [],
      systemHealth: {
        overallStatus: 'unknown',
        functionsHealthy: 0,
        functionsTotal: 0,
        avgResponseTime: 0,
        errorRate: 0
      }
    }

    // Get alert summary
    const { data: alerts, error: alertsError } = await supabase
      .from('monitoring_alerts')
      .select('level, resolved, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (!alertsError && alerts) {
      alertingData.alertSummary.total = alerts.length
      alertingData.alertSummary.active = alerts.filter(a => !a.resolved).length
      alertingData.alertSummary.resolved = alerts.filter(a => a.resolved).length
      alertingData.alertSummary.critical = alerts.filter(a => a.level === 'critical').length
      alertingData.alertSummary.warning = alerts.filter(a => a.level === 'warning').length
      alertingData.alertSummary.info = alerts.filter(a => a.level === 'info').length
    }

    // Get recent alerts
    const { data: recentAlerts, error: recentAlertsError } = await supabase
      .from('monitoring_alerts')
      .select('id, level, message, created_at, resolved, resolved_at, function_name, response_time')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!recentAlertsError && recentAlerts) {
      alertingData.recentAlerts = recentAlerts.map(alert => ({
        id: alert.id,
        level: alert.level,
        message: alert.message,
        timestamp: alert.created_at,
        resolved: alert.resolved,
        resolvedAt: alert.resolved_at,
        functionName: alert.function_name,
        responseTime: alert.response_time
      }))
    }

    // Get alert trends (daily data for last 7 days)
    const { data: trendAlerts, error: trendAlertsError } = await supabase
      .from('monitoring_alerts')
      .select('level, resolved, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })

    if (!trendAlertsError && trendAlerts) {
      // Group alerts by date
      const dailyData = new Map<string, { critical: number, warning: number, info: number, resolved: number }>()
      
      trendAlerts.forEach(alert => {
        const date = new Date(alert.created_at).toISOString().substring(0, 10)
        if (!dailyData.has(date)) {
          dailyData.set(date, { critical: 0, warning: 0, info: 0, resolved: 0 })
        }
        const data = dailyData.get(date)!
        if (alert.resolved) {
          data.resolved++
        } else {
          if (alert.level === 'critical') data.critical++
          else if (alert.level === 'warning') data.warning++
          else if (alert.level === 'info') data.info++
        }
      })

      // Convert to alert trends
      alertingData.alertTrends = Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        critical: data.critical,
        warning: data.warning,
        info: data.info,
        resolved: data.resolved
      }))
    }

    // Get top alert sources
    const { data: sourceAlerts, error: sourceAlertsError } = await supabase
      .from('monitoring_alerts')
      .select('function_name, level, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (!sourceAlertsError && sourceAlerts) {
      // Group alerts by function name
      const sourceCounts = new Map<string, { count: number, lastOccurred: string }>()
      
      sourceAlerts.forEach(alert => {
        const source = alert.function_name || 'unknown'
        if (!sourceCounts.has(source)) {
          sourceCounts.set(source, { count: 0, lastOccurred: alert.created_at })
        }
        const data = sourceCounts.get(source)!
        data.count++
        if (new Date(alert.created_at) > new Date(data.lastOccurred)) {
          data.lastOccurred = alert.created_at
        }
      })

      // Convert to top alert sources
      alertingData.topAlertSources = Array.from(sourceCounts.entries())
        .map(([source, data]) => ({
          source,
          count: data.count,
          lastOccurred: data.lastOccurred
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    }

    // Define alert rules (this would typically come from a configuration table)
    alertingData.alertRules = [
      {
        name: 'High Response Time',
        condition: 'response_time > 5000',
        threshold: '5000ms',
        enabled: true,
        lastTriggered: undefined
      },
      {
        name: 'Function Failure',
        condition: 'function_status = "unhealthy"',
        threshold: 'Any failure',
        enabled: true,
        lastTriggered: undefined
      },
      {
        name: 'High Error Rate',
        condition: 'error_rate > 10%',
        threshold: '10%',
        enabled: true,
        lastTriggered: undefined
      },
      {
        name: 'Database Connection',
        condition: 'database_status != "connected"',
        threshold: 'Any disconnection',
        enabled: true,
        lastTriggered: undefined
      }
    ]

    // Calculate system health
    const { data: healthChecks, error: healthChecksError } = await supabase
      .from('health_checks')
      .select('status, response_time, created_at')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
      .limit(100)

    if (!healthChecksError && healthChecks && healthChecks.length > 0) {
      const healthyChecks = healthChecks.filter(h => h.status === 'healthy').length
      const totalChecks = healthChecks.length
      const responseTimes = healthChecks.map(h => h.response_time || 0).filter(rt => rt > 0)
      
      alertingData.systemHealth = {
        overallStatus: healthyChecks / totalChecks >= 0.9 ? 'healthy' : 
                     healthyChecks / totalChecks >= 0.7 ? 'degraded' : 'unhealthy',
        functionsHealthy: healthyChecks,
        functionsTotal: totalChecks,
        avgResponseTime: responseTimes.length > 0 
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0,
        errorRate: totalChecks > 0 ? ((totalChecks - healthyChecks) / totalChecks) * 100 : 0
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: alertingData,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Alerting dashboard error:', error)
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
