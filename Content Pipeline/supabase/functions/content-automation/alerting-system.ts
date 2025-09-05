// Alerting system for >20% daily job failure rate
// PRD Reference: Monitoring & Maintenance Functions (5.3), Error Handling & Monitoring (D1-D3)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Alerting configuration
const ALERTING_CONFIG = {
  // Failure rate thresholds
  FAILURE_RATE_THRESHOLDS: {
    warning: 0.15,    // 15% - Warning level
    critical: 0.20,   // 20% - Critical level (PRD requirement)
    emergency: 0.30,  // 30% - Emergency level
  },
  
  // Alert frequency and cooldown
  ALERT_FREQUENCY: {
    max_alerts_per_hour: 3,
    alert_cooldown: 60 * 60 * 1000, // 1 hour
    escalation_delay: 30 * 60 * 1000, // 30 minutes
  },
  
  // Notification channels
  NOTIFICATION_CHANNELS: {
    email: {
      enabled: true,
      recipients: ['admin@example.com', 'ops@example.com'],
      template: 'failure_rate_alert'
    },
    slack: {
      enabled: false, // Can be enabled later
      webhook_url: Deno.env.get('SLACK_WEBHOOK_URL'),
      channel: '#alerts'
    },
    webhook: {
      enabled: false, // Can be enabled later
      url: Deno.env.get('ALERT_WEBHOOK_URL')
    }
  },
  
  // Alert escalation
  ESCALATION: {
    levels: 4,
    escalation_delays: [
      30 * 60 * 1000,  // Level 1: 30 minutes
      60 * 60 * 1000,  // Level 2: 1 hour
      2 * 60 * 60 * 1000, // Level 3: 2 hours
      4 * 60 * 60 * 1000  // Level 4: 4 hours
    ]
  }
}

interface AlertContext {
  failure_rate: number
  total_jobs: number
  failed_jobs: number
  time_window: string
  date: string
  previous_failure_rate?: number
  trend: 'improving' | 'degrading' | 'stable'
}

interface AlertNotification {
  id: string
  type: 'failure_rate_alert'
  severity: 'warning' | 'critical' | 'emergency'
  title: string
  message: string
  context: AlertContext
  timestamp: string
  escalation_level: number
  channels: string[]
  metadata: any
}

interface AlertRule {
  id: string
  name: string
  condition: string
  threshold: number
  severity: 'warning' | 'critical' | 'emergency'
  enabled: boolean
  cooldown: number
  escalation_enabled: boolean
  notification_channels: string[]
}

/**
 * Alerting system for failure rate monitoring
 */
export class AlertingSystem {
  private alertRules: AlertRule[] = []
  private alertHistory: Map<string, number> = new Map() // Track last alert time by rule

  constructor() {
    this.initializeAlertRules()
  }

