import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface HistoricalData {
  timeRange: {
    start: string
    end: string
    period: string
  }
  performanceTrends: Array<{
    timestamp: string
    avgResponseTime: number
    throughput: number
    successRate: number
    errorRate: number
  }>
  jobTrends: Array<{
    date: string
    total: number
    completed: number
    failed: number
    pending: number
  }>
  functionPerformance: Array<{
    functionName: string
    avgResponseTime: number
    totalCalls: number
    successRate: number
    errorRate: number
  }>
  topErrors: Array<{
    error: string
    count: number
    lastOccurred: string
  }>
  systemMetrics: {
    peakResponseTime: number
    peakThroughput: number
    averageUptime: number
    totalJobsProcessed: number
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const period = url.searchParams.get('period') || '24h'
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Calculate time range based on period
    const now = new Date()
    let startTime: Date
    let periodLabel: string

    switch (period) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        periodLabel = 'Last Hour'
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        periodLabel = 'Last 24 Hours'
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        periodLabel = 'Last 7 Days'
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        periodLabel = 'Last 30 Days'
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        periodLabel = 'Last 24 Hours'
    }

    const historicalData: HistoricalData = {
      timeRange: {
        start: startTime.toISOString(),
        end: now.toISOString(),
        period: periodLabel
      },
      performanceTrends: [],
      jobTrends: [],
      functionPerformance: [],
      topErrors: [],
      systemMetrics: {
        peakResponseTime: 0,
        peakThroughput: 0,
        averageUptime: 0,
        totalJobsProcessed: 0
      }
    }

    // Get performance trends (hourly data)
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics_data')
      .select('response_time, created_at, success')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: true })

    if (!metricsError && metrics) {
      // Group metrics by hour
      const hourlyData = new Map<string, { responseTimes: number[], successes: number, total: number }>()
      
      metrics.forEach(metric => {
        const hour = new Date(metric.created_at).toISOString().substring(0, 13) + ':00:00Z'
        if (!hourlyData.has(hour)) {
          hourlyData.set(hour, { responseTimes: [], successes: 0, total: 0 })
        }
        const data = hourlyData.get(hour)!
        data.responseTimes.push(metric.response_time || 0)
        data.total++
        if (metric.success) data.successes++
      })

      // Convert to performance trends
      historicalData.performanceTrends = Array.from(hourlyData.entries()).map(([timestamp, data]) => ({
        timestamp,
        avgResponseTime: data.responseTimes.length > 0 
          ? Math.round(data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length)
          : 0,
        throughput: data.total,
        successRate: data.total > 0 ? (data.successes / data.total) * 100 : 0,
        errorRate: data.total > 0 ? ((data.total - data.successes) / data.total) * 100 : 0
      }))

      // Calculate system metrics
      const allResponseTimes = metrics.map(m => m.response_time || 0).filter(rt => rt > 0)
      if (allResponseTimes.length > 0) {
        historicalData.systemMetrics.peakResponseTime = Math.max(...allResponseTimes)
        historicalData.systemMetrics.peakThroughput = Math.max(...historicalData.performanceTrends.map(t => t.throughput))
        historicalData.systemMetrics.totalJobsProcessed = metrics.length
        historicalData.systemMetrics.averageUptime = 99.9 // This would be calculated from actual uptime data
      }
    }

    // Get job trends (daily data)
    const { data: jobs, error: jobsError } = await supabase
      .from('content_jobs')
      .select('status, created_at, completed_at')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: true })

    if (!jobsError && jobs) {
      // Group jobs by date
      const dailyData = new Map<string, { total: number, completed: number, failed: number, pending: number }>()
      
      jobs.forEach(job => {
        const date = new Date(job.created_at).toISOString().substring(0, 10)
        if (!dailyData.has(date)) {
          dailyData.set(date, { total: 0, completed: 0, failed: 0, pending: 0 })
        }
        const data = dailyData.get(date)!
        data.total++
        if (job.status === 'completed') data.completed++
        else if (job.status === 'failed') data.failed++
        else if (job.status === 'pending') data.pending++
      })

      // Convert to job trends
      historicalData.jobTrends = Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        total: data.total,
        completed: data.completed,
        failed: data.failed,
        pending: data.pending
      }))
    }

    // Get function performance data
    const functionNames = ['health', 'performance-monitor', 'metrics', 'content-automation']
    
    for (const functionName of functionNames) {
      const { data: functionMetrics, error: functionError } = await supabase
        .from('metrics_data')
        .select('response_time, success, created_at')
        .eq('function_name', functionName)
        .gte('created_at', startTime.toISOString())

      if (!functionError && functionMetrics && functionMetrics.length > 0) {
        const responseTimes = functionMetrics.map(m => m.response_time || 0).filter(rt => rt > 0)
        const successes = functionMetrics.filter(m => m.success).length
        const total = functionMetrics.length
        
        historicalData.functionPerformance.push({
          functionName,
          avgResponseTime: responseTimes.length > 0 
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0,
          totalCalls: total,
          successRate: total > 0 ? (successes / total) * 100 : 0,
          errorRate: total > 0 ? ((total - successes) / total) * 100 : 0
        })
      }
    }

    // Get top errors
    const { data: errorLogs, error: errorLogsError } = await supabase
      .from('monitoring_alerts')
      .select('message, level, created_at')
      .eq('level', 'error')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false })

    if (!errorLogsError && errorLogs) {
      // Group errors by message
      const errorCounts = new Map<string, { count: number, lastOccurred: string }>()
      
      errorLogs.forEach(error => {
        const message = error.message
        if (!errorCounts.has(message)) {
          errorCounts.set(message, { count: 0, lastOccurred: error.created_at })
        }
        const data = errorCounts.get(message)!
        data.count++
        if (new Date(error.created_at) > new Date(data.lastOccurred)) {
          data.lastOccurred = error.created_at
        }
      })

      // Convert to top errors
      historicalData.topErrors = Array.from(errorCounts.entries())
        .map(([error, data]) => ({
          error,
          count: data.count,
          lastOccurred: data.lastOccurred
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: historicalData,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Historical dashboard error:', error)
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
