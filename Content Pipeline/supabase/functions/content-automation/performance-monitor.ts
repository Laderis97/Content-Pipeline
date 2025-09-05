// Function performance monitoring and <2s latency optimization
// PRD Reference: Success Metrics (<2s median function latency), Performance Requirements

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PerformanceMetrics, ProcessingResult } from './types.ts'

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface PerformanceThresholds {
  function_duration_ms: number
  openai_duration_ms: number
  wordpress_duration_ms: number
  database_duration_ms: number
  total_duration_ms: number
}

interface PerformanceAlert {
  type: 'latency' | 'throughput' | 'error_rate' | 'resource_usage'
  severity: 'warning' | 'critical'
  message: string
  threshold: number
  actual_value: number
  timestamp: string
  job_id?: string
}

interface PerformanceOptimization {
  optimization_type: 'caching' | 'batching' | 'parallelization' | 'timeout_adjustment'
  description: string
  expected_improvement: number
  implementation_effort: 'low' | 'medium' | 'high'
}

interface PerformanceStats {
  total_executions: number
  median_duration_ms: number
  p95_duration_ms: number
  p99_duration_ms: number
  success_rate: number
  error_rate: number
  avg_openai_duration_ms: number
  avg_wordpress_duration_ms: number
  avg_database_duration_ms: number
  performance_trend: 'improving' | 'stable' | 'degrading'
}

// Performance thresholds based on PRD requirements
const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  function_duration_ms: 2000, // <2s median requirement
  openai_duration_ms: 1500,   // OpenAI should be <1.5s
  wordpress_duration_ms: 500, // WordPress should be <500ms
  database_duration_ms: 100,  // Database operations should be <100ms
  total_duration_ms: 2000     // Total should be <2s
}

/**
 * Monitors function performance and detects performance issues
 */
export class PerformanceMonitor {
  private startTime: number
  private metrics: PerformanceMetrics
  private alerts: PerformanceAlert[] = []
  
  constructor() {
    this.startTime = Date.now()
    this.metrics = {
      function_duration_ms: 0,
      total_duration_ms: 0
    }
  }
  
  /**
   * Records the start of a performance measurement
   */
  startMeasurement(operation: string): void {
    this.startTime = Date.now()
    console.log(`[PERF] Starting measurement: ${operation}`)
  }
  
  /**
   * Records the end of a performance measurement
   */
  endMeasurement(operation: string, additionalMetrics?: Partial<PerformanceMetrics>): number {
    const duration = Date.now() - this.startTime
    this.metrics.function_duration_ms = duration
    this.metrics.total_duration_ms = duration
    
    if (additionalMetrics) {
      this.metrics = { ...this.metrics, ...additionalMetrics }
    }
    
    console.log(`[PERF] ${operation} completed in ${duration}ms`)
    
    // Check for performance issues
    this.checkPerformanceThresholds(operation, duration)
    
    return duration
  }
  
  /**
   * Records OpenAI API performance
   */
  recordOpenAIPerformance(duration: number, tokensUsed?: number): void {
    this.metrics.openai_duration_ms = duration
    if (tokensUsed) {
      this.metrics.tokens_used = tokensUsed
    }
    
    console.log(`[PERF] OpenAI API: ${duration}ms${tokensUsed ? `, ${tokensUsed} tokens` : ''}`)
    
    if (duration > PERFORMANCE_THRESHOLDS.openai_duration_ms) {
      this.addAlert('latency', 'warning', 
        `OpenAI API latency exceeded threshold: ${duration}ms > ${PERFORMANCE_THRESHOLDS.openai_duration_ms}ms`,
        PERFORMANCE_THRESHOLDS.openai_duration_ms, duration)
    }
  }
  
  /**
   * Records WordPress API performance
   */
  recordWordPressPerformance(duration: number): void {
    this.metrics.wordpress_duration_ms = duration
    console.log(`[PERF] WordPress API: ${duration}ms`)
    
    if (duration > PERFORMANCE_THRESHOLDS.wordpress_duration_ms) {
      this.addAlert('latency', 'warning',
        `WordPress API latency exceeded threshold: ${duration}ms > ${PERFORMANCE_THRESHOLDS.wordpress_duration_ms}ms`,
        PERFORMANCE_THRESHOLDS.wordpress_duration_ms, duration)
    }
  }
  
  /**
   * Records database operation performance
   */
  recordDatabasePerformance(duration: number, operation: string): void {
    this.metrics.database_duration_ms = (this.metrics.database_duration_ms || 0) + duration
    console.log(`[PERF] Database ${operation}: ${duration}ms`)
    
    if (duration > PERFORMANCE_THRESHOLDS.database_duration_ms) {
      this.addAlert('latency', 'warning',
        `Database ${operation} latency exceeded threshold: ${duration}ms > ${PERFORMANCE_THRESHOLDS.database_duration_ms}ms`,
        PERFORMANCE_THRESHOLDS.database_duration_ms, duration)
    }
  }
  