  /**
   * Checks failure rate and generates alerts if thresholds are exceeded
   */
  async checkFailureRateAndAlert(
    failureRate: number,
    totalJobs: number,
    failedJobs: number,
    timeWindow: string = 'daily',
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<{
    alerts_generated: number
    alerts: AlertNotification[]
    escalated_alerts: number
  }> {
    try {
      console.log(`[AlertingSystem] Checking failure rate: ${(failureRate * 100).toFixed(1)}% (${failedJobs}/${totalJobs} jobs)`)
      
      const alerts: AlertNotification[] = []
      let escalatedAlerts = 0
      
      // Determine severity based on failure rate
      let severity: 'warning' | 'critical' | 'emergency' | null = null
      let threshold = 0
      
      if (failureRate >= ALERTING_CONFIG.FAILURE_RATE_THRESHOLDS.emergency) {
        severity = 'emergency'
        threshold = ALERTING_CONFIG.FAILURE_RATE_THRESHOLDS.emergency
      } else if (failureRate >= ALERTING_CONFIG.FAILURE_RATE_THRESHOLDS.critical) {
        severity = 'critical'
        threshold = ALERTING_CONFIG.FAILURE_RATE_THRESHOLDS.critical
      } else if (failureRate >= ALERTING_CONFIG.FAILURE_RATE_THRESHOLDS.warning) {
        severity = 'warning'
        threshold = ALERTING_CONFIG.FAILURE_RATE_THRESHOLDS.warning
      }
      
      if (!severity) {
        console.log(`[AlertingSystem] Failure rate ${(failureRate * 100).toFixed(1)}% is below alert thresholds`)
        return { alerts_generated: 0, alerts: [], escalated_alerts: 0 }
      }
      
      // Check if we should generate an alert (cooldown check)
      const alertKey = `failure_rate_${severity}_${timeWindow}`
      const lastAlertTime = this.alertHistory.get(alertKey) || 0
      const now = Date.now()
      
      if (now - lastAlertTime < ALERTING_CONFIG.ALERT_FREQUENCY.alert_cooldown) {
        console.log(`[AlertingSystem] Alert cooldown active for ${severity} level alerts`)
        return { alerts_generated: 0, alerts: [], escalated_alerts: 0 }
      }
      
      // Get trend information
      const trend = await this.calculateFailureRateTrend(date, timeWindow)
      
      // Create alert context
      const context: AlertContext = {
        failure_rate: failureRate,
        total_jobs: totalJobs,
        failed_jobs: failedJobs,
        time_window: timeWindow,
        date: date,
        trend: trend.direction
      }
      
      // Generate alert
      const alert = await this.generateFailureRateAlert(severity, context, threshold)
      alerts.push(alert)
      
      // Send notifications
      await this.sendAlertNotifications(alert)
      
      // Check for escalation
      const escalated = await this.checkAndEscalateAlert(alert)
      if (escalated) {
        escalatedAlerts++
      }
      
      // Update alert history
      this.alertHistory.set(alertKey, now)
      
      // Store alert in database
      await this.storeAlert(alert)
      
      console.log(`[AlertingSystem] Generated ${severity} alert for ${(failureRate * 100).toFixed(1)}% failure rate`)
      
      return {
        alerts_generated: alerts.length,
        alerts: alerts,
        escalated_alerts: escalatedAlerts
      }
      
    } catch (error) {
      console.error('[AlertingSystem] Failed to check failure rate and alert:', error)
      throw error
    }
  }

  /**
   * Generates a failure rate alert
   */
  private async generateFailureRateAlert(
    severity: 'warning' | 'critical' | 'emergency',
    context: AlertContext,
    threshold: number
  ): Promise<AlertNotification> {
    const alertId = crypto.randomUUID()
    const timestamp = new Date().toISOString()
    
    // Generate alert title and message
    const title = this.generateAlertTitle(severity, context)
    const message = this.generateAlertMessage(severity, context, threshold)
    
    // Determine notification channels
    const channels = this.getNotificationChannels(severity)
    
    return {
      id: alertId,
      type: 'failure_rate_alert',
      severity: severity,
      title: title,
      message: message,
      context: context,
      timestamp: timestamp,
      escalation_level: 0,
      channels: channels,
      metadata: {
        threshold: threshold,
        generated_by: 'alerting_system',
        rule_id: `failure_rate_${severity}`,
        time_window: context.time_window
      }
    }
  }

  /**
   * Generates alert title
   */
  private generateAlertTitle(severity: string, context: AlertContext): string {
    const severityEmoji = {
      warning: '⚠️',
      critical: '🚨',
      emergency: '🔥'
    }
    
    const emoji = severityEmoji[severity as keyof typeof severityEmoji] || '⚠️'
    const rate = (context.failure_rate * 100).toFixed(1)
    
    return `${emoji} ${severity.toUpperCase()}: ${rate}% Failure Rate (${context.time_window})`
  }

  /**
   * Generates alert message
   */
  private generateAlertMessage(
    severity: string,
    context: AlertContext,
    threshold: number
  ): string {
    const rate = (context.failure_rate * 100).toFixed(1)
    const thresholdPercent = (threshold * 100).toFixed(1)
    const trend = context.trend
    
    let message = `Content automation system failure rate is ${rate}% (${context.failed_jobs}/${context.total_jobs} jobs), exceeding the ${thresholdPercent}% threshold.\n\n`
    
    message += `**Details:**\n`
    message += `• Time Window: ${context.time_window}\n`
    message += `• Date: ${context.date}\n`
    message += `• Failed Jobs: ${context.failed_jobs}\n`
    message += `• Total Jobs: ${context.total_jobs}\n`
    message += `• Trend: ${trend}\n\n`
    
    if (severity === 'critical' || severity === 'emergency') {
      message += `**Immediate Action Required:**\n`
      message += `• Check system logs for error patterns\n`
      message += `• Verify external service availability (OpenAI, WordPress)\n`
      message += `• Review recent configuration changes\n`
      message += `• Consider manual intervention if needed\n\n`
    }
    
    message += `**Next Steps:**\n`
    message += `• Monitor system health dashboard\n`
    message += `• Check for related alerts\n`
    message += `• Review failure patterns and root causes\n`
    
    return message
  }

  /**
   * Gets notification channels for severity level
   */
  private getNotificationChannels(severity: string): string[] {
    const channels: string[] = []
    
    if (ALERTING_CONFIG.NOTIFICATION_CHANNELS.email.enabled) {
      channels.push('email')
    }
    
    if (severity === 'critical' || severity === 'emergency') {
      if (ALERTING_CONFIG.NOTIFICATION_CHANNELS.slack.enabled) {
        channels.push('slack')
      }
      if (ALERTING_CONFIG.NOTIFICATION_CHANNELS.webhook.enabled) {
        channels.push('webhook')
      }
    }
    
    return channels
  }

  /**
   * Sends alert notifications through configured channels
   */
  private async sendAlertNotifications(alert: AlertNotification): Promise<void> {
    try {
      console.log(`[AlertingSystem] Sending notifications for alert ${alert.id} to channels: ${alert.channels.join(', ')}`)
      
      for (const channel of alert.channels) {
        try {
          switch (channel) {
            case 'email':
              await this.sendEmailNotification(alert)
              break
            case 'slack':
              await this.sendSlackNotification(alert)
              break
            case 'webhook':
              await this.sendWebhookNotification(alert)
              break
            default:
              console.warn(`[AlertingSystem] Unknown notification channel: ${channel}`)
          }
        } catch (error) {
          console.error(`[AlertingSystem] Failed to send ${channel} notification:`, error)
        }
      }
      
    } catch (error) {
      console.error('[AlertingSystem] Failed to send alert notifications:', error)
    }
  }

  /**
   * Sends email notification
   */
  private async sendEmailNotification(alert: AlertNotification): Promise<void> {
    // In a real implementation, this would integrate with an email service
    // For now, we'll log the email content
    console.log(`[AlertingSystem] EMAIL NOTIFICATION:`)
    console.log(`To: ${ALERTING_CONFIG.NOTIFICATION_CHANNELS.email.recipients.join(', ')}`)
    console.log(`Subject: ${alert.title}`)
    console.log(`Body: ${alert.message}`)
    
    // Store email notification in database for tracking
    await this.logNotification('email', alert.id, 'sent')
  }

  /**
   * Sends Slack notification
   */
  private async sendSlackNotification(alert: AlertNotification): Promise<void> {
    if (!ALERTING_CONFIG.NOTIFICATION_CHANNELS.slack.webhook_url) {
      console.warn('[AlertingSystem] Slack webhook URL not configured')
      return
    }
    
    const slackMessage = {
      channel: ALERTING_CONFIG.NOTIFICATION_CHANNELS.slack.channel,
      username: 'Content Automation Alerts',
      icon_emoji: ':warning:',
      attachments: [{
        color: this.getSlackColor(alert.severity),
        title: alert.title,
        text: alert.message,
        fields: [
          {
            title: 'Failure Rate',
            value: `${(alert.context.failure_rate * 100).toFixed(1)}%`,
            short: true
          },
          {
            title: 'Failed Jobs',
            value: `${alert.context.failed_jobs}/${alert.context.total_jobs}`,
            short: true
          },
          {
            title: 'Time Window',
            value: alert.context.time_window,
            short: true
          },
          {
            title: 'Trend',
            value: alert.context.trend,
            short: true
          }
        ],
        footer: 'Content Automation System',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }]
    }
    
    // In a real implementation, this would make an HTTP request to Slack
    console.log(`[AlertingSystem] SLACK NOTIFICATION:`, JSON.stringify(slackMessage, null, 2))
    
    await this.logNotification('slack', alert.id, 'sent')
  }

  /**
   * Sends webhook notification
   */
  private async sendWebhookNotification(alert: AlertNotification): Promise<void> {
    if (!ALERTING_CONFIG.NOTIFICATION_CHANNELS.webhook.url) {
      console.warn('[AlertingSystem] Webhook URL not configured')
      return
    }
    
    const webhookPayload = {
      alert_id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      context: alert.context,
      timestamp: alert.timestamp,
      escalation_level: alert.escalation_level,
      metadata: alert.metadata
    }
    
    // In a real implementation, this would make an HTTP request to the webhook URL
    console.log(`[AlertingSystem] WEBHOOK NOTIFICATION:`, JSON.stringify(webhookPayload, null, 2))
    
    await this.logNotification('webhook', alert.id, 'sent')
  }

  /**
   * Gets Slack color for severity
   */
  private getSlackColor(severity: string): string {
    const colors = {
      warning: 'warning',
      critical: 'danger',
      emergency: 'danger'
    }
    return colors[severity as keyof typeof colors] || 'warning'
  }

  /**
   * Checks and escalates alert if needed
   */
  private async checkAndEscalateAlert(alert: AlertNotification): Promise<boolean> {
    try {
      // Check if alert should be escalated
      if (alert.severity === 'critical' || alert.severity === 'emergency') {
        // Check for existing unresolved alerts of same type
        const existingAlerts = await this.getUnresolvedAlerts(alert.type, alert.severity)
        
        if (existingAlerts.length > 0) {
          // Escalate the oldest unresolved alert
          const oldestAlert = existingAlerts.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )[0]
          
          await this.escalateAlert(oldestAlert.id)
          return true
        }
      }
      
      return false
      
    } catch (error) {
      console.error('[AlertingSystem] Failed to check and escalate alert:', error)
      return false
    }
  }

