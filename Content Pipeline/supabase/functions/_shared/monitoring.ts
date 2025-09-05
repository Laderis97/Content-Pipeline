import { logger } from './logger.ts'
import { response } from './response.ts'
import { createServiceRoleClient } from './database.ts'

// Monitoring and alerting infrastructure
// PRD Reference: Configuration & Deployment (6.6), Error Handling & Monitoring (D2-D3)

export interface MonitoringConfig {
  // Alert thresholds
  failureRateThreshold: number
  latencyThreshold: number
  errorCountThreshold: number
  
  // Monitoring intervals
  healthCheckInterval: number
  metricsCollectionInterval: number
  alertCheckInterval: number
  
  // Alert channels
  enableEmailAlerts: boolean
  enableSlackAlerts: boolean
  enableWebhookAlerts: boolean
  
  // Alert recipients
  emailRecipients: string[]
  slackWebhookUrl?: string
  webhookUrl?: string
  
  // Monitoring features
  enablePerformanceMonitoring: boolean
  enableErrorTracking: boolean
  enableHealthChecks: boolean
  enableMetricsCollection: boolean
  
  // Retention settings
  metricsRetentionDays: number
  logsRetentionDays: number
  alertsRetentionDays: number
}

export interface AlertRule {
  id: string
  name: string
  description: string
  condition: string
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  channels: string[]
  cooldownMinutes: number
  lastTriggered?: Date
}

export interface Alert {
  id: string
  ruleId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  metadata: Record<string, any>
}

export interface HealthCheck {
  id: string
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: Date
  responseTime: number
  error?: string
  metadata: Record<string, any>
}

export interface SystemMetrics {
  timestamp: Date
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkLatency: number
  activeConnections: number
  errorRate: number
  throughput: number
}

// Default monitoring configuration
const DEFAULT_CONFIG: MonitoringConfig = {
  failureRateThreshold: 0.2, // 20%
  latencyThreshold: 2000, // 2 seconds
  errorCountThreshold: 10,
  
  healthCheckInterval: 60000, // 1 minute
  metricsCollectionInterval: 30000, // 30 seconds
  alertCheckInterval: 300000, // 5 minutes
  
  enableEmailAlerts: false,
  enableSlackAlerts: false,
  enableWebhookAlerts: false,
  
  emailRecipients: [],
  
  enablePerformanceMonitoring: true,
  enableErrorTracking: true,
  enableHealthChecks: true,
  enableMetricsCollection: true,
  
  metricsRetentionDays: 30,
  logsRetentionDays: 7,
  alertsRetentionDays: 90
}

// Global monitoring configuration
let monitoringConfig: MonitoringConfig | null = null

// Alert rules storage
const alertRules = new Map<string, AlertRule>()

// Active alerts storage
const activeAlerts = new Map<string, Alert>()

// Health check results storage
const healthChecks = new Map<string, HealthCheck>()

// System metrics storage
const systemMetrics: SystemMetrics[] = []

/**
 * Initialize monitoring configuration
 */
export function initializeMonitoring(config: Partial<MonitoringConfig> = {}): MonitoringConfig {
  monitoringConfig = {
    ...DEFAULT_CONFIG,
    ...config
  }

  // Initialize default alert rules
  initializeDefaultAlertRules()

  logger.info('Monitoring initialized', 'monitoring', {
    failureRateThreshold: monitoringConfig.failureRateThreshold,
    latencyThreshold: monitoringConfig.latencyThreshold,
    enablePerformanceMonitoring: monitoringConfig.enablePerformanceMonitoring,
    enableErrorTracking: monitoringConfig.enableErrorTracking
  })

  return monitoringConfig
}

/**
 * Get current monitoring configuration
 */
export function getMonitoringConfig(): MonitoringConfig {
  if (!monitoringConfig) {
    return initializeMonitoring()
  }
  return monitoringConfig
}

/**
 * Initialize default alert rules
 */
