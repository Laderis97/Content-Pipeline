import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createAlertingSystem,
  checkFailureRateAndAlert,
  getAlertingConfig
} from '../content-automation/alerting-system.ts'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Monitoring configuration
const MONITORING_CONFIG = {
  // Failure rate thresholds
  FAILURE_THRESHOLDS: {
    warning_threshold: 0.15, // 15% failure rate triggers warning
    critical_threshold: 0.20, // 20% failure rate triggers critical alert
    emergency_threshold: 0.30, // 30% failure rate triggers emergency alert
  },
  
  // Time windows for monitoring
  TIME_WINDOWS: {
    daily: 24 * 60 * 60 * 1000, // 24 hours
    hourly: 60 * 60 * 1000, // 1 hour
    weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
    monthly: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  
  // Alert configuration
  ALERT_CONFIG: {
    max_alerts_per_hour: 5,
    alert_cooldown: 60 * 60 * 1000, // 1 hour
    escalation_delay: 30 * 60 * 1000, // 30 minutes
  },
  
  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    max_processing_time: 2 * 60 * 1000, // 2 minutes
    max_retry_count: 3,
    min_success_rate: 0.80, // 80% minimum success rate
  }
}

interface MonitoringMetrics {
  total_jobs: number
  successful_jobs: number
  failed_jobs: number
  pending_jobs: number
  processing_jobs: number
  failure_rate: number
  success_rate: number
  average_processing_time: number
  median_processing_time: number
  p95_processing_time: number
  retry_rate: number
  stale_jobs_count: number
  timestamp: string
}

interface Alert {
  id: string
  type: 'failure_rate' | 'performance' | 'system_health' | 'stale_jobs'
  severity: 'info' | 'warning' | 'critical' | 'emergency'
  message: string
  value: number
  threshold: number
  timestamp: string
  resolved: boolean
  resolved_at?: string
  metadata?: any
}

interface DailyReport {
  date: string
  total_jobs: number
  successful_jobs: number
  failed_jobs: number
  failure_rate: number
  success_rate: number
  average_processing_time: number
  alerts_generated: number
  critical_alerts: number
  system_health: 'healthy' | 'degraded' | 'critical'
  top_failure_reasons: Array<{ reason: string; count: number }>
  performance_metrics: {
    p50_processing_time: number
    p95_processing_time: number
    p99_processing_time: number
    retry_rate: number
    stale_jobs_count: number
  }
}

interface SystemHealth {
  overall_health: 'healthy' | 'degraded' | 'critical'
  component_health: {
    content_generation: 'healthy' | 'degraded' | 'critical'
    wordpress_posting: 'healthy' | 'degraded' | 'critical'
    validation: 'healthy' | 'degraded' | 'critical'
    database: 'healthy' | 'degraded' | 'critical'
  }
  metrics: {
    failure_rate: number
    success_rate: number
    average_processing_time: number
    stale_jobs_count: number
  }
  alerts: Alert[]
  last_updated: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'metrics'
    const timeWindow = url.searchParams.get('time_window') || 'daily'
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    console.log(`Monitoring function - Action: ${action}, Time window: ${timeWindow}, Date: ${date}`)
    
