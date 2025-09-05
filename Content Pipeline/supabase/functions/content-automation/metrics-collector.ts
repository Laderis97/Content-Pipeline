// Metrics collection for success rates and performance monitoring
// PRD Reference: Monitoring & Maintenance Functions (5.6), Performance & Scalability (F1-F3)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Metrics collection configuration
const METRICS_CONFIG = {
  // Collection intervals
  INTERVALS: {
    real_time: 30 * 1000, // 30 seconds
    hourly: 60 * 60 * 1000, // 1 hour
    daily: 24 * 60 * 60 * 1000, // 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // Metrics retention periods
  RETENTION: {
    real_time_metrics: 24 * 60 * 60 * 1000, // 24 hours
    hourly_metrics: 30 * 24 * 60 * 60 * 1000, // 30 days
    daily_metrics: 365 * 24 * 60 * 60 * 1000, // 1 year
    weekly_metrics: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
  },
  
  // Performance thresholds
  THRESHOLDS: {
    success_rate_warning: 95, // 95%
    success_rate_critical: 90, // 90%
    processing_time_warning: 10000, // 10 seconds
    processing_time_critical: 30000, // 30 seconds
    queue_size_warning: 50, // 50 jobs
    queue_size_critical: 100, // 100 jobs
    throughput_warning: 10, // 10 jobs/hour
    throughput_critical: 5, // 5 jobs/hour
  },
  
  // Metrics aggregation
  AGGREGATION: {
    batch_size: 1000,
    max_processing_time: 5 * 60 * 1000, // 5 minutes
    aggregation_delay: 1000, // 1 second
  }
}

interface MetricData {
  id: string
  metric_type: string
  metric_name: string
  metric_value: number
  metric_unit: string
  timestamp: string
  metadata?: any
  tags?: Record<string, string>
}

interface PerformanceMetrics {
  success_rate: number
  processing_time_avg: number
  processing_time_p95: number
  processing_time_p99: number
  throughput_per_hour: number
  queue_size: number
  error_rate: number
  retry_rate: number
  completion_rate: number
}

interface SystemMetrics {
  database_performance: {
    query_time_avg: number
    connection_count: number
    active_queries: number
    slow_queries: number
  }
  external_services: {
    openai_response_time: number
    wordpress_response_time: number
    openai_success_rate: number
    wordpress_success_rate: number
  }
  resource_usage: {
    memory_usage_percent: number
    cpu_usage_percent: number
    disk_usage_percent: number
  }
}

interface MetricsSummary {
  time_period: string
  start_time: string
  end_time: string
  total_metrics: number
  performance_metrics: PerformanceMetrics
  system_metrics: SystemMetrics
  alerts: string[]
  trends: {
    success_rate_trend: 'improving' | 'degrading' | 'stable'
    processing_time_trend: 'improving' | 'degrading' | 'stable'
    throughput_trend: 'improving' | 'degrading' | 'stable'
  }
}

/**
 * Metrics collection and performance monitoring system
 */
export class MetricsCollector {
  private metricsBuffer: MetricData[] = []
  private lastCollectionTime: number = 0

  constructor() {
    // Initialize metrics collection
  }

  /**
   * Collects comprehensive metrics for the system
   */
  async collectMetrics(): Promise<{
    success: boolean
    metrics_collected: number
    performance_metrics: PerformanceMetrics
    system_metrics: SystemMetrics
    alerts: string[]
    errors: string[]
  }> {
    try {
      console.log('[MetricsCollector] Starting comprehensive metrics collection')
      
      const startTime = Date.now()
      const errors: string[] = []
      const alerts: string[] = []
      
      // Collect performance metrics
      const performanceMetrics = await this.collectPerformanceMetrics()
      
      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics()
      
      // Collect custom metrics
      const customMetrics = await this.collectCustomMetrics()
      
      // Store metrics
      const storedMetrics = await this.storeMetrics([
        ...this.performanceMetricsToMetricData(performanceMetrics),
        ...this.systemMetricsToMetricData(systemMetrics),
        ...customMetrics
      ])
      
      // Generate alerts
      const generatedAlerts = this.generateAlerts(performanceMetrics, systemMetrics)
      alerts.push(...generatedAlerts)
      
      // Update metrics buffer
      this.metricsBuffer.push(...storedMetrics)
      
      // Clean up old metrics if needed
      await this.cleanupOldMetrics()
      
      const processingTime = Date.now() - startTime
      
      console.log(`[MetricsCollector] Metrics collection completed in ${processingTime}ms - ${storedMetrics.length} metrics collected`)
      
      return {
        success: true,
        metrics_collected: storedMetrics.length,
        performance_metrics: performanceMetrics,
        system_metrics: systemMetrics,
        alerts: alerts,
        errors: errors
      }
      
    } catch (error) {
      console.error('[MetricsCollector] Metrics collection failed:', error)
      
      return {
        success: false,
        metrics_collected: 0,
        performance_metrics: this.getDefaultPerformanceMetrics(),
        system_metrics: this.getDefaultSystemMetrics(),
        alerts: [],
        errors: [error.message]
      }
    }
  }

  /**
   * Collects performance metrics
   */
  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      // Get job statistics for the last hour
      const { data: hourlyJobs, error: hourlyError } = await supabase
        .from('content_jobs')
        .select('status, created_at, updated_at')
        .gte('created_at', oneHourAgo.toISOString())
      
      if (hourlyError) {
        throw new Error(`Failed to get hourly jobs: ${hourlyError.message}`)
      }
      
      // Get job run statistics for the last hour
      const { data: hourlyJobRuns, error: hourlyRunsError } = await supabase
        .from('job_runs')
        .select('processing_time_ms, status, created_at')
        .gte('created_at', oneHourAgo.toISOString())
      
      if (hourlyRunsError) {
        throw new Error(`Failed to get hourly job runs: ${hourlyRunsError.message}`)
      }
      
      // Get queue size
      const { data: queueJobs, error: queueError } = await supabase
        .from('content_jobs')
        .select('id')
        .in('status', ['pending', 'processing'])
      
      if (queueError) {
        throw new Error(`Failed to get queue jobs: ${queueError.message}`)
      }
      
      // Calculate success rate
      const totalJobs = hourlyJobs?.length || 0
      const successfulJobs = hourlyJobs?.filter(job => job.status === 'completed').length || 0
      const failedJobs = hourlyJobs?.filter(job => job.status === 'failed').length || 0
      const retriedJobs = hourlyJobs?.filter(job => (job as any).retry_count > 0).length || 0
      
      const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 100
      const errorRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0
      const retryRate = totalJobs > 0 ? (retriedJobs / totalJobs) * 100 : 0
      const completionRate = totalJobs > 0 ? ((successfulJobs + failedJobs) / totalJobs) * 100 : 100
      
      // Calculate processing times
      const processingTimes = hourlyJobRuns?.map(run => run.processing_time_ms) || []
      const processingTimeAvg = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0
      
      // Calculate percentiles
      const sortedTimes = processingTimes.sort((a, b) => a - b)
      const p95Index = Math.floor(sortedTimes.length * 0.95)
      const p99Index = Math.floor(sortedTimes.length * 0.99)
      
      const processingTimeP95 = sortedTimes[p95Index] || 0
      const processingTimeP99 = sortedTimes[p99Index] || 0
      
      // Calculate throughput
      const throughputPerHour = totalJobs
      
      return {
        success_rate: successRate,
        processing_time_avg: processingTimeAvg,
        processing_time_p95: processingTimeP95,
        processing_time_p99: processingTimeP99,
        throughput_per_hour: throughputPerHour,
        queue_size: queueJobs?.length || 0,
        error_rate: errorRate,
        retry_rate: retryRate,
        completion_rate: completionRate
      }
      
    } catch (error) {
      console.error('[MetricsCollector] Failed to collect performance metrics:', error)
      return this.getDefaultPerformanceMetrics()
    }
  }

  /**
   * Collects system metrics
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Database performance metrics
      const dbStartTime = Date.now()
      const { data: dbTest, error: dbError } = await supabase
        .from('content_jobs')
        .select('id')
        .limit(1)
      
      const dbResponseTime = Date.now() - dbStartTime
      
      // External services metrics (simulated for now)
      const openaiResponseTime = Math.random() * 1000 + 500 // 500-1500ms
      const wordpressResponseTime = Math.random() * 800 + 300 // 300-1100ms
      
      // Resource usage metrics (simulated for now)
      const memoryUsage = Math.random() * 100
      const cpuUsage = Math.random() * 100
      const diskUsage = Math.random() * 100
      
      return {
        database_performance: {
          query_time_avg: dbResponseTime,
          connection_count: 1, // Simulated
          active_queries: 0, // Simulated
          slow_queries: dbResponseTime > 1000 ? 1 : 0
        },
        external_services: {
          openai_response_time: openaiResponseTime,
          wordpress_response_time: wordpressResponseTime,
          openai_success_rate: 99.5, // Simulated
          wordpress_success_rate: 98.8 // Simulated
        },
        resource_usage: {
          memory_usage_percent: memoryUsage,
          cpu_usage_percent: cpuUsage,
          disk_usage_percent: diskUsage
        }
      }
      
    } catch (error) {
      console.error('[MetricsCollector] Failed to collect system metrics:', error)
      return this.getDefaultSystemMetrics()
    }
  }

  /**
   * Collects custom metrics
   */
  private async collectCustomMetrics(): Promise<MetricData[]> {
    try {
      const metrics: MetricData[] = []
      const timestamp = new Date().toISOString()
      
      // Content generation metrics
      const { data: contentJobs, error: contentError } = await supabase
        .from('content_jobs')
        .select('content_type, status')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      
      if (!contentError && contentJobs) {
        const contentTypes = [...new Set(contentJobs.map(job => job.content_type))]
        
        for (const contentType of contentTypes) {
          const typeJobs = contentJobs.filter(job => job.content_type === contentType)
          const successCount = typeJobs.filter(job => job.status === 'completed').length
          const totalCount = typeJobs.length
          const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0
          
          metrics.push({
            id: crypto.randomUUID(),
            metric_type: 'content_generation',
            metric_name: `${contentType}_success_rate`,
            metric_value: successRate,
            metric_unit: 'percent',
            timestamp: timestamp,
            tags: { content_type: contentType }
          })
        }
      }
      
      // WordPress posting metrics
      const { data: wordpressJobs, error: wordpressError } = await supabase
        .from('content_jobs')
        .select('wordpress_post_id, status')
        .not('wordpress_post_id', 'is', null)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      
      if (!wordpressError && wordpressJobs) {
        const wordpressSuccessRate = wordpressJobs.length > 0 
          ? (wordpressJobs.filter(job => job.status === 'completed').length / wordpressJobs.length) * 100 
          : 0
        
        metrics.push({
          id: crypto.randomUUID(),
          metric_type: 'wordpress_posting',
          metric_name: 'wordpress_success_rate',
          metric_value: wordpressSuccessRate,
          metric_unit: 'percent',
          timestamp: timestamp
        })
      }
      
      return metrics
      
    } catch (error) {
      console.error('[MetricsCollector] Failed to collect custom metrics:', error)
      return []
    }
  }

  /**
   * Converts performance metrics to metric data format
   */
  private performanceMetricsToMetricData(metrics: PerformanceMetrics): MetricData[] {
    const timestamp = new Date().toISOString()
    const metricData: MetricData[] = []
    
    Object.entries(metrics).forEach(([key, value]) => {
      metricData.push({
        id: crypto.randomUUID(),
        metric_type: 'performance',
        metric_name: key,
        metric_value: value,
        metric_unit: this.getMetricUnit(key),
        timestamp: timestamp,
        tags: { category: 'performance' }
      })
    })
    
    return metricData
  }

  /**
   * Converts system metrics to metric data format
   */
  private systemMetricsToMetricData(metrics: SystemMetrics): MetricData[] {
    const timestamp = new Date().toISOString()
    const metricData: MetricData[] = []
    
    // Database performance metrics
    Object.entries(metrics.database_performance).forEach(([key, value]) => {
      metricData.push({
        id: crypto.randomUUID(),
        metric_type: 'system',
        metric_name: `database_${key}`,
        metric_value: value,
        metric_unit: this.getMetricUnit(key),
        timestamp: timestamp,
        tags: { category: 'database' }
      })
    })
    
    // External services metrics
    Object.entries(metrics.external_services).forEach(([key, value]) => {
      metricData.push({
        id: crypto.randomUUID(),
        metric_type: 'system',
        metric_name: `external_${key}`,
        metric_value: value,
        metric_unit: this.getMetricUnit(key),
        timestamp: timestamp,
        tags: { category: 'external_services' }
      })
    })
    
    // Resource usage metrics
    Object.entries(metrics.resource_usage).forEach(([key, value]) => {
      metricData.push({
        id: crypto.randomUUID(),
        metric_type: 'system',
        metric_name: `resource_${key}`,
        metric_value: value,
        metric_unit: this.getMetricUnit(key),
        timestamp: timestamp,
        tags: { category: 'resources' }
      })
    })
    
    return metricData
  }

  /**
   * Gets metric unit for a given metric name
   */
  private getMetricUnit(metricName: string): string {
    const unitMap: Record<string, string> = {
      success_rate: 'percent',
      error_rate: 'percent',
      retry_rate: 'percent',
      completion_rate: 'percent',
      processing_time_avg: 'milliseconds',
      processing_time_p95: 'milliseconds',
      processing_time_p99: 'milliseconds',
      throughput_per_hour: 'jobs_per_hour',
      queue_size: 'jobs',
      response_time: 'milliseconds',
      connection_count: 'connections',
      active_queries: 'queries',
      slow_queries: 'queries',
      memory_usage_percent: 'percent',
      cpu_usage_percent: 'percent',
      disk_usage_percent: 'percent'
    }
    
    return unitMap[metricName] || 'count'
  }

  /**
   * Stores metrics in the database
   */
  private async storeMetrics(metrics: MetricData[]): Promise<MetricData[]> {
    try {
      if (metrics.length === 0) {
        return []
      }
      
      const { data, error } = await supabase
        .from('metrics_data')
        .insert(metrics)
        .select()
      
      if (error) {
        throw new Error(`Failed to store metrics: ${error.message}`)
      }
      
      return data || []
      
    } catch (error) {
      console.error('[MetricsCollector] Failed to store metrics:', error)
      return []
    }
  }

  /**
   * Generates alerts based on metrics
   */
  private generateAlerts(performanceMetrics: PerformanceMetrics, systemMetrics: SystemMetrics): string[] {
    const alerts: string[] = []
    
    // Performance alerts
    if (performanceMetrics.success_rate < METRICS_CONFIG.THRESHOLDS.success_rate_critical) {
      alerts.push(`Critical: Success rate is ${performanceMetrics.success_rate.toFixed(1)}% (below ${METRICS_CONFIG.THRESHOLDS.success_rate_critical}%)`)
    } else if (performanceMetrics.success_rate < METRICS_CONFIG.THRESHOLDS.success_rate_warning) {
      alerts.push(`Warning: Success rate is ${performanceMetrics.success_rate.toFixed(1)}% (below ${METRICS_CONFIG.THRESHOLDS.success_rate_warning}%)`)
    }
    
    if (performanceMetrics.processing_time_avg > METRICS_CONFIG.THRESHOLDS.processing_time_critical) {
      alerts.push(`Critical: Average processing time is ${performanceMetrics.processing_time_avg.toFixed(0)}ms (above ${METRICS_CONFIG.THRESHOLDS.processing_time_critical}ms)`)
    } else if (performanceMetrics.processing_time_avg > METRICS_CONFIG.THRESHOLDS.processing_time_warning) {
      alerts.push(`Warning: Average processing time is ${performanceMetrics.processing_time_avg.toFixed(0)}ms (above ${METRICS_CONFIG.THRESHOLDS.processing_time_warning}ms)`)
    }
    
    if (performanceMetrics.queue_size > METRICS_CONFIG.THRESHOLDS.queue_size_critical) {
      alerts.push(`Critical: Queue size is ${performanceMetrics.queue_size} jobs (above ${METRICS_CONFIG.THRESHOLDS.queue_size_critical})`)
    } else if (performanceMetrics.queue_size > METRICS_CONFIG.THRESHOLDS.queue_size_warning) {
      alerts.push(`Warning: Queue size is ${performanceMetrics.queue_size} jobs (above ${METRICS_CONFIG.THRESHOLDS.queue_size_warning})`)
    }
    
    if (performanceMetrics.throughput_per_hour < METRICS_CONFIG.THRESHOLDS.throughput_critical) {
      alerts.push(`Critical: Throughput is ${performanceMetrics.throughput_per_hour} jobs/hour (below ${METRICS_CONFIG.THRESHOLDS.throughput_critical})`)
    } else if (performanceMetrics.throughput_per_hour < METRICS_CONFIG.THRESHOLDS.throughput_warning) {
      alerts.push(`Warning: Throughput is ${performanceMetrics.throughput_per_hour} jobs/hour (below ${METRICS_CONFIG.THRESHOLDS.throughput_warning})`)
    }
    
    // System alerts
    if (systemMetrics.database_performance.query_time_avg > 2000) {
      alerts.push(`Warning: Database query time is ${systemMetrics.database_performance.query_time_avg.toFixed(0)}ms`)
    }
    
    if (systemMetrics.external_services.openai_response_time > 5000) {
      alerts.push(`Warning: OpenAI response time is ${systemMetrics.external_services.openai_response_time.toFixed(0)}ms`)
    }
    
    if (systemMetrics.external_services.wordpress_response_time > 5000) {
      alerts.push(`Warning: WordPress response time is ${systemMetrics.external_services.wordpress_response_time.toFixed(0)}ms`)
    }
    
    return alerts
  }

  /**
   * Cleans up old metrics
   */
  private async cleanupOldMetrics(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - METRICS_CONFIG.RETENTION.real_time_metrics)
      
      const { error } = await supabase
        .from('metrics_data')
        .delete()
        .lt('timestamp', cutoffTime.toISOString())
      
      if (error) {
        console.error('[MetricsCollector] Failed to cleanup old metrics:', error)
      }
      
    } catch (error) {
      console.error('[MetricsCollector] Failed to cleanup old metrics:', error)
    }
  }

  /**
   * Gets metrics summary for a time period
   */
  async getMetricsSummary(timePeriod: string = 'hourly'): Promise<MetricsSummary> {
    try {
      const now = new Date()
      let startTime: Date
      
      switch (timePeriod) {
        case 'hourly':
          startTime = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case 'daily':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'weekly':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        default:
          startTime = new Date(now.getTime() - 60 * 60 * 1000)
      }
      
      // Get metrics for the time period
      const { data: metrics, error } = await supabase
        .from('metrics_data')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .lte('timestamp', now.toISOString())
      
      if (error) {
        throw new Error(`Failed to get metrics: ${error.message}`)
      }
      
      // Aggregate metrics
      const performanceMetrics = this.aggregatePerformanceMetrics(metrics || [])
      const systemMetrics = this.aggregateSystemMetrics(metrics || [])
      
      // Calculate trends
      const trends = await this.calculateTrends(timePeriod)
      
      // Generate alerts
      const alerts = this.generateAlerts(performanceMetrics, systemMetrics)
      
      return {
        time_period: timePeriod,
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        total_metrics: metrics?.length || 0,
        performance_metrics: performanceMetrics,
        system_metrics: systemMetrics,
        alerts: alerts,
        trends: trends
      }
      
    } catch (error) {
      console.error('[MetricsCollector] Failed to get metrics summary:', error)
      throw error
    }
  }

  /**
   * Aggregates performance metrics from raw data
   */
  private aggregatePerformanceMetrics(metrics: any[]): PerformanceMetrics {
    const performanceMetrics = metrics.filter(m => m.metric_type === 'performance')
    
    const aggregated: any = {}
    
    performanceMetrics.forEach(metric => {
      if (!aggregated[metric.metric_name]) {
        aggregated[metric.metric_name] = []
      }
      aggregated[metric.metric_name].push(metric.metric_value)
    })
    
    return {
      success_rate: this.calculateAverage(aggregated.success_rate) || 0,
      processing_time_avg: this.calculateAverage(aggregated.processing_time_avg) || 0,
      processing_time_p95: this.calculatePercentile(aggregated.processing_time_p95, 95) || 0,
      processing_time_p99: this.calculatePercentile(aggregated.processing_time_p99, 99) || 0,
      throughput_per_hour: this.calculateAverage(aggregated.throughput_per_hour) || 0,
      queue_size: this.calculateAverage(aggregated.queue_size) || 0,
      error_rate: this.calculateAverage(aggregated.error_rate) || 0,
      retry_rate: this.calculateAverage(aggregated.retry_rate) || 0,
      completion_rate: this.calculateAverage(aggregated.completion_rate) || 0
    }
  }

  /**
   * Aggregates system metrics from raw data
   */
  private aggregateSystemMetrics(metrics: any[]): SystemMetrics {
    const systemMetrics = metrics.filter(m => m.metric_type === 'system')
    
    const aggregated: any = {}
    
    systemMetrics.forEach(metric => {
      if (!aggregated[metric.metric_name]) {
        aggregated[metric.metric_name] = []
      }
      aggregated[metric.metric_name].push(metric.metric_value)
    })
    
    return {
      database_performance: {
        query_time_avg: this.calculateAverage(aggregated.database_query_time_avg) || 0,
        connection_count: this.calculateAverage(aggregated.database_connection_count) || 0,
        active_queries: this.calculateAverage(aggregated.database_active_queries) || 0,
        slow_queries: this.calculateAverage(aggregated.database_slow_queries) || 0
      },
      external_services: {
        openai_response_time: this.calculateAverage(aggregated.external_openai_response_time) || 0,
        wordpress_response_time: this.calculateAverage(aggregated.external_wordpress_response_time) || 0,
        openai_success_rate: this.calculateAverage(aggregated.external_openai_success_rate) || 0,
        wordpress_success_rate: this.calculateAverage(aggregated.external_wordpress_success_rate) || 0
      },
      resource_usage: {
        memory_usage_percent: this.calculateAverage(aggregated.resource_memory_usage_percent) || 0,
        cpu_usage_percent: this.calculateAverage(aggregated.resource_cpu_usage_percent) || 0,
        disk_usage_percent: this.calculateAverage(aggregated.resource_disk_usage_percent) || 0
      }
    }
  }

  /**
   * Calculates trends for metrics
   */
  private async calculateTrends(timePeriod: string): Promise<{
    success_rate_trend: 'improving' | 'degrading' | 'stable'
    processing_time_trend: 'improving' | 'degrading' | 'stable'
    throughput_trend: 'improving' | 'degrading' | 'stable'
  }> {
    try {
      // Get metrics for comparison period
      const now = new Date()
      const currentPeriodStart = new Date(now.getTime() - this.getPeriodDuration(timePeriod))
      const previousPeriodStart = new Date(currentPeriodStart.getTime() - this.getPeriodDuration(timePeriod))
      
      const { data: currentMetrics, error: currentError } = await supabase
        .from('metrics_data')
        .select('*')
        .gte('timestamp', currentPeriodStart.toISOString())
        .lte('timestamp', now.toISOString())
      
      const { data: previousMetrics, error: previousError } = await supabase
        .from('metrics_data')
        .select('*')
        .gte('timestamp', previousPeriodStart.toISOString())
        .lt('timestamp', currentPeriodStart.toISOString())
      
      if (currentError || previousError) {
        return { success_rate_trend: 'stable', processing_time_trend: 'stable', throughput_trend: 'stable' }
      }
      
      const currentPerformance = this.aggregatePerformanceMetrics(currentMetrics || [])
      const previousPerformance = this.aggregatePerformanceMetrics(previousMetrics || [])
      
      return {
        success_rate_trend: this.calculateTrend(currentPerformance.success_rate, previousPerformance.success_rate),
        processing_time_trend: this.calculateTrend(previousPerformance.processing_time_avg, currentPerformance.processing_time_avg), // Inverted for processing time
        throughput_trend: this.calculateTrend(currentPerformance.throughput_per_hour, previousPerformance.throughput_per_hour)
      }
      
    } catch (error) {
      console.error('[MetricsCollector] Failed to calculate trends:', error)
      return { success_rate_trend: 'stable', processing_time_trend: 'stable', throughput_trend: 'stable' }
    }
  }

  /**
   * Gets period duration in milliseconds
   */
  private getPeriodDuration(timePeriod: string): number {
    switch (timePeriod) {
      case 'hourly': return 60 * 60 * 1000
      case 'daily': return 24 * 60 * 60 * 1000
      case 'weekly': return 7 * 24 * 60 * 60 * 1000
      default: return 60 * 60 * 1000
    }
  }

  /**
   * Calculates trend direction
   */
  private calculateTrend(current: number, previous: number): 'improving' | 'degrading' | 'stable' {
    if (previous === 0) return 'stable'
    
    const change = (current - previous) / previous
    
    if (change > 0.05) return 'improving'
    if (change < -0.05) return 'degrading'
    return 'stable'
  }

  /**
   * Calculates average of an array
   */
  private calculateAverage(values: number[]): number {
    if (!values || values.length === 0) return 0
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  /**
   * Calculates percentile of an array
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (!values || values.length === 0) return 0
    
    const sorted = values.sort((a, b) => a - b)
    const index = Math.floor(sorted.length * (percentile / 100))
    return sorted[index] || 0
  }

  /**
   * Gets default performance metrics
   */
  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      success_rate: 100,
      processing_time_avg: 0,
      processing_time_p95: 0,
      processing_time_p99: 0,
      throughput_per_hour: 0,
      queue_size: 0,
      error_rate: 0,
      retry_rate: 0,
      completion_rate: 100
    }
  }

  /**
   * Gets default system metrics
   */
  private getDefaultSystemMetrics(): SystemMetrics {
    return {
      database_performance: {
        query_time_avg: 0,
        connection_count: 0,
        active_queries: 0,
        slow_queries: 0
      },
      external_services: {
        openai_response_time: 0,
        wordpress_response_time: 0,
        openai_success_rate: 100,
        wordpress_success_rate: 100
      },
      resource_usage: {
        memory_usage_percent: 0,
        cpu_usage_percent: 0,
        disk_usage_percent: 0
      }
    }
  }

  /**
   * Gets metrics configuration
   */
  getMetricsConfig(): typeof METRICS_CONFIG {
    return METRICS_CONFIG
  }
}

/**
 * Creates a metrics collector instance
 */
export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector()
}

/**
 * Collects metrics
 */
export async function collectMetrics(): Promise<{
  success: boolean
  metrics_collected: number
  performance_metrics: PerformanceMetrics
  system_metrics: SystemMetrics
  alerts: string[]
  errors: string[]
}> {
  const collector = createMetricsCollector()
  return await collector.collectMetrics()
}

/**
 * Gets metrics summary
 */
export async function getMetricsSummary(timePeriod: string = 'hourly'): Promise<MetricsSummary> {
  const collector = createMetricsCollector()
  return await collector.getMetricsSummary(timePeriod)
}

/**
 * Gets metrics configuration
 */
export function getMetricsConfig(): typeof METRICS_CONFIG {
  const collector = createMetricsCollector()
  return collector.getMetricsConfig()
}
