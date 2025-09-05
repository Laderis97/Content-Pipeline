import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { response } from '../_shared/response.ts'
import { logger } from '../_shared/logger.ts'
import { 
  initializeMonitoring, 
  getMonitoringConfig, 
  getMonitoringStatus,
  checkAlertConditions,
  sendAlertNotifications,
  recordHealthCheck,
  recordSystemMetrics,
  getSystemHealthStatus,
  getActiveAlerts,
  getAllAlerts,
  resolveAlert,
  addAlertRule,
  removeAlertRule,
  getAlertRule,
  getAllAlertRules,
  updateMonitoringConfig,
  cleanupOldAlerts,
  getRecentSystemMetrics
} from '../_shared/monitoring.ts'
import { requireServiceRole } from '../_shared/auth.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Require service role for monitoring operations
    const userContext = await requireServiceRole()(req)
    
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'status'
    
    logger.info(`Monitoring - Action: ${action}`, 'monitoring')
    
    switch (action) {
      case 'status':
        return await handleGetStatus()
      
      case 'init':
        return await handleInitialize(req)
      
      case 'alerts':
        return await handleGetAlerts()
      
      case 'check-alerts':
        return await handleCheckAlerts()
      
      case 'resolve-alert':
        return await handleResolveAlert(req)
      
      case 'health':
        return await handleGetHealth()
      
      case 'record-health':
        return await handleRecordHealth(req)
      
      case 'record-metrics':
        return await handleRecordMetrics(req)
      
      case 'rules':
        return await handleGetRules()
      
      case 'add-rule':
        return await handleAddRule(req)
      
      case 'remove-rule':
        return await handleRemoveRule(req)
      
      case 'update-config':
        return await handleUpdateConfig(req)
      
      case 'cleanup':
        return await handleCleanup()
      
      case 'test':
        return await handleTestMonitoring()
      
      default:
        return response.validationError(
          'Invalid action. Supported actions: status, init, alerts, check-alerts, resolve-alert, health, record-health, record-metrics, rules, add-rule, remove-rule, update-config, cleanup, test'
        )
    }
    
  } catch (error) {
    logger.error('Monitoring error:', 'monitoring', { error: error.message })
    return response.internalError('Monitoring failed', { error: error.message })
  }
})

async function handleGetStatus(): Promise<Response> {
  try {
    const status = getMonitoringStatus()
    
    return response.success(
      {
        ...status,
        timestamp: new Date().toISOString()
      },
      'Monitoring status retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get monitoring status:', 'monitoring', { error: error.message })
    return response.internalError('Failed to get monitoring status', { error: error.message })
  }
}

async function handleInitialize(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { config = {} } = body
    
    const monitoringConfig = initializeMonitoring(config)
    
    return response.success(
      {
        config: monitoringConfig,
        initialized: true
      },
      'Monitoring initialized successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to initialize monitoring:', 'monitoring', { error: error.message })
    return response.internalError('Failed to initialize monitoring', { error: error.message })
  }
}

async function handleGetAlerts(): Promise<Response> {
  try {
    const activeAlerts = getActiveAlerts()
    const allAlerts = getAllAlerts()
    
    return response.success(
      {
        active_alerts: activeAlerts,
        all_alerts: allAlerts,
        summary: {
          total_alerts: allAlerts.length,
          active_alerts: activeAlerts.length,
          resolved_alerts: allAlerts.length - activeAlerts.length
        }
      },
      'Alerts retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get alerts:', 'monitoring', { error: error.message })
    return response.internalError('Failed to get alerts', { error: error.message })
  }
}

async function handleCheckAlerts(): Promise<Response> {
  try {
    const newAlerts = await checkAlertConditions()
    
    if (newAlerts.length > 0) {
      await sendAlertNotifications(newAlerts)
    }
    
    return response.success(
      {
        new_alerts: newAlerts,
        alerts_sent: newAlerts.length,
        timestamp: new Date().toISOString()
      },
      `Alert check completed - ${newAlerts.length} new alerts triggered`,
      200
    )
    
  } catch (error) {
    logger.error('Failed to check alerts:', 'monitoring', { error: error.message })
    return response.internalError('Failed to check alerts', { error: error.message })
  }
}