  /**
   * Escalates an alert to the next level
   */
  private async escalateAlert(alertId: string): Promise<void> {
    try {
      // Get current alert
      const { data: alert, error: fetchError } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .eq('id', alertId)
        .single()
      
      if (fetchError || !alert) {
        console.error(`[AlertingSystem] Alert ${alertId} not found`)
        return
      }
      
      const currentLevel = alert.escalation_level || 0
      const newLevel = Math.min(currentLevel + 1, ALERTING_CONFIG.ESCALATION.levels - 1)
      
      if (newLevel === currentLevel) {
        console.log(`[AlertingSystem] Alert ${alertId} already at maximum escalation level`)
        return
      }
      
      // Update escalation level
      const { error: updateError } = await supabase
        .from('monitoring_alerts')
        .update({
          escalation_level: newLevel,
          metadata: {
            ...alert.metadata,
            [`escalation_${newLevel}_timestamp`]: new Date().toISOString(),
            [`escalation_${newLevel}_reason`]: 'Automatic escalation due to continued failure rate'
          }
        })
        .eq('id', alertId)
      
      if (updateError) {
        throw new Error(`Failed to escalate alert: ${updateError.message}`)
      }
      
      console.log(`[AlertingSystem] Escalated alert ${alertId} to level ${newLevel}`)
      
      // Send escalation notification
      await this.sendEscalationNotification(alert, newLevel)
      
    } catch (error) {
      console.error(`[AlertingSystem] Failed to escalate alert ${alertId}:`, error)
    }
  }