function initializeDefaultAlertRules(): void {
  const rules: AlertRule[] = [
    {
      id: 'high_failure_rate',
      name: 'High Failure Rate',
      description: 'Job failure rate exceeds threshold',
      condition: 'failure_rate > threshold',
      threshold: 0.2,
      severity: 'high',
      enabled: true,
      channels: ['email', 'slack'],
      cooldownMinutes: 30
    },
    {
      id: 'high_latency',
      name: 'High Latency',
      description: 'Function latency exceeds threshold',
      condition: 'latency > threshold',
      threshold: 2000,
      severity: 'medium',
      enabled: true,
      channels: ['email'],
      cooldownMinutes: 15
    },
    {
      id: 'error_count_threshold',
      name: 'Error Count Threshold',
      description: 'Error count exceeds threshold',
      condition: 'error_count > threshold',
      threshold: 10,
      severity: 'medium',
      enabled: true,
      channels: ['email'],
      cooldownMinutes: 10
    },
    {
      id: 'system_unhealthy',
      name: 'System Unhealthy',
      description: 'System health check failed',
      condition: 'health_status == "unhealthy"',
      threshold: 0,
      severity: 'critical',
      enabled: true,
      channels: ['email', 'slack', 'webhook'],
      cooldownMinutes: 5
    },
    {
      id: 'queue_backlog',
      name: 'Queue Backlog',
      description: 'Job queue has significant backlog',
      condition: 'queue_size > threshold',
      threshold: 100,
      severity: 'medium',
      enabled: true,
      channels: ['email'],
      cooldownMinutes: 20
    }
  ]

  for (const rule of rules) {
    alertRules.set(rule.id, rule)
  }
}

/**
 * Add or update alert rule
 */
export function addAlertRule(rule: AlertRule): void {
  alertRules.set(rule.id, rule)
  logger.info('Alert rule added/updated', 'monitoring', { ruleId: rule.id, name: rule.name })
}

/**
 * Remove alert rule
 */
export function removeAlertRule(ruleId: string): void {
  alertRules.delete(ruleId)
  logger.info('Alert rule removed', 'monitoring', { ruleId })
}

/**
 * Get alert rule
 */
export function getAlertRule(ruleId: string): AlertRule | undefined {
  return alertRules.get(ruleId)
}

/**
 * Get all alert rules
 */
export function getAllAlertRules(): AlertRule[] {
  return Array.from(alertRules.values())
}

/**
 * Check alert conditions
 */
export async function checkAlertConditions(): Promise<Alert[]> {
  const newAlerts: Alert[] = []
  const config = getMonitoringConfig()

  try {
    // Get recent metrics
    const metrics = await getRecentMetrics()
    const healthStatus = await getSystemHealthStatus()
    const queueStatus = await getQueueStatus()

    for (const rule of alertRules.values()) {
      if (!rule.enabled) continue

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000
        if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) {
          continue
        }
      }

      let shouldAlert = false
      let alertValue: number | string = 0

      switch (rule.id) {
        case 'high_failure_rate':
          alertValue = metrics.failureRate
          shouldAlert = metrics.failureRate > rule.threshold
          break

        case 'high_latency':
          alertValue = metrics.avgLatency
          shouldAlert = metrics.avgLatency > rule.threshold
          break

        case 'error_count_threshold':
          alertValue = metrics.errorCount
          shouldAlert = metrics.errorCount > rule.threshold
          break

        case 'system_unhealthy':
          alertValue = healthStatus.status
          shouldAlert = healthStatus.status === 'unhealthy'
          break

        case 'queue_backlog':
          alertValue = queueStatus.pendingJobs
          shouldAlert = queueStatus.pendingJobs > rule.threshold
          break
      }

      if (shouldAlert) {
        const alert: Alert = {
          id: `alert_${Date.now()}_${rule.id}`,
          ruleId: rule.id,
          severity: rule.severity,
          title: rule.name,
          message: `${rule.description}. Current value: ${alertValue}`,
          timestamp: new Date(),
          resolved: false,
          metadata: {
            ruleId: rule.id,
            threshold: rule.threshold,
            currentValue: alertValue,
            condition: rule.condition
          }
        }

        newAlerts.push(alert)
        activeAlerts.set(alert.id, alert)

        // Update rule last triggered
        rule.lastTriggered = new Date()
        alertRules.set(rule.id, rule)

        logger.warn('Alert triggered', 'monitoring', {
          alertId: alert.id,
          ruleId: rule.id,
          severity: alert.severity,
          value: alertValue,
          threshold: rule.threshold
        })
      }
    }

    return newAlerts
  } catch (error) {
    logger.error('Failed to check alert conditions', 'monitoring', { error: error.message })
    return []
  }
}

