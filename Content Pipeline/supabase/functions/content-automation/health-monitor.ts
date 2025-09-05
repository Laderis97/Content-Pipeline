// System health checks and status reporting
// PRD Reference: Monitoring & Maintenance Functions (5.5), Performance & Scalability (F1-F3)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Health monitoring configuration
const HEALTH_CONFIG = {
  // Health check intervals
  INTERVALS: {
    database_health: 30 * 1000, // 30 seconds
    external_services: 60 * 1000, // 1 minute
    system_resources: 2 * 60 * 1000, // 2 minutes
    performance_metrics: 5 * 60 * 1000, // 5 minutes
  },
  
  // Health thresholds
  THRESHOLDS: {
    database_response_time: 1000, // 1 second
    external_service_timeout: 5000, // 5 seconds
    memory_usage_percent: 80, // 80%
    cpu_usage_percent: 70, // 70%
    disk_usage_percent: 85, // 85%
    failure_rate_percent: 20, // 20%
    queue_size: 100, // 100 jobs
  },
  
  // Health status levels
  STATUS_LEVELS: {
    healthy: 'healthy',
    warning: 'warning',
    critical: 'critical',
    down: 'down'
  },
  
  // External service endpoints
  EXTERNAL_SERVICES: {
    openai: 'https://api.openai.com/v1/models',
    wordpress: Deno.env.get('WORDPRESS_URL') + '/wp-json/wp/v2/posts',
  },
  
  // Health check timeouts
  TIMEOUTS: {
    database_query: 5000, // 5 seconds
    external_service: 10000, // 10 seconds
    system_check: 3000, // 3 seconds
  }
}

interface HealthCheck {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'down'
  response_time_ms: number
  last_check: string
  error_message?: string
  metadata?: any
}

interface SystemHealth {
  overall_status: 'healthy' | 'warning' | 'critical' | 'down'
  timestamp: string
  checks: HealthCheck[]
  summary: {
    total_checks: number
    healthy_checks: number
    warning_checks: number
    critical_checks: number
    down_checks: number
    average_response_time: number
  }
  recommendations: string[]
  uptime_percentage: number
  last_incident?: string
}

interface PerformanceMetrics {
  database_performance: {
    query_time_avg: number
    connection_count: number
    active_queries: number
    slow_queries: number
  }
  system_resources: {
    memory_usage_percent: number
    cpu_usage_percent: number
    disk_usage_percent: number
    available_memory_mb: number
  }
  content_processing: {
    jobs_processed_last_hour: number
    average_processing_time: number
    success_rate: number
    queue_size: number
  }
  external_services: {
    openai_status: 'healthy' | 'warning' | 'critical' | 'down'
    wordpress_status: 'healthy' | 'warning' | 'critical' | 'down'
    openai_response_time: number
    wordpress_response_time: number
  }
}

/**
 * System health monitoring and status reporting
 */
export class HealthMonitor {
  private healthHistory: Map<string, HealthCheck[]> = new Map()
  private lastHealthCheck: number = 0

  constructor() {
    // Initialize health monitoring
  }