  /**
   * Sends escalation notification
   */
  private async sendEscalationNotification(alert: any, newLevel: number): Promise<void> {
    const escalationMessage = `🚨 ALERT ESCALATION: ${alert.message}\n\nEscalated to level ${newLevel} due to continued issues.`
    
    console.log(`[AlertingSystem] ESCALATION NOTIFICATION: ${escalationMessage}`)
    
    // In a real implementation, this would send notifications to escalation contacts
  }

  /**
   * Calculates failure rate trend
   */
  private async calculateFailureRateTrend(date: string, timeWindow: string): Promise<{
    direction: 'improving' | 'degrading' | 'stable'
    change: number
  }> {
    try {
      // Get failure rates for the last 3 periods
      const periods = []
      const currentDate = new Date(date)
      
      for (let i = 2; i >= 0; i--) {
        const periodDate = new Date(currentDate)
        periodDate.setDate(currentDate.getDate() - i)
        const periodDateStr = periodDate.toISOString().split('T')[0]
        
        const metrics = await this.getFailureRateForPeriod(periodDateStr, timeWindow)
        periods.push(metrics.failure_rate)
      }
      
      if (periods.length < 2) {
        return { direction: 'stable', change: 0 }
      }
      
      const change = (periods[2] - periods[0]) / periods[0]
      
      if (change > 0.1) {
        return { direction: 'degrading', change }
      } else if (change < -0.1) {
        return { direction: 'improving', change }
      } else {
        return { direction: 'stable', change }
      }
      
    } catch (error) {
      console.error('[AlertingSystem] Failed to calculate failure rate trend:', error)
      return { direction: 'stable', change: 0 }
    }
  }