/**
 * Send alert notifications
 */
export async function sendAlertNotifications(alerts: Alert[]): Promise<void> {
  const config = getMonitoringConfig()

  for (const alert of alerts) {
    const rule = getAlertRule(alert.ruleId)
    if (!rule) continue

    try {
      // Send to configured channels
      for (const channel of rule.channels) {
        switch (channel) {
          case 'email':
            if (config.enableEmailAlerts) {
              await sendEmailAlert(alert, rule)
            }
            break

          case 'slack':
            if (config.enableSlackAlerts && config.slackWebhookUrl) {
              await sendSlackAlert(alert, rule)
            }
            break

          case 'webhook':
            if (config.enableWebhookAlerts && config.webhookUrl) {
              await sendWebhookAlert(alert, rule)
            }
            break
        }
      }

      logger.info('Alert notifications sent', 'monitoring', {
        alertId: alert.id,
        channels: rule.channels
      })
    } catch (error) {
      logger.error('Failed to send alert notifications', 'monitoring', {
        alertId: alert.id,
        error: error.message
      })
    }
  }
}

/**
 * Send email alert
 */
async function sendEmailAlert(alert: Alert, rule: AlertRule): Promise<void> {
  const config = getMonitoringConfig()
  
  // In a real implementation, you would integrate with an email service
  // For now, we'll log the email content
  const emailContent = {
    to: config.emailRecipients,
    subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
    body: `
Alert: ${alert.title}
Severity: ${alert.severity}
Time: ${alert.timestamp.toISOString()}
Message: ${alert.message}

Rule: ${rule.name}
Condition: ${rule.condition}
Threshold: ${rule.threshold}

Metadata: ${JSON.stringify(alert.metadata, null, 2)}
    `.trim()
  }

  logger.info('Email alert prepared', 'monitoring', {
    alertId: alert.id,
    recipients: config.emailRecipients,
    subject: emailContent.subject
  })
}

/**
 * Send Slack alert
 */
async function sendSlackAlert(alert: Alert, rule: AlertRule): Promise<void> {
  const config = getMonitoringConfig()
  
  if (!config.slackWebhookUrl) return

  const slackMessage = {
    text: `🚨 ${alert.title}`,
    attachments: [
      {
        color: getSeverityColor(alert.severity),
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Time',
            value: alert.timestamp.toISOString(),
            short: true
          },
          {
            title: 'Message',
            value: alert.message,
            short: false
          },
          {
            title: 'Rule',
            value: rule.name,
            short: true
          },
          {
            title: 'Threshold',
            value: rule.threshold.toString(),
            short: true
          }
        ]
      }
    ]
  }

  try {
    const response = await fetch(config.slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    })

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`)
    }

    logger.info('Slack alert sent', 'monitoring', {
      alertId: alert.id,
      status: response.status
    })
  } catch (error) {
    logger.error('Failed to send Slack alert', 'monitoring', {
      alertId: alert.id,
      error: error.message
    })
  }
}

/**
 * Send webhook alert
 */
async function sendWebhookAlert(alert: Alert, rule: AlertRule): Promise<void> {
  const config = getMonitoringConfig()
  
  if (!config.webhookUrl) return

  const webhookPayload = {
    alert: {
      id: alert.id,
      ruleId: alert.ruleId,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp.toISOString(),
      metadata: alert.metadata
    },
    rule: {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity
    }
  }

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`)
    }

    logger.info('Webhook alert sent', 'monitoring', {
      alertId: alert.id,
      status: response.status
    })
  } catch (error) {
    logger.error('Failed to send webhook alert', 'monitoring', {
      alertId: alert.id,
      error: error.message
    })
  }
}