async function handleResolveAlert(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { alertId } = body
    
    if (!alertId) {
      return response.validationError('Alert ID is required')
    }
    
    const resolved = resolveAlert(alertId)
    
    if (!resolved) {
      return response.notFound('Alert not found')
    }
    
    return response.success(
      { alertId, resolved: true },
      'Alert resolved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to resolve alert:', 'monitoring', { error: error.message })
    return response.internalError('Failed to resolve alert', { error: error.message })
  }
}

async function handleGetHealth(): Promise<Response> {
  try {
    const healthStatus = await getSystemHealthStatus()
    const recentMetrics = getRecentSystemMetrics(1) // Last hour
    
    return response.success(
      {
        health: healthStatus,
        recent_metrics: recentMetrics,
        timestamp: new Date().toISOString()
      },
      'Health status retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get health status:', 'monitoring', { error: error.message })
    return response.internalError('Failed to get health status', { error: error.message })
  }
}

async function handleRecordHealth(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      id, 
      name, 
      status, 
      responseTime, 
      error, 
      metadata = {} 
    } = body
    
    if (!id || !name || !status) {
      return response.validationError('ID, name, and status are required')
    }
    
    const healthCheck = {
      id,
      name,
      status,
      timestamp: new Date(),
      responseTime: responseTime || 0,
      error,
      metadata
    }
    
    recordHealthCheck(healthCheck)
    
    return response.success(
      { healthCheck },
      'Health check recorded successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to record health check:', 'monitoring', { error: error.message })
    return response.internalError('Failed to record health check', { error: error.message })
  }
}

async function handleRecordMetrics(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      cpuUsage, 
      memoryUsage, 
      diskUsage, 
      networkLatency, 
      activeConnections, 
      errorRate, 
      throughput 
    } = body
    
    const systemMetrics = {
      timestamp: new Date(),
      cpuUsage: cpuUsage || 0,
      memoryUsage: memoryUsage || 0,
      diskUsage: diskUsage || 0,
      networkLatency: networkLatency || 0,
      activeConnections: activeConnections || 0,
      errorRate: errorRate || 0,
      throughput: throughput || 0
    }
    
    recordSystemMetrics(systemMetrics)
    
    return response.success(
      { systemMetrics },
      'System metrics recorded successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to record system metrics:', 'monitoring', { error: error.message })
    return response.internalError('Failed to record system metrics', { error: error.message })
  }
}

async function handleGetRules(): Promise<Response> {
  try {
    const rules = getAllAlertRules()
    
    return response.success(
      { rules },
      'Alert rules retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get alert rules:', 'monitoring', { error: error.message })
    return response.internalError('Failed to get alert rules', { error: error.message })
  }
}

async function handleAddRule(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { rule } = body
    
    if (!rule || !rule.id || !rule.name) {
      return response.validationError('Rule with ID and name is required')
    }
    
    addAlertRule(rule)
    
    return response.success(
      { rule },
      'Alert rule added successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to add alert rule:', 'monitoring', { error: error.message })
    return response.internalError('Failed to add alert rule', { error: error.message })
  }
}

async function handleRemoveRule(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { ruleId } = body
    
    if (!ruleId) {
      return response.validationError('Rule ID is required')
    }
    
    const rule = getAlertRule(ruleId)
    if (!rule) {
      return response.notFound('Alert rule not found')
    }
    
    removeAlertRule(ruleId)
    
    return response.success(
      { ruleId, removed: true },
      'Alert rule removed successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to remove alert rule:', 'monitoring', { error: error.message })
    return response.internalError('Failed to remove alert rule', { error: error.message })
  }
}