  /**
   * Performs comprehensive system health check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    try {
      console.log('[HealthMonitor] Starting comprehensive health check')
      
      const startTime = Date.now()
      const checks: HealthCheck[] = []
      
      // Database health check
      const dbHealth = await this.checkDatabaseHealth()
      checks.push(dbHealth)
      
      // External services health check
      const externalHealth = await this.checkExternalServices()
      checks.push(...externalHealth)
      
      // System resources health check
      const systemHealth = await this.checkSystemResources()
      checks.push(systemHealth)
      
      // Performance metrics health check
      const performanceHealth = await this.checkPerformanceMetrics()
      checks.push(performanceHealth)
      
      // Content processing health check
      const contentHealth = await this.checkContentProcessing()
      checks.push(contentHealth)
      
      // Calculate overall status
      const overallStatus = this.calculateOverallStatus(checks)
      
      // Generate summary
      const summary = this.generateHealthSummary(checks)
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(checks)
      
      // Calculate uptime percentage
      const uptimePercentage = await this.calculateUptimePercentage()
      
      // Get last incident
      const lastIncident = await this.getLastIncident()
      
      const systemHealth: SystemHealth = {
        overall_status: overallStatus,
        timestamp: new Date().toISOString(),
        checks: checks,
        summary: summary,
        recommendations: recommendations,
        uptime_percentage: uptimePercentage,
        last_incident: lastIncident
      }
      
      // Store health check result
      await this.storeHealthCheck(systemHealth)
      
      console.log(`[HealthMonitor] Health check completed in ${Date.now() - startTime}ms - Status: ${overallStatus}`)
      
      return systemHealth
      
    } catch (error) {
      console.error('[HealthMonitor] Health check failed:', error)
      
      // Return critical status if health check fails
      return {
        overall_status: 'down',
        timestamp: new Date().toISOString(),
        checks: [],
        summary: {
          total_checks: 0,
          healthy_checks: 0,
          warning_checks: 0,
          critical_checks: 0,
          down_checks: 1,
          average_response_time: 0
        },
        recommendations: ['System health check failed - immediate attention required'],
        uptime_percentage: 0,
        last_incident: error.message
      }
    }
  }

  /**
   * Checks database health
   */
  private async checkDatabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      // Test database connection and query performance
      const { data, error } = await supabase
        .from('content_jobs')
        .select('id')
        .limit(1)
      
      const responseTime = Date.now() - startTime
      
      if (error) {
        return {
          id: 'database_health',
          name: 'Database Health',
          status: 'down',
          response_time_ms: responseTime,
          last_check: new Date().toISOString(),
          error_message: error.message,
          metadata: { error_code: error.code }
        }
      }
      
      let status: 'healthy' | 'warning' | 'critical' | 'down' = 'healthy'
      
      if (responseTime > HEALTH_CONFIG.THRESHOLDS.database_response_time * 2) {
        status = 'critical'
      } else if (responseTime > HEALTH_CONFIG.THRESHOLDS.database_response_time) {
        status = 'warning'
      }
      