/**
 * Get severity color for Slack
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'danger'
    case 'high': return 'warning'
    case 'medium': return 'good'
    case 'low': return '#36a64f'
    default: return '#36a64f'
  }
}

/**
 * Record health check
 */
export function recordHealthCheck(healthCheck: HealthCheck): void {
  healthChecks.set(healthCheck.id, healthCheck)
  
  logger.info('Health check recorded', 'monitoring', {
    id: healthCheck.id,
    name: healthCheck.name,
    status: healthCheck.status,
    responseTime: healthCheck.responseTime
  })
}

/**
 * Get health check
 */
export function getHealthCheck(id: string): HealthCheck | undefined {
  return healthChecks.get(id)
}

/**
 * Get all health checks
 */
export function getAllHealthChecks(): HealthCheck[] {
  return Array.from(healthChecks.values())
}

/**
 * Record system metrics
 */
export function recordSystemMetrics(metrics: SystemMetrics): void {
  systemMetrics.push(metrics)
  
  // Keep only recent metrics
  const config = getMonitoringConfig()
  const cutoffTime = Date.now() - (config.metricsRetentionDays * 24 * 60 * 60 * 1000)
  
  while (systemMetrics.length > 0 && systemMetrics[0].timestamp.getTime() < cutoffTime) {
    systemMetrics.shift()
  }
  
  logger.debug('System metrics recorded', 'monitoring', {
    timestamp: metrics.timestamp.toISOString(),
    cpuUsage: metrics.cpuUsage,
    memoryUsage: metrics.memoryUsage,
    errorRate: metrics.errorRate
  })
}

/**
 * Get recent system metrics
 */
export function getRecentSystemMetrics(hours: number = 24): SystemMetrics[] {
  const cutoffTime = Date.now() - (hours * 60 * 60 * 1000)
  return systemMetrics.filter(metrics => metrics.timestamp.getTime() > cutoffTime)
}

/**
 * Get system health status
 */
export async function getSystemHealthStatus(): Promise<{ status: string; details: any }> {
  try {
    const recentHealthChecks = getAllHealthChecks()
    const recentMetrics = getRecentSystemMetrics(1) // Last hour
    
    if (recentHealthChecks.length === 0) {
      return { status: 'unknown', details: { message: 'No health checks available' } }
    }
    
    const unhealthyChecks = recentHealthChecks.filter(check => check.status === 'unhealthy')
    const degradedChecks = recentHealthChecks.filter(check => check.status === 'degraded')
    
    let status = 'healthy'
    if (unhealthyChecks.length > 0) {
      status = 'unhealthy'
    } else if (degradedChecks.length > 0) {
      status = 'degraded'
    }
    
    return {
      status,
      details: {
        totalChecks: recentHealthChecks.length,
        healthyChecks: recentHealthChecks.filter(check => check.status === 'healthy').length,
        degradedChecks: degradedChecks.length,
        unhealthyChecks: unhealthyChecks.length,
        avgResponseTime: recentHealthChecks.reduce((sum, check) => sum + check.responseTime, 0) / recentHealthChecks.length,
        recentMetrics: recentMetrics.length
      }
    }
  } catch (error) {
    logger.error('Failed to get system health status', 'monitoring', { error: error.message })
    return { status: 'unknown', details: { error: error.message } }
  }
}

/**
 * Get recent metrics from database
 */