  /**
   * Checks performance against thresholds
   */
  private checkPerformanceThresholds(operation: string, duration: number): void {
    if (duration > PERFORMANCE_THRESHOLDS.function_duration_ms) {
      this.addAlert('latency', 'critical',
        `Function ${operation} exceeded latency threshold: ${duration}ms > ${PERFORMANCE_THRESHOLDS.function_duration_ms}ms`,
        PERFORMANCE_THRESHOLDS.function_duration_ms, duration)
    }
  }
  
  /**
   * Adds a performance alert
   */
  private addAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    threshold: number,
    actualValue: number,
    jobId?: string
  ): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      threshold,
      actual_value: actualValue,
      timestamp: new Date().toISOString(),
      job_id: jobId
    }
    
    this.alerts.push(alert)
    console.warn(`[PERF ALERT] ${severity.toUpperCase()}: ${message}`)
  }
  
  /**
   * Gets current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }
  
  /**
   * Gets performance alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts]
  }
  
  /**
   * Checks if performance is within acceptable limits
   */
  isPerformanceAcceptable(): boolean {
    return this.metrics.function_duration_ms <= PERFORMANCE_THRESHOLDS.function_duration_ms &&
           (this.metrics.openai_duration_ms || 0) <= PERFORMANCE_THRESHOLDS.openai_duration_ms &&
           (this.metrics.wordpress_duration_ms || 0) <= PERFORMANCE_THRESHOLDS.wordpress_duration_ms
  }
}

/**
 * Gets performance statistics for monitoring
 */
export async function getPerformanceStatistics(
  startDate?: Date,
  endDate?: Date
): Promise<PerformanceStats> {
  try {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000) // Default to last 24 hours
    const end = endDate || new Date()
    
    // Get job run statistics
    const { data: jobRuns, error } = await supabase
      .from('job_runs')
      .select('function_duration_ms, openai_duration_ms, wordpress_duration_ms, status')
      .gte('execution_time', start.toISOString())
      .lte('execution_time', end.toISOString())
      .not('function_duration_ms', 'is', null)
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
    
    if (!jobRuns || jobRuns.length === 0) {
      return {
        total_executions: 0,
        median_duration_ms: 0,
        p95_duration_ms: 0,
        p99_duration_ms: 0,
        success_rate: 0,
        error_rate: 0,
        avg_openai_duration_ms: 0,
        avg_wordpress_duration_ms: 0,
        avg_database_duration_ms: 0,
        performance_trend: 'stable'
      }
    }
    
    // Calculate statistics
    const durations = jobRuns.map(run => run.function_duration_ms).sort((a, b) => a - b)
    const successfulRuns = jobRuns.filter(run => run.status === 'completed')
    const failedRuns = jobRuns.filter(run => run.status === 'failed')
    
    const medianDuration = calculatePercentile(durations, 50)
    const p95Duration = calculatePercentile(durations, 95)
    const p99Duration = calculatePercentile(durations, 99)
    
    const avgOpenAIDuration = jobRuns
      .filter(run => run.openai_duration_ms)
      .reduce((sum, run) => sum + (run.openai_duration_ms || 0), 0) / 
      jobRuns.filter(run => run.openai_duration_ms).length || 0
    
    const avgWordPressDuration = jobRuns
      .filter(run => run.wordpress_duration_ms)
      .reduce((sum, run) => sum + (run.wordpress_duration_ms || 0), 0) / 
      jobRuns.filter(run => run.wordpress_duration_ms).length || 0
    
    const successRate = (successfulRuns.length / jobRuns.length) * 100
    const errorRate = (failedRuns.length / jobRuns.length) * 100
    
    // Determine performance trend (simplified)
    const performanceTrend = medianDuration <= PERFORMANCE_THRESHOLDS.function_duration_ms ? 'improving' : 'degrading'
    
    return {
      total_executions: jobRuns.length,
      median_duration_ms: Math.round(medianDuration),
      p95_duration_ms: Math.round(p95Duration),
      p99_duration_ms: Math.round(p99Duration),
      success_rate: Math.round(successRate * 100) / 100,
      error_rate: Math.round(errorRate * 100) / 100,
      avg_openai_duration_ms: Math.round(avgOpenAIDuration),
      avg_wordpress_duration_ms: Math.round(avgWordPressDuration),
      avg_database_duration_ms: 0, // Would need separate tracking
      performance_trend: performanceTrend
    }
    
  } catch (error) {
    console.error('Error getting performance statistics:', error)
    throw error
  }
}

/**
 * Calculates percentile from sorted array
 */
function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0
  
  const index = (percentile / 100) * (sortedArray.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index % 1
  
  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1]
  
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
}

/**
 * Analyzes performance and suggests optimizations
 */