      return {
        id: 'database_health',
        name: 'Database Health',
        status: status,
        response_time_ms: responseTime,
        last_check: new Date().toISOString(),
        metadata: { 
          query_successful: true,
          response_time_threshold: HEALTH_CONFIG.THRESHOLDS.database_response_time
        }
      }
      
    } catch (error) {
      return {
        id: 'database_health',
        name: 'Database Health',
        status: 'down',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: error.message,
        metadata: { error_type: 'connection_error' }
      }
    }
  }

  /**
   * Checks external services health
   */
  private async checkExternalServices(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = []
    
    // Check OpenAI API
    const openaiHealth = await this.checkOpenAIHealth()
    checks.push(openaiHealth)
    
    // Check WordPress API
    const wordpressHealth = await this.checkWordPressHealth()
    checks.push(wordpressHealth)
    
    return checks
  }

  /**
   * Checks OpenAI API health
   */
  private async checkOpenAIHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(HEALTH_CONFIG.EXTERNAL_SERVICES.openai, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(HEALTH_CONFIG.TIMEOUTS.external_service)
      })
      
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        return {
          id: 'openai_health',
          name: 'OpenAI API Health',
          status: 'down',
          response_time_ms: responseTime,
          last_check: new Date().toISOString(),
          error_message: `HTTP ${response.status}: ${response.statusText}`,
          metadata: { status_code: response.status }
        }
      }
      
      let status: 'healthy' | 'warning' | 'critical' | 'down' = 'healthy'
      
      if (responseTime > HEALTH_CONFIG.THRESHOLDS.external_service_timeout) {
        status = 'critical'
      } else if (responseTime > HEALTH_CONFIG.THRESHOLDS.external_service_timeout / 2) {
        status = 'warning'
      }
      
      return {
        id: 'openai_health',
        name: 'OpenAI API Health',
        status: status,
        response_time_ms: responseTime,
        last_check: new Date().toISOString(),
        metadata: { 
          api_accessible: true,
          response_time_threshold: HEALTH_CONFIG.THRESHOLDS.external_service_timeout
        }
      }
      
    } catch (error) {
      return {
        id: 'openai_health',
        name: 'OpenAI API Health',
        status: 'down',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: error.message,
        metadata: { error_type: 'api_error' }
      }
    }
  }

  /**
   * Checks WordPress API health
   */
  private async checkWordPressHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(HEALTH_CONFIG.EXTERNAL_SERVICES.wordpress, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${Deno.env.get('WORDPRESS_USERNAME')}:${Deno.env.get('WORDPRESS_PASSWORD')}`)}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(HEALTH_CONFIG.TIMEOUTS.external_service)
      })
      
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        return {
          id: 'wordpress_health',
          name: 'WordPress API Health',
          status: 'down',
          response_time_ms: responseTime,
          last_check: new Date().toISOString(),
          error_message: `HTTP ${response.status}: ${response.statusText}`,
          metadata: { status_code: response.status }
        }
      }
      
      let status: 'healthy' | 'warning' | 'critical' | 'down' = 'healthy'
      
      if (responseTime > HEALTH_CONFIG.THRESHOLDS.external_service_timeout) {
        status = 'critical'
      } else if (responseTime > HEALTH_CONFIG.THRESHOLDS.external_service_timeout / 2) {
        status = 'warning'
      }
      
      return {
        id: 'wordpress_health',
        name: 'WordPress API Health',
        status: status,
        response_time_ms: responseTime,
        last_check: new Date().toISOString(),
        metadata: { 
          api_accessible: true,
          response_time_threshold: HEALTH_CONFIG.THRESHOLDS.external_service_timeout
        }
      }
      
    } catch (error) {
      return {
        id: 'wordpress_health',
        name: 'WordPress API Health',
        status: 'down',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: error.message,
        metadata: { error_type: 'api_error' }
      }
    }
  }

  /**
   * Checks system resources health
   */
  private async checkSystemResources(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      // In a real implementation, this would check actual system resources
      // For now, we'll simulate system resource checks
      const memoryUsage = Math.random() * 100 // Simulate memory usage
      const cpuUsage = Math.random() * 100 // Simulate CPU usage
      const diskUsage = Math.random() * 100 // Simulate disk usage
      
      let status: 'healthy' | 'warning' | 'critical' | 'down' = 'healthy'
      const warnings: string[] = []
      
      if (memoryUsage > HEALTH_CONFIG.THRESHOLDS.memory_usage_percent) {
        status = 'critical'
        warnings.push(`Memory usage: ${memoryUsage.toFixed(1)}%`)
      } else if (memoryUsage > HEALTH_CONFIG.THRESHOLDS.memory_usage_percent * 0.8) {
        status = 'warning'
        warnings.push(`Memory usage: ${memoryUsage.toFixed(1)}%`)
      }
      
      if (cpuUsage > HEALTH_CONFIG.THRESHOLDS.cpu_usage_percent) {
        status = 'critical'
        warnings.push(`CPU usage: ${cpuUsage.toFixed(1)}%`)
      } else if (cpuUsage > HEALTH_CONFIG.THRESHOLDS.cpu_usage_percent * 0.8) {
        status = 'warning'
        warnings.push(`CPU usage: ${cpuUsage.toFixed(1)}%`)
      }
      
      if (diskUsage > HEALTH_CONFIG.THRESHOLDS.disk_usage_percent) {
        status = 'critical'
        warnings.push(`Disk usage: ${diskUsage.toFixed(1)}%`)
      } else if (diskUsage > HEALTH_CONFIG.THRESHOLDS.disk_usage_percent * 0.8) {
        status = 'warning'
        warnings.push(`Disk usage: ${diskUsage.toFixed(1)}%`)
      }
      
      return {
        id: 'system_resources',
        name: 'System Resources',
        status: status,
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: warnings.length > 0 ? warnings.join(', ') : undefined,
        metadata: {
          memory_usage_percent: memoryUsage,
          cpu_usage_percent: cpuUsage,
          disk_usage_percent: diskUsage,
          thresholds: HEALTH_CONFIG.THRESHOLDS
        }
      }
      
    } catch (error) {
      return {
        id: 'system_resources',
        name: 'System Resources',
        status: 'down',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: error.message,
        metadata: { error_type: 'system_error' }
      }
    }
  }

  /**
   * Checks performance metrics health
   */
  private async checkPerformanceMetrics(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      // Get performance metrics from database
      const metrics = await this.getPerformanceMetrics()
      
      let status: 'healthy' | 'warning' | 'critical' | 'down' = 'healthy'
      const warnings: string[] = []
      
      // Check failure rate
      if (metrics.content_processing.success_rate < (100 - HEALTH_CONFIG.THRESHOLDS.failure_rate_percent)) {
        status = 'critical'
        warnings.push(`Low success rate: ${metrics.content_processing.success_rate.toFixed(1)}%`)
      } else if (metrics.content_processing.success_rate < (100 - HEALTH_CONFIG.THRESHOLDS.failure_rate_percent * 0.8)) {
        status = 'warning'
        warnings.push(`Success rate: ${metrics.content_processing.success_rate.toFixed(1)}%`)
      }
      
      // Check queue size
      if (metrics.content_processing.queue_size > HEALTH_CONFIG.THRESHOLDS.queue_size) {
        status = 'critical'
        warnings.push(`Large queue size: ${metrics.content_processing.queue_size}`)
      } else if (metrics.content_processing.queue_size > HEALTH_CONFIG.THRESHOLDS.queue_size * 0.8) {
        status = 'warning'
        warnings.push(`Queue size: ${metrics.content_processing.queue_size}`)
      }
      
      // Check processing time
      if (metrics.content_processing.average_processing_time > 30000) { // 30 seconds
        status = 'critical'
        warnings.push(`Slow processing: ${metrics.content_processing.average_processing_time}ms`)
      } else if (metrics.content_processing.average_processing_time > 15000) { // 15 seconds
        status = 'warning'
        warnings.push(`Processing time: ${metrics.content_processing.average_processing_time}ms`)
      }
      
      return {
        id: 'performance_metrics',
        name: 'Performance Metrics',
        status: status,
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: warnings.length > 0 ? warnings.join(', ') : undefined,
        metadata: metrics
      }
      
    } catch (error) {
      return {
        id: 'performance_metrics',
        name: 'Performance Metrics',
        status: 'down',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: error.message,
        metadata: { error_type: 'metrics_error' }
      }
    }
  }

  /**
   * Checks content processing health
   */
  private async checkContentProcessing(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      // Check for stuck jobs
      const { data: stuckJobs, error: stuckJobsError } = await supabase
        .from('content_jobs')
        .select('id')
        .eq('status', 'processing')
        .lt('claimed_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // 30 minutes ago
      
      if (stuckJobsError) {
        throw new Error(`Failed to check stuck jobs: ${stuckJobsError.message}`)
      }
      
      // Check for failed jobs in last hour
      const { data: failedJobs, error: failedJobsError } = await supabase
        .from('content_jobs')
        .select('id')
        .eq('status', 'failed')
        .gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      
      if (failedJobsError) {
        throw new Error(`Failed to check failed jobs: ${failedJobsError.message}`)
      }
      
      let status: 'healthy' | 'warning' | 'critical' | 'down' = 'healthy'
      const warnings: string[] = []
      
      if (stuckJobs.length > 10) {
        status = 'critical'
        warnings.push(`${stuckJobs.length} stuck jobs`)
      } else if (stuckJobs.length > 5) {
        status = 'warning'
        warnings.push(`${stuckJobs.length} stuck jobs`)
      }
      
      if (failedJobs.length > 20) {
        status = 'critical'
        warnings.push(`${failedJobs.length} failed jobs in last hour`)
      } else if (failedJobs.length > 10) {
        status = 'warning'
        warnings.push(`${failedJobs.length} failed jobs in last hour`)
      }
      
      return {
        id: 'content_processing',
        name: 'Content Processing',
        status: status,
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: warnings.length > 0 ? warnings.join(', ') : undefined,
        metadata: {
          stuck_jobs: stuckJobs.length,
          failed_jobs_last_hour: failedJobs.length,
          thresholds: {
            stuck_jobs_warning: 5,
            stuck_jobs_critical: 10,
            failed_jobs_warning: 10,
            failed_jobs_critical: 20
          }
        }
      }
      
    } catch (error) {
      return {
        id: 'content_processing',
        name: 'Content Processing',
        status: 'down',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: error.message,
        metadata: { error_type: 'processing_error' }
      }
    }
  }

  /**
   * Gets performance metrics
   */
  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // Get database performance metrics
      const { data: dbMetrics, error: dbError } = await supabase
        .from('job_runs')
        .select('processing_time_ms, created_at')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      
      if (dbError) {
        throw new Error(`Failed to get database metrics: ${dbError.message}`)
      }
      
      const processingTimes = dbMetrics?.map(run => run.processing_time_ms) || []
      const averageProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0
      
      // Get content processing metrics
      const { data: jobs, error: jobsError } = await supabase
        .from('content_jobs')
        .select('status, created_at')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      
      if (jobsError) {
        throw new Error(`Failed to get job metrics: ${jobsError.message}`)
      }
      
      const totalJobs = jobs?.length || 0
      const successfulJobs = jobs?.filter(job => job.status === 'completed').length || 0
      const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 100
      
      // Get queue size
      const { data: queueJobs, error: queueError } = await supabase
        .from('content_jobs')
        .select('id')
        .in('status', ['pending', 'processing'])
      
      if (queueError) {
        throw new Error(`Failed to get queue metrics: ${queueError.message}`)
      }
      
      return {
        database_performance: {
          query_time_avg: averageProcessingTime,
          connection_count: 1, // Simulated
          active_queries: 0, // Simulated
          slow_queries: processingTimes.filter(time => time > 10000).length
        },
        system_resources: {
          memory_usage_percent: Math.random() * 100, // Simulated
          cpu_usage_percent: Math.random() * 100, // Simulated
          disk_usage_percent: Math.random() * 100, // Simulated
          available_memory_mb: 1024 // Simulated
        },
        content_processing: {
          jobs_processed_last_hour: totalJobs,
          average_processing_time: averageProcessingTime,
          success_rate: successRate,
          queue_size: queueJobs?.length || 0
        },
        external_services: {
          openai_status: 'healthy', // Will be updated by health checks
          wordpress_status: 'healthy', // Will be updated by health checks
          openai_response_time: 0, // Will be updated by health checks
          wordpress_response_time: 0 // Will be updated by health checks
        }
      }
      
    } catch (error) {
      console.error('[HealthMonitor] Failed to get performance metrics:', error)
      throw error
    }
  }

  /**
   * Calculates overall system status
   */
  private calculateOverallStatus(checks: HealthCheck[]): 'healthy' | 'warning' | 'critical' | 'down' {
    if (checks.some(check => check.status === 'down')) {
      return 'down'
    }
    
    if (checks.some(check => check.status === 'critical')) {
      return 'critical'
    }
    
    if (checks.some(check => check.status === 'warning')) {
      return 'warning'
    }
    
    return 'healthy'
  }

  /**
   * Generates health summary
   */
  private generateHealthSummary(checks: HealthCheck[]): {
    total_checks: number
    healthy_checks: number
    warning_checks: number
    critical_checks: number
    down_checks: number
    average_response_time: number
  } {
    const totalChecks = checks.length
    const healthyChecks = checks.filter(check => check.status === 'healthy').length
    const warningChecks = checks.filter(check => check.status === 'warning').length
    const criticalChecks = checks.filter(check => check.status === 'critical').length
    const downChecks = checks.filter(check => check.status === 'down').length
    
    const averageResponseTime = checks.length > 0 
      ? checks.reduce((sum, check) => sum + check.response_time_ms, 0) / checks.length 
      : 0
    
    return {
      total_checks: totalChecks,
      healthy_checks: healthyChecks,
      warning_checks: warningChecks,
      critical_checks: criticalChecks,
      down_checks: downChecks,
      average_response_time: averageResponseTime
    }
  }

  /**
   * Generates recommendations based on health checks
   */
  private generateRecommendations(checks: HealthCheck[]): string[] {
    const recommendations: string[] = []
    
    // Database recommendations
    const dbCheck = checks.find(check => check.id === 'database_health')
    if (dbCheck?.status === 'warning' || dbCheck?.status === 'critical') {
      recommendations.push('Database performance issues detected - consider optimizing queries or scaling resources')
    }
    
    // External service recommendations
    const externalChecks = checks.filter(check => 
      check.id === 'openai_health' || check.id === 'wordpress_health'
    )
    const downServices = externalChecks.filter(check => check.status === 'down')
    if (downServices.length > 0) {
      recommendations.push(`External services down: ${downServices.map(s => s.name).join(', ')} - check service status`)
    }
    
    // System resource recommendations
    const systemCheck = checks.find(check => check.id === 'system_resources')
    if (systemCheck?.status === 'warning' || systemCheck?.status === 'critical') {
      recommendations.push('System resource usage high - consider scaling or optimizing resource usage')
    }
    
    // Performance recommendations
    const performanceCheck = checks.find(check => check.id === 'performance_metrics')
    if (performanceCheck?.status === 'warning' || performanceCheck?.status === 'critical') {
      recommendations.push('Performance issues detected - review processing efficiency and resource allocation')
    }
    
    // Content processing recommendations
    const contentCheck = checks.find(check => check.id === 'content_processing')
    if (contentCheck?.status === 'warning' || contentCheck?.status === 'critical') {
      recommendations.push('Content processing issues detected - check for stuck or failed jobs')
    }
    
    return recommendations
  }

  /**
   * Calculates uptime percentage
   */
  private async calculateUptimePercentage(): Promise<number> {
    try {
      // Get health check history for last 24 hours
      const { data: healthHistory, error } = await supabase
        .from('health_checks')
        .select('overall_status, timestamp')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: true })
      
      if (error || !healthHistory) {
        return 100 // Assume 100% if no history
      }
      
      const totalChecks = healthHistory.length
      const healthyChecks = healthHistory.filter(check => check.overall_status === 'healthy').length
      
      return totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 100
      
    } catch (error) {
      console.error('[HealthMonitor] Failed to calculate uptime percentage:', error)
      return 100
    }
  }

  /**
   * Gets last incident
   */
  private async getLastIncident(): Promise<string | undefined> {
    try {
      const { data: lastIncident, error } = await supabase
        .from('health_checks')
        .select('timestamp, overall_status')
        .in('overall_status', ['critical', 'down'])
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()
      
      if (error || !lastIncident) {
        return undefined
      }
      
      return `${lastIncident.overall_status} status at ${lastIncident.timestamp}`
      
    } catch (error) {
      console.error('[HealthMonitor] Failed to get last incident:', error)
      return undefined
    }
  }

  /**
   * Stores health check result
   */
  private async storeHealthCheck(health: SystemHealth): Promise<void> {
    try {
      const { error } = await supabase
        .from('health_checks')
        .insert({
          overall_status: health.overall_status,
          timestamp: health.timestamp,
          summary: health.summary,
          recommendations: health.recommendations,
          uptime_percentage: health.uptime_percentage,
          last_incident: health.last_incident,
          checks: health.checks
        })
      
      if (error) {
        console.error('[HealthMonitor] Failed to store health check:', error)
      }
      
    } catch (error) {
      console.error('[HealthMonitor] Failed to store health check:', error)
    }
  }

  /**
   * Gets health check configuration
   */
  getHealthConfig(): typeof HEALTH_CONFIG {
    return HEALTH_CONFIG
  }
}

/**
 * Creates a health monitor instance
 */
export function createHealthMonitor(): HealthMonitor {
  return new HealthMonitor()
}

/**
 * Performs system health check
 */
export async function performHealthCheck(): Promise<SystemHealth> {
  const monitor = createHealthMonitor()
  return await monitor.performHealthCheck()
}

/**
 * Gets health check configuration
 */
export function getHealthConfig(): typeof HEALTH_CONFIG {
  const monitor = createHealthMonitor()
  return monitor.getHealthConfig()
}