async function handleUpdateConfig(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { updates = {} } = body
    
    if (Object.keys(updates).length === 0) {
      return response.validationError('No updates provided')
    }
    
    const updatedConfig = updateMonitoringConfig(updates)
    
    return response.success(
      {
        config: updatedConfig,
        updated_fields: Object.keys(updates)
      },
      'Monitoring configuration updated successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to update monitoring config:', 'monitoring', { error: error.message })
    return response.internalError('Failed to update monitoring configuration', { error: error.message })
  }
}

async function handleCleanup(): Promise<Response> {
  try {
    cleanupOldAlerts()
    
    return response.success(
      { cleanup_completed: true },
      'Old alerts cleaned up successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to cleanup old alerts:', 'monitoring', { error: error.message })
    return response.internalError('Failed to cleanup old alerts', { error: error.message })
  }
}

async function handleTestMonitoring(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Configuration initialization
    try {
      const config = getMonitoringConfig()
      tests.push({
        test: 'config_initialization',
        success: !!config,
        message: 'Monitoring configuration initialized successfully',
        details: {
          failureRateThreshold: config.failureRateThreshold,
          latencyThreshold: config.latencyThreshold,
          enablePerformanceMonitoring: config.enablePerformanceMonitoring
        }
      })
    } catch (error) {
      tests.push({
        test: 'config_initialization',
        success: false,
        message: `Configuration initialization failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: Alert rules
    try {
      const rules = getAllAlertRules()
      tests.push({
        test: 'alert_rules',
        success: rules.length > 0,
        message: `Alert rules loaded successfully (${rules.length} rules)`,
        details: {
          rule_count: rules.length,
          enabled_rules: rules.filter(rule => rule.enabled).length
        }
      })
    } catch (error) {
      tests.push({
        test: 'alert_rules',
        success: false,
        message: `Alert rules test failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: Health status
    try {
      const healthStatus = await getSystemHealthStatus()
      tests.push({
        test: 'health_status',
        success: true,
        message: 'Health status retrieved successfully',
        details: {
          status: healthStatus.status,
          details: healthStatus.details
        }
      })
    } catch (error) {
      tests.push({
        test: 'health_status',
        success: false,
        message: `Health status test failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 4: Alert conditions
    try {
      const newAlerts = await checkAlertConditions()
      tests.push({
        test: 'alert_conditions',
        success: true,
        message: `Alert conditions checked successfully (${newAlerts.length} new alerts)`,
        details: {
          new_alerts: newAlerts.length,
          alert_ids: newAlerts.map(alert => alert.id)
        }
      })
    } catch (error) {
      tests.push({
        test: 'alert_conditions',
        success: false,
        message: `Alert conditions test failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 5: System metrics
    try {
      const recentMetrics = getRecentSystemMetrics(1)
      tests.push({
        test: 'system_metrics',
        success: true,
        message: `System metrics retrieved successfully (${recentMetrics.length} metrics)`,
        details: {
          metrics_count: recentMetrics.length,
          latest_metric: recentMetrics[recentMetrics.length - 1] || null
        }
      })
    } catch (error) {
      tests.push({
        test: 'system_metrics',
        success: false,
        message: `System metrics test failed: ${error.message}`,
        details: null
      })
    }
    
    const allTestsPassed = tests.every(test => test.success)
    
    return response.success(
      {
        tests: tests,
        all_tests_passed: allTestsPassed,
        summary: {
          total_tests: tests.length,
          passed_tests: tests.filter(test => test.success).length,
          failed_tests: tests.filter(test => !test.success).length
        }
      },
      `Monitoring test completed - ${tests.filter(test => test.success).length}/${tests.length} tests passed`,
      allTestsPassed ? 200 : 400
    )
    
  } catch (error) {
    logger.error('Monitoring test failed:', 'monitoring', { error: error.message })
    return response.internalError('Monitoring test failed', { error: error.message })
  }
}