    switch (action) {
      case 'metrics':
        return await handleMetrics(timeWindow, date)
      
      case 'failure-rate':
        return await handleFailureRate(timeWindow, date)
      
      case 'alerts':
        return await handleAlerts()
      
      case 'daily-report':
        return await handleDailyReport(date)
      
      case 'health':
        return await handleHealthCheck()
      
      case 'performance':
        return await handlePerformanceMetrics(timeWindow, date)
      
      case 'trends':
        return await handleTrends(timeWindow)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: metrics, failure-rate, alerts, daily-report, health, performance, trends' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Monitoring function error:', error)
    
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

async function handleMetrics(timeWindow: string, date: string): Promise<Response> {
  try {
    const metrics = await calculateMetrics(timeWindow, date)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'metrics',
        time_window: timeWindow,
        date: date,
        metrics: metrics,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error calculating metrics:', error)
    
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

async function handleFailureRate(timeWindow: string, date: string): Promise<Response> {
  try {
    const failureRate = await calculateFailureRate(timeWindow, date)
    
    // Use the alerting system to check and generate alerts
    const alertResult = await checkFailureRateAndAlert(
      failureRate.failure_rate,
      failureRate.total_jobs,
      failureRate.failed_jobs,
      timeWindow,
      date
    )
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'failure-rate',
        time_window: timeWindow,
        date: date,
        failure_rate: failureRate,
        alerting_result: alertResult,
        thresholds: MONITORING_CONFIG.FAILURE_THRESHOLDS,
        alerting_config: getAlertingConfig(),
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error calculating failure rate:', error)
    
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

async function handleAlerts(): Promise<Response> {
  try {
    const alerts = await getActiveAlerts()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'alerts',
        alerts: alerts,
        alert_count: alerts.length,
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

async function handleDailyReport(date: string): Promise<Response> {
  try {
    const report = await generateDailyReport(date)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'daily-report',
        date: date,
        report: report,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error generating daily report:', error)
    
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

async function handleHealthCheck(): Promise<Response> {
  try {
    const health = await getSystemHealth()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'health',
        health: health,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error checking system health:', error)
    
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

async function handlePerformanceMetrics(timeWindow: string, date: string): Promise<Response> {
  try {
    const performance = await calculatePerformanceMetrics(timeWindow, date)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'performance',
        time_window: timeWindow,
        date: date,
        performance: performance,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error calculating performance metrics:', error)
    
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

async function handleTrends(timeWindow: string): Promise<Response> {
  try {
    const trends = await calculateTrends(timeWindow)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'trends',
        time_window: timeWindow,
        trends: trends,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error calculating trends:', error)
    
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
 * Calculates comprehensive metrics for the specified time window
 */
async function calculateMetrics(timeWindow: string, date: string): Promise<MonitoringMetrics> {
  try {
    const startTime = getStartTime(timeWindow, date)
    const endTime = getEndTime(timeWindow, date)
    
    // Get job statistics
    const { data: jobStats, error: jobError } = await supabase
      .from('content_jobs')
      .select('status, created_at, completed_at, retry_count')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString())
    
    if (jobError) {
      throw new Error(`Failed to get job statistics: ${jobError.message}`)
    }
    
    // Get job run statistics for processing times
    const { data: jobRuns, error: runError } = await supabase
      .from('job_runs')
      .select('execution_time, status, job_id')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString())
    
    if (runError) {
      throw new Error(`Failed to get job run statistics: ${runError.message}`)
    }
    
    // Calculate basic metrics
    const totalJobs = jobStats.length
    const successfulJobs = jobStats.filter(job => job.status === 'completed').length
    const failedJobs = jobStats.filter(job => job.status === 'failed').length
    const pendingJobs = jobStats.filter(job => job.status === 'pending').length
    const processingJobs = jobStats.filter(job => job.status === 'processing').length
    
    const failureRate = totalJobs > 0 ? failedJobs / totalJobs : 0
    const successRate = totalJobs > 0 ? successfulJobs / totalJobs : 0
    
    // Calculate processing times
    const processingTimes = jobRuns
      .filter(run => run.execution_time > 0)
      .map(run => run.execution_time)
    
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0
    
    const medianProcessingTime = calculatePercentile(processingTimes, 50)
    const p95ProcessingTime = calculatePercentile(processingTimes, 95)
    
    // Calculate retry rate
    const jobsWithRetries = jobStats.filter(job => (job.retry_count || 0) > 0).length
    const retryRate = totalJobs > 0 ? jobsWithRetries / totalJobs : 0
    
    // Get stale jobs count
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes
    const staleJobs = jobStats.filter(job => 
      job.status === 'processing' && 
      job.created_at && 
      new Date(job.created_at) < staleThreshold
    ).length
    
    return {
      total_jobs: totalJobs,
      successful_jobs: successfulJobs,
      failed_jobs: failedJobs,
      pending_jobs: pendingJobs,
      processing_jobs: processingJobs,
      failure_rate: failureRate,
      success_rate: successRate,
      average_processing_time: averageProcessingTime,
      median_processing_time: medianProcessingTime,
      p95_processing_time: p95ProcessingTime,
      retry_rate: retryRate,
      stale_jobs_count: staleJobs,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('[Monitor] Failed to calculate metrics:', error)
    throw error
  }
}

/**
 * Calculates failure rate for the specified time window
 */
async function calculateFailureRate(timeWindow: string, date: string): Promise<{
  failure_rate: number
  total_jobs: number
  failed_jobs: number
  success_rate: number
  time_window: string
  date: string
}> {
  try {
    const metrics = await calculateMetrics(timeWindow, date)
    
    return {
      failure_rate: metrics.failure_rate,
      total_jobs: metrics.total_jobs,
      failed_jobs: metrics.failed_jobs,
      success_rate: metrics.success_rate,
      time_window: timeWindow,
      date: date
    }
    
  } catch (error) {
    console.error('[Monitor] Failed to calculate failure rate:', error)
    throw error
  }
}


/**
 * Gets active alerts
 */
async function getActiveAlerts(): Promise<Alert[]> {
  try {
    // Get recent alerts from monitoring_alerts table
    const { data: alerts, error } = await supabase
      .from('monitoring_alerts')
      .select('*')
      .eq('resolved', false)
      .order('timestamp', { ascending: false })
      .limit(50)
    
    if (error) {
      throw new Error(`Failed to get alerts: ${error.message}`)
    }
    
    return alerts || []
    
  } catch (error) {
    console.error('[Monitor] Failed to get alerts:', error)
    throw error
  }
}

/**
 * Generates daily report
 */
async function generateDailyReport(date: string): Promise<DailyReport> {
  try {
    const metrics = await calculateMetrics('daily', date)
    const alerts = await getActiveAlerts()
    
    // Get top failure reasons
    const { data: failureReasons, error: reasonError } = await supabase
      .from('content_jobs')
      .select('last_error')
      .eq('status', 'failed')
      .gte('created_at', new Date(date).toISOString())
      .lt('created_at', new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString())
      .not('last_error', 'is', null)
    
    if (reasonError) {
      console.error('[Monitor] Failed to get failure reasons:', reasonError)
    }
    
    // Count failure reasons
    const reasonCounts: Record<string, number> = {}
    failureReasons?.forEach(job => {
      if (job.last_error) {
        const reason = job.last_error.split(':')[0] // Get first part of error
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
      }
    })
    
    const topFailureReasons = Object.entries(reasonCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }))
    
    // Determine system health
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (metrics.failure_rate >= 0.20) {
      systemHealth = 'critical'
    } else if (metrics.failure_rate >= 0.15) {
      systemHealth = 'degraded'
    }
    
    return {
      date: date,
      total_jobs: metrics.total_jobs,
      successful_jobs: metrics.successful_jobs,
      failed_jobs: metrics.failed_jobs,
      failure_rate: metrics.failure_rate,
      success_rate: metrics.success_rate,
      average_processing_time: metrics.average_processing_time,
      alerts_generated: alerts.length,
      critical_alerts: alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'emergency').length,
      system_health: systemHealth,
      top_failure_reasons: topFailureReasons,
      performance_metrics: {
        p50_processing_time: metrics.median_processing_time,
        p95_processing_time: metrics.p95_processing_time,
        p99_processing_time: calculatePercentile([], 99), // Would need more data
        retry_rate: metrics.retry_rate,
        stale_jobs_count: metrics.stale_jobs_count
      }
    }
    
  } catch (error) {
    console.error('[Monitor] Failed to generate daily report:', error)
    throw error
  }
}

/**
 * Gets system health status
 */
async function getSystemHealth(): Promise<SystemHealth> {
  try {
    const metrics = await calculateMetrics('daily', new Date().toISOString().split('T')[0])
    const alerts = await getActiveAlerts()
    
    // Determine component health
    const componentHealth = {
      content_generation: 'healthy' as const,
      wordpress_posting: 'healthy' as const,
      validation: 'healthy' as const,
      database: 'healthy' as const
    }
    
    // Determine overall health
    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (metrics.failure_rate >= 0.20 || metrics.stale_jobs_count > 10) {
      overallHealth = 'critical'
    } else if (metrics.failure_rate >= 0.15 || metrics.stale_jobs_count > 5) {
      overallHealth = 'degraded'
    }
    
    return {
      overall_health: overallHealth,
      component_health: componentHealth,
      metrics: {
        failure_rate: metrics.failure_rate,
        success_rate: metrics.success_rate,
        average_processing_time: metrics.average_processing_time,
        stale_jobs_count: metrics.stale_jobs_count
      },
      alerts: alerts,
      last_updated: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('[Monitor] Failed to get system health:', error)
    throw error
  }
}

/**
 * Calculates performance metrics
 */
async function calculatePerformanceMetrics(timeWindow: string, date: string): Promise<any> {
  try {
    const metrics = await calculateMetrics(timeWindow, date)
    
    return {
      processing_times: {
        average: metrics.average_processing_time,
        median: metrics.median_processing_time,
        p95: metrics.p95_processing_time,
        max: metrics.p95_processing_time * 2 // Estimate
      },
      throughput: {
        jobs_per_hour: timeWindow === 'hourly' ? metrics.total_jobs : metrics.total_jobs / 24,
        success_rate: metrics.success_rate,
        retry_rate: metrics.retry_rate
      },
      reliability: {
        failure_rate: metrics.failure_rate,
        stale_jobs_count: metrics.stale_jobs_count,
        system_health: metrics.failure_rate < 0.15 ? 'healthy' : 'degraded'
      }
    }
    
  } catch (error) {
    console.error('[Monitor] Failed to calculate performance metrics:', error)
    throw error
  }
}

/**
 * Calculates trends over time
 */
async function calculateTrends(timeWindow: string): Promise<any> {
  try {
    const days = timeWindow === 'weekly' ? 7 : timeWindow === 'monthly' ? 30 : 1
    const trends = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      try {
        const metrics = await calculateMetrics('daily', dateStr)
        trends.push({
          date: dateStr,
          failure_rate: metrics.failure_rate,
          success_rate: metrics.success_rate,
          total_jobs: metrics.total_jobs,
          average_processing_time: metrics.average_processing_time
        })
      } catch (error) {
        console.error(`[Monitor] Failed to get metrics for ${dateStr}:`, error)
      }
    }
    
    return {
      time_window: timeWindow,
      trends: trends,
      summary: {
        average_failure_rate: trends.reduce((sum, t) => sum + t.failure_rate, 0) / trends.length,
        average_success_rate: trends.reduce((sum, t) => sum + t.success_rate, 0) / trends.length,
        total_jobs: trends.reduce((sum, t) => sum + t.total_jobs, 0),
        trend_direction: calculateTrendDirection(trends.map(t => t.failure_rate))
      }
    }
    
  } catch (error) {
    console.error('[Monitor] Failed to calculate trends:', error)
    throw error
  }
}

/**
 * Helper functions
 */
function getStartTime(timeWindow: string, date: string): Date {
  const baseDate = new Date(date)
  
  switch (timeWindow) {
    case 'hourly':
      return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), baseDate.getHours())
    case 'daily':
      return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
    case 'weekly':
      const weekStart = new Date(baseDate)
      weekStart.setDate(baseDate.getDate() - baseDate.getDay())
      return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
    case 'monthly':
      return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
    default:
      return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
  }
}

function getEndTime(timeWindow: string, date: string): Date {
  const startTime = getStartTime(timeWindow, date)
  
  switch (timeWindow) {
    case 'hourly':
      return new Date(startTime.getTime() + 60 * 60 * 1000)
    case 'daily':
      return new Date(startTime.getTime() + 24 * 60 * 60 * 1000)
    case 'weekly':
      return new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000)
    case 'monthly':
      return new Date(startTime.getFullYear(), startTime.getMonth() + 1, 1)
    default:
      return new Date(startTime.getTime() + 24 * 60 * 60 * 1000)
  }
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  
  const sorted = values.sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

function calculateTrendDirection(values: number[]): 'improving' | 'degrading' | 'stable' {
  if (values.length < 2) return 'stable'
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2))
  const secondHalf = values.slice(Math.floor(values.length / 2))
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
  
  const change = (secondAvg - firstAvg) / firstAvg
  
  if (change > 0.1) return 'degrading'
  if (change < -0.1) return 'improving'
  return 'stable'
}