export async function analyzePerformanceOptimizations(): Promise<PerformanceOptimization[]> {
  try {
    const stats = await getPerformanceStatistics()
    const optimizations: PerformanceOptimization[] = []
    
    // Check if median duration exceeds threshold
    if (stats.median_duration_ms > PERFORMANCE_THRESHOLDS.function_duration_ms) {
      optimizations.push({
        optimization_type: 'timeout_adjustment',
        description: 'Function duration exceeds 2s threshold. Consider optimizing OpenAI prompts or implementing caching.',
        expected_improvement: 20,
        implementation_effort: 'medium'
      })
    }
    
    // Check OpenAI performance
    if (stats.avg_openai_duration_ms > PERFORMANCE_THRESHOLDS.openai_duration_ms) {
      optimizations.push({
        optimization_type: 'caching',
        description: 'OpenAI API latency is high. Implement response caching for similar prompts.',
        expected_improvement: 30,
        implementation_effort: 'medium'
      })
    }
    
    // Check WordPress performance
    if (stats.avg_wordpress_duration_ms > PERFORMANCE_THRESHOLDS.wordpress_duration_ms) {
      optimizations.push({
        optimization_type: 'batching',
        description: 'WordPress API latency is high. Consider batching operations or optimizing connection.',
        expected_improvement: 25,
        implementation_effort: 'low'
      })
    }
    
    // Check error rate
    if (stats.error_rate > 10) {
      optimizations.push({
        optimization_type: 'parallelization',
        description: 'High error rate detected. Implement better error handling and retry logic.',
        expected_improvement: 15,
        implementation_effort: 'high'
      })
    }
    
    return optimizations
    
  } catch (error) {
    console.error('Error analyzing performance optimizations:', error)
    return []
  }
}

/**
 * Monitors performance in real-time and triggers alerts
 */
export async function monitorPerformanceRealtime(): Promise<{
  healthy: boolean
  alerts: PerformanceAlert[]
  recommendations: string[]
}> {
  try {
    const stats = await getPerformanceStatistics()
    const alerts: PerformanceAlert[] = []
    const recommendations: string[] = []
    
    // Check median latency
    if (stats.median_duration_ms > PERFORMANCE_THRESHOLDS.function_duration_ms) {
      alerts.push({
        type: 'latency',
        severity: 'critical',
        message: `Median function duration ${stats.median_duration_ms}ms exceeds 2s threshold`,
        threshold: PERFORMANCE_THRESHOLDS.function_duration_ms,
        actual_value: stats.median_duration_ms,
        timestamp: new Date().toISOString()
      })
      recommendations.push('Optimize function performance to meet <2s requirement')
    }
    
    // Check P95 latency
    if (stats.p95_duration_ms > PERFORMANCE_THRESHOLDS.function_duration_ms * 1.5) {
      alerts.push({
        type: 'latency',
        severity: 'warning',
        message: `P95 function duration ${stats.p95_duration_ms}ms is high`,
        threshold: PERFORMANCE_THRESHOLDS.function_duration_ms * 1.5,
        actual_value: stats.p95_duration_ms,
        timestamp: new Date().toISOString()
      })
      recommendations.push('Investigate performance outliers')
    }
    
    // Check error rate
    if (stats.error_rate > 20) {
      alerts.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate ${stats.error_rate}% exceeds 20% threshold`,
        threshold: 20,
        actual_value: stats.error_rate,
        timestamp: new Date().toISOString()
      })
      recommendations.push('Investigate and fix error causes')
    }
    
    // Check success rate
    if (stats.success_rate < 80) {
      alerts.push({
        type: 'throughput',
        severity: 'warning',
        message: `Success rate ${stats.success_rate}% is below 80%`,
        threshold: 80,
        actual_value: stats.success_rate,
        timestamp: new Date().toISOString()
      })
      recommendations.push('Improve system reliability')
    }
    
    return {
      healthy: alerts.length === 0,
      alerts,
      recommendations
    }
    
  } catch (error) {
    console.error('Error monitoring performance real-time:', error)
    return {
      healthy: false,
      alerts: [{
        type: 'error_rate',
        severity: 'critical',
        message: `Performance monitoring error: ${error.message}`,
        threshold: 0,
        actual_value: 1,
        timestamp: new Date().toISOString()
      }],
      recommendations: ['Check performance monitoring system']
    }
  }
}

/**
 * Creates a performance report
 */
export async function generatePerformanceReport(): Promise<{
  summary: PerformanceStats
  optimizations: PerformanceOptimization[]
  monitoring: { healthy: boolean; alerts: PerformanceAlert[]; recommendations: string[] }
  timestamp: string
}> {
  try {
    const [summary, optimizations, monitoring] = await Promise.all([
      getPerformanceStatistics(),
      analyzePerformanceOptimizations(),
      monitorPerformanceRealtime()
    ])
    
    return {
      summary,
      optimizations,
      monitoring,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Error generating performance report:', error)
    throw error
  }
}