  /**
   * Gets failure rate for a specific period
   */
  private async getFailureRateForPeriod(date: string, timeWindow: string): Promise<{
    failure_rate: number
    total_jobs: number
    failed_jobs: number
  }> {
    try {
      const startTime = this.getStartTime(timeWindow, date)
      const endTime = this.getEndTime(timeWindow, date)
      
      const { data: jobs, error } = await supabase
        .from('content_jobs')
        .select('status')
        .gte('created_at', startTime.toISOString())
        .lte('created_at', endTime.toISOString())
      
      if (error) {
        throw new Error(`Failed to get jobs for period: ${error.message}`)
      }
      
      const totalJobs = jobs.length
      const failedJobs = jobs.filter(job => job.status === 'failed').length
      const failureRate = totalJobs > 0 ? failedJobs / totalJobs : 0
      
      return { failure_rate: failureRate, total_jobs: totalJobs, failed_jobs: failedJobs }
      
    } catch (error) {
      console.error('[AlertingSystem] Failed to get failure rate for period:', error)
      return { failure_rate: 0, total_jobs: 0, failed_jobs: 0 }
    }
  }

  /**
   * Stores alert in database
   */
  private async storeAlert(alert: AlertNotification): Promise<void> {
    try {
      const { error } = await supabase
        .from('monitoring_alerts')
        .insert({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          value: alert.context.failure_rate,
          threshold: alert.metadata.threshold,
          timestamp: alert.timestamp,
          resolved: false,
          escalation_level: alert.escalation_level,
          metadata: alert.metadata
        })
      
      if (error) {
        throw new Error(`Failed to store alert: ${error.message}`)
      }
      
    } catch (error) {
      console.error('[AlertingSystem] Failed to store alert:', error)
    }
  }

  /**
   * Logs notification delivery
   */
  private async logNotification(channel: string, alertId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_logs')
        .insert({
          alert_id: alertId,
          channel: channel,
          status: status,
          timestamp: new Date().toISOString()
        })
      
      if (error) {
        console.error(`[AlertingSystem] Failed to log notification: ${error.message}`)
      }
      
    } catch (error) {
      console.error('[AlertingSystem] Failed to log notification:', error)
    }
  }

  /**
   * Gets unresolved alerts of specific type and severity
   */
  private async getUnresolvedAlerts(type: string, severity: string): Promise<any[]> {
    try {
      const { data: alerts, error } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .eq('type', type)
        .eq('severity', severity)
        .eq('resolved', false)
        .order('timestamp', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to get unresolved alerts: ${error.message}`)
      }
      
      return alerts || []
      
    } catch (error) {
      console.error('[AlertingSystem] Failed to get unresolved alerts:', error)
      return []
    }
  }

  /**
   * Initializes alert rules
   */
  private initializeAlertRules(): void {
    this.alertRules = [
      {
        id: 'failure_rate_warning',
        name: 'Failure Rate Warning',
        condition: 'failure_rate >= 0.15',
        threshold: 0.15,
        severity: 'warning',
        enabled: true,
        cooldown: 60 * 60 * 1000, // 1 hour
        escalation_enabled: false,
        notification_channels: ['email']
      },
      {
        id: 'failure_rate_critical',
        name: 'Failure Rate Critical',
        condition: 'failure_rate >= 0.20',
        threshold: 0.20,
        severity: 'critical',
        enabled: true,
        cooldown: 30 * 60 * 1000, // 30 minutes
        escalation_enabled: true,
        notification_channels: ['email', 'slack']
      },
      {
        id: 'failure_rate_emergency',
        name: 'Failure Rate Emergency',
        condition: 'failure_rate >= 0.30',
        threshold: 0.30,
        severity: 'emergency',
        enabled: true,
        cooldown: 15 * 60 * 1000, // 15 minutes
        escalation_enabled: true,
        notification_channels: ['email', 'slack', 'webhook']
      }
    ]
  }

  /**
   * Helper functions for time calculations
   */
  private getStartTime(timeWindow: string, date: string): Date {
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

  private getEndTime(timeWindow: string, date: string): Date {
    const startTime = this.getStartTime(timeWindow, date)
    
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
}

/**
 * Creates an alerting system instance
 */
export function createAlertingSystem(): AlertingSystem {
  return new AlertingSystem()
}

/**
 * Checks failure rate and generates alerts
 */
export async function checkFailureRateAndAlert(
  failureRate: number,
  totalJobs: number,
  failedJobs: number,
  timeWindow: string = 'daily',
  date: string = new Date().toISOString().split('T')[0]
): Promise<{
  alerts_generated: number
  alerts: AlertNotification[]
  escalated_alerts: number
}> {
  const alertingSystem = createAlertingSystem()
  return await alertingSystem.checkFailureRateAndAlert(failureRate, totalJobs, failedJobs, timeWindow, date)
}

/**
 * Gets alerting system configuration
 */
export function getAlertingConfig(): typeof ALERTING_CONFIG {
  return ALERTING_CONFIG
}