async function getRecentMetrics(): Promise<{
  failureRate: number
  avgLatency: number
  errorCount: number
  successCount: number
}> {
  try {
    const supabase = createServiceRoleClient()
    
    // Get metrics from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const { data: jobRuns, error } = await supabase
      .from('job_runs')
      .select('status, execution_time_ms, created_at')
      .gte('created_at', oneHourAgo.toISOString())
    
    if (error) {
      throw error
    }
    
    const totalJobs = jobRuns.length
    const successfulJobs = jobRuns.filter(run => run.status === 'completed').length
    const failedJobs = jobRuns.filter(run => run.status === 'failed').length
    const errorJobs = jobRuns.filter(run => run.status === 'error').length
    
    const failureRate = totalJobs > 0 ? (failedJobs + errorJobs) / totalJobs : 0
    const avgLatency = jobRuns.length > 0 
      ? jobRuns.reduce((sum, run) => sum + (run.execution_time_ms || 0), 0) / jobRuns.length 
      : 0
    
    return {
      failureRate,
      avgLatency,
      errorCount: errorJobs,
      successCount: successfulJobs
    }
  } catch (error) {
    logger.error('Failed to get recent metrics', 'monitoring', { error: error.message })
    return {
      failureRate: 0,
      avgLatency: 0,
      errorCount: 0,
      successCount: 0
    }
  }
}

/**
 * Get queue status
 */
async function getQueueStatus(): Promise<{
  pendingJobs: number
  processingJobs: number
  failedJobs: number
}> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data: jobs, error } = await supabase
      .from('content_jobs')
      .select('status')
    
    if (error) {
      throw error
    }
    
    const pendingJobs = jobs.filter(job => job.status === 'pending').length
    const processingJobs = jobs.filter(job => job.status === 'processing').length
    const failedJobs = jobs.filter(job => job.status === 'failed').length
    
    return {
      pendingJobs,
      processingJobs,
      failedJobs
    }
  } catch (error) {
    logger.error('Failed to get queue status', 'monitoring', { error: error.message })
    return {
      pendingJobs: 0,
      processingJobs: 0,
      failedJobs: 0
    }
  }
}

/**
 * Resolve alert
 */
export function resolveAlert(alertId: string): boolean {
  const alert = activeAlerts.get(alertId)
  if (!alert) {
    return false
  }
  
  alert.resolved = true
  alert.resolvedAt = new Date()
  activeAlerts.set(alertId, alert)
  
  logger.info('Alert resolved', 'monitoring', { alertId })
  return true
}

/**
 * Get active alerts
 */
export function getActiveAlerts(): Alert[] {
  return Array.from(activeAlerts.values()).filter(alert => !alert.resolved)
}

/**
 * Get all alerts
 */
export function getAllAlerts(): Alert[] {
  return Array.from(activeAlerts.values())
}

/**
 * Clean up old alerts
 */
export function cleanupOldAlerts(): void {
  const config = getMonitoringConfig()
  const cutoffTime = Date.now() - (config.alertsRetentionDays * 24 * 60 * 60 * 1000)
  
  let cleanedCount = 0
  for (const [alertId, alert] of activeAlerts.entries()) {
    if (alert.timestamp.getTime() < cutoffTime) {
      activeAlerts.delete(alertId)
      cleanedCount++
    }
  }
  
  if (cleanedCount > 0) {
    logger.info('Old alerts cleaned up', 'monitoring', { cleanedCount })
  }
}

/**
 * Get monitoring status
 */
export function getMonitoringStatus(): {
  config: MonitoringConfig
  alertRules: AlertRule[]
  activeAlerts: Alert[]
  healthChecks: HealthCheck[]
  systemMetrics: SystemMetrics[]
} {
  return {
    config: getMonitoringConfig(),
    alertRules: getAllAlertRules(),
    activeAlerts: getActiveAlerts(),
    healthChecks: getAllHealthChecks(),
    systemMetrics: getRecentSystemMetrics(24)
  }
}

/**
 * Update monitoring configuration
 */
export function updateMonitoringConfig(updates: Partial<MonitoringConfig>): MonitoringConfig {
  if (!monitoringConfig) {
    throw new Error('Monitoring not initialized')
  }
  
  monitoringConfig = { ...monitoringConfig, ...updates }
  
  logger.info('Monitoring configuration updated', 'monitoring', {
    updates: Object.keys(updates)
  })
  
  return monitoringConfig
}

/**
 * Reset monitoring configuration
 */
export function resetMonitoringConfig(): void {
  monitoringConfig = null
  alertRules.clear()
  activeAlerts.clear()
  healthChecks.clear()
  systemMetrics.length = 0
  
  logger.info('Monitoring configuration reset', 'monitoring')
}
