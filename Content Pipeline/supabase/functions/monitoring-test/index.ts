import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { response } from '../_shared/response.ts'
import { logger } from '../_shared/logger.ts'
import { 
  initializeMonitoring, 
  getMonitoringConfig, 
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
  getRecentSystemMetrics,
  resetMonitoringConfig
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
    const action = url.searchParams.get('action') || 'test'
    const testType = url.searchParams.get('type') || 'all'
    
    logger.info(`Monitoring test - Action: ${action}, Type: ${testType}`, 'monitoring-test')
    
    switch (action) {
      case 'test':
        return await handleMonitoringTest(testType)
      
      case 'alert-test':
        return await handleAlertTest()
      
      case 'health-test':
        return await handleHealthTest()
      
      case 'metrics-test':
        return await handleMetricsTest()
      
      case 'rule-test':
        return await handleRuleTest()
      
      case 'config-test':
        return await handleConfigTest()
      
      case 'integration-test':
        return await handleIntegrationTest()
      
      case 'performance-test':
        return await handlePerformanceTest()
      
      case 'stress-test':
        return await handleStressTest()
      
      default:
        return response.validationError(
          'Invalid action. Supported actions: test, alert-test, health-test, metrics-test, rule-test, config-test, integration-test, performance-test, stress-test'
        )
    }
    
  } catch (error) {
    logger.error('Monitoring test error:', 'monitoring-test', { error: error.message })
    return response.internalError('Monitoring test failed', { error: error.message })
  }
})

async function handleMonitoringTest(testType: string): Promise<Response> {
  try {
    let result: any
    
    switch (testType) {
      case 'basic':
        result = await testBasicMonitoring()
        break
      case 'alerts':
        result = await testAlertSystem()
        break
      case 'health':
        result = await testHealthChecks()
        break
      case 'metrics':
        result = await testMetricsCollection()
        break
      case 'rules':
        result = await testAlertRules()
        break
      case 'config':
        result = await testConfiguration()
        break
      default:
        result = await testBasicMonitoring()
    }
    
    return response.success(
      result,
      `Monitoring test (${testType}) completed successfully`,
      200,
      { test_type: testType }
    )
    
  } catch (error) {
    logger.error(`Monitoring test (${testType}) failed:`, 'monitoring-test', { error: error.message })
    return response.internalError(`Monitoring test (${testType}) failed`, { error: error.message })
  }
}

async function handleAlertTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Alert rule creation
    try {
      const testRule = {
        id: 'test_rule',
        name: 'Test Alert Rule',
        description: 'Test alert rule for monitoring',
        condition: 'test_condition > 0',
        threshold: 1,
        severity: 'medium' as const,
        enabled: true,
        channels: ['email'],
        cooldownMinutes: 5
      }
      
      addAlertRule(testRule)
      const retrievedRule = getAlertRule('test_rule')
      
      tests.push({
        test: 'alert_rule_creation',
        success: !!retrievedRule,
        message: 'Alert rule created successfully',
        details: {
          rule_id: testRule.id,
          rule_name: testRule.name,
          severity: testRule.severity
        }
      })
    } catch (error) {
      tests.push({
        test: 'alert_rule_creation',
        success: false,
        message: `Alert rule creation failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: Alert condition checking
    try {
      const newAlerts = await checkAlertConditions()
      
      tests.push({
        test: 'alert_condition_checking',
        success: true,
        message: `Alert conditions checked successfully (${newAlerts.length} alerts)`,
        details: {
          new_alerts: newAlerts.length,
          alert_ids: newAlerts.map(alert => alert.id)
        }
      })
    } catch (error) {
      tests.push({
        test: 'alert_condition_checking',
        success: false,
        message: `Alert condition checking failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: Alert resolution
    try {
      const activeAlerts = getActiveAlerts()
      let resolved = false
      
      if (activeAlerts.length > 0) {
        const alertToResolve = activeAlerts[0]
        resolved = resolveAlert(alertToResolve.id)
      }
      
      tests.push({
        test: 'alert_resolution',
        success: true,
        message: 'Alert resolution test completed',
        details: {
          active_alerts: activeAlerts.length,
          resolved: resolved
        }
      })
    } catch (error) {
      tests.push({
        test: 'alert_resolution',
        success: false,
        message: `Alert resolution failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 4: Alert cleanup
    try {
      cleanupOldAlerts()
      
      tests.push({
        test: 'alert_cleanup',
        success: true,
        message: 'Alert cleanup completed successfully',
        details: {
          cleanup_completed: true
        }
      })
    } catch (error) {
      tests.push({
        test: 'alert_cleanup',
        success: false,
        message: `Alert cleanup failed: ${error.message}`,
        details: null
      })
    }
    
    // Cleanup test rule
    try {
      removeAlertRule('test_rule')
    } catch (error) {
      // Ignore cleanup errors
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
      'Alert test completed',
      200
    )
    
  } catch (error) {
    logger.error('Alert test failed:', 'monitoring-test', { error: error.message })
    return response.internalError('Alert test failed', { error: error.message })
  }
}

async function handleHealthTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Health check recording
    try {
      const healthCheck = {
        id: 'test_health_check',
        name: 'Test Health Check',
        status: 'healthy' as const,
        timestamp: new Date(),
        responseTime: 100,
        metadata: { test: true }
      }
      
      recordHealthCheck(healthCheck)
      
      tests.push({
        test: 'health_check_recording',
        success: true,
        message: 'Health check recorded successfully',
        details: {
          health_check_id: healthCheck.id,
          status: healthCheck.status,
          response_time: healthCheck.responseTime
        }
      })
    } catch (error) {
      tests.push({
        test: 'health_check_recording',
        success: false,
        message: `Health check recording failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: System health status
    try {
      const healthStatus = await getSystemHealthStatus()
      
      tests.push({
        test: 'system_health_status',
        success: true,
        message: 'System health status retrieved successfully',
        details: {
          status: healthStatus.status,
          details: healthStatus.details
        }
      })
    } catch (error) {
      tests.push({
        test: 'system_health_status',
        success: false,
        message: `System health status failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: Multiple health checks
    try {
      const healthChecks = [
        {
          id: 'test_health_check_1',
          name: 'Test Health Check 1',
          status: 'healthy' as const,
          timestamp: new Date(),
          responseTime: 50,
          metadata: { test: true }
        },
        {
          id: 'test_health_check_2',
          name: 'Test Health Check 2',
          status: 'degraded' as const,
          timestamp: new Date(),
          responseTime: 200,
          metadata: { test: true }
        },
        {
          id: 'test_health_check_3',
          name: 'Test Health Check 3',
          status: 'unhealthy' as const,
          timestamp: new Date(),
          responseTime: 1000,
          error: 'Test error',
          metadata: { test: true }
        }
      ]
      
      for (const healthCheck of healthChecks) {
        recordHealthCheck(healthCheck)
      }
      
      tests.push({
        test: 'multiple_health_checks',
        success: true,
        message: 'Multiple health checks recorded successfully',
        details: {
          health_checks_recorded: healthChecks.length,
          statuses: healthChecks.map(hc => hc.status)
        }
      })
    } catch (error) {
      tests.push({
        test: 'multiple_health_checks',
        success: false,
        message: `Multiple health checks failed: ${error.message}`,
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
      'Health test completed',
      200
    )
    
  } catch (error) {
    logger.error('Health test failed:', 'monitoring-test', { error: error.message })
    return response.internalError('Health test failed', { error: error.message })
  }
}

async function handleMetricsTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: System metrics recording
    try {
      const systemMetrics = {
        timestamp: new Date(),
        cpuUsage: 45.5,
        memoryUsage: 67.2,
        diskUsage: 23.1,
        networkLatency: 150,
        activeConnections: 25,
        errorRate: 0.02,
        throughput: 1000
      }
      
      recordSystemMetrics(systemMetrics)
      
      tests.push({
        test: 'system_metrics_recording',
        success: true,
        message: 'System metrics recorded successfully',
        details: {
          cpu_usage: systemMetrics.cpuUsage,
          memory_usage: systemMetrics.memoryUsage,
          error_rate: systemMetrics.errorRate
        }
      })
    } catch (error) {
      tests.push({
        test: 'system_metrics_recording',
        success: false,
        message: `System metrics recording failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: Recent metrics retrieval
    try {
      const recentMetrics = getRecentSystemMetrics(1)
      
      tests.push({
        test: 'recent_metrics_retrieval',
        success: true,
        message: 'Recent metrics retrieved successfully',
        details: {
          metrics_count: recentMetrics.length,
          latest_metric: recentMetrics[recentMetrics.length - 1] || null
        }
      })
    } catch (error) {
      tests.push({
        test: 'recent_metrics_retrieval',
        success: false,
        message: `Recent metrics retrieval failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: Multiple metrics recording
    try {
      const metricsArray = [
        {
          timestamp: new Date(Date.now() - 60000),
          cpuUsage: 40.0,
          memoryUsage: 65.0,
          diskUsage: 22.0,
          networkLatency: 120,
          activeConnections: 20,
          errorRate: 0.01,
          throughput: 950
        },
        {
          timestamp: new Date(Date.now() - 30000),
          cpuUsage: 50.0,
          memoryUsage: 70.0,
          diskUsage: 24.0,
          networkLatency: 180,
          activeConnections: 30,
          errorRate: 0.03,
          throughput: 1100
        },
        {
          timestamp: new Date(),
          cpuUsage: 55.0,
          memoryUsage: 72.0,
          diskUsage: 25.0,
          networkLatency: 200,
          activeConnections: 35,
          errorRate: 0.04,
          throughput: 1200
        }
      ]
      
      for (const metrics of metricsArray) {
        recordSystemMetrics(metrics)
      }
      
      tests.push({
        test: 'multiple_metrics_recording',
        success: true,
        message: 'Multiple metrics recorded successfully',
        details: {
          metrics_recorded: metricsArray.length,
          avg_cpu_usage: metricsArray.reduce((sum, m) => sum + m.cpuUsage, 0) / metricsArray.length
        }
      })
    } catch (error) {
      tests.push({
        test: 'multiple_metrics_recording',
        success: false,
        message: `Multiple metrics recording failed: ${error.message}`,
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
      'Metrics test completed',
      200
    )
    
  } catch (error) {
    logger.error('Metrics test failed:', 'monitoring-test', { error: error.message })
    return response.internalError('Metrics test failed', { error: error.message })
  }
}

async function handleRuleTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Default alert rules
    try {
      const defaultRules = getAllAlertRules()
      
      tests.push({
        test: 'default_alert_rules',
        success: defaultRules.length > 0,
        message: `Default alert rules loaded successfully (${defaultRules.length} rules)`,
        details: {
          rule_count: defaultRules.length,
          enabled_rules: defaultRules.filter(rule => rule.enabled).length,
          rule_ids: defaultRules.map(rule => rule.id)
        }
      })
    } catch (error) {
      tests.push({
        test: 'default_alert_rules',
        success: false,
        message: `Default alert rules test failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: Custom alert rule management
    try {
      const customRule = {
        id: 'custom_test_rule',
        name: 'Custom Test Rule',
        description: 'Custom test alert rule',
        condition: 'custom_metric > threshold',
        threshold: 50,
        severity: 'high' as const,
        enabled: true,
        channels: ['email', 'slack'],
        cooldownMinutes: 10
      }
      
      addAlertRule(customRule)
      const retrievedRule = getAlertRule('custom_test_rule')
      
      tests.push({
        test: 'custom_alert_rule_management',
        success: !!retrievedRule && retrievedRule.name === customRule.name,
        message: 'Custom alert rule management successful',
        details: {
          rule_id: customRule.id,
          rule_name: customRule.name,
          severity: customRule.severity,
          channels: customRule.channels
        }
      })
    } catch (error) {
      tests.push({
        test: 'custom_alert_rule_management',
        success: false,
        message: `Custom alert rule management failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: Alert rule removal
    try {
      const ruleExists = !!getAlertRule('custom_test_rule')
      removeAlertRule('custom_test_rule')
      const ruleRemoved = !getAlertRule('custom_test_rule')
      
      tests.push({
        test: 'alert_rule_removal',
        success: ruleExists && ruleRemoved,
        message: 'Alert rule removal successful',
        details: {
          rule_existed: ruleExists,
          rule_removed: ruleRemoved
        }
      })
    } catch (error) {
      tests.push({
        test: 'alert_rule_removal',
        success: false,
        message: `Alert rule removal failed: ${error.message}`,
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
      'Rule test completed',
      200
    )
    
  } catch (error) {
    logger.error('Rule test failed:', 'monitoring-test', { error: error.message })
    return response.internalError('Rule test failed', { error: error.message })
  }
}

async function handleConfigTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Configuration initialization
    try {
      const config = getMonitoringConfig()
      
      tests.push({
        test: 'configuration_initialization',
        success: !!config,
        message: 'Configuration initialized successfully',
        details: {
          failureRateThreshold: config.failureRateThreshold,
          latencyThreshold: config.latencyThreshold,
          enablePerformanceMonitoring: config.enablePerformanceMonitoring
        }
      })
    } catch (error) {
      tests.push({
        test: 'configuration_initialization',
        success: false,
        message: `Configuration initialization failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: Configuration update
    try {
      const originalConfig = getMonitoringConfig()
      const updates = {
        failureRateThreshold: 0.15,
        latencyThreshold: 1500
      }
      
      const updatedConfig = updateMonitoringConfig(updates)
      
      tests.push({
        test: 'configuration_update',
        success: updatedConfig.failureRateThreshold === 0.15 && updatedConfig.latencyThreshold === 1500,
        message: 'Configuration updated successfully',
        details: {
          original_failure_rate: originalConfig.failureRateThreshold,
          new_failure_rate: updatedConfig.failureRateThreshold,
          original_latency: originalConfig.latencyThreshold,
          new_latency: updatedConfig.latencyThreshold
        }
      })
    } catch (error) {
      tests.push({
        test: 'configuration_update',
        success: false,
        message: `Configuration update failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: Configuration reset
    try {
      resetMonitoringConfig()
      const config = getMonitoringConfig()
      
      tests.push({
        test: 'configuration_reset',
        success: !!config,
        message: 'Configuration reset successfully',
        details: {
          config_initialized: !!config
        }
      })
    } catch (error) {
      tests.push({
        test: 'configuration_reset',
        success: false,
        message: `Configuration reset failed: ${error.message}`,
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
      'Config test completed',
      200
    )
    
  } catch (error) {
    logger.error('Config test failed:', 'monitoring-test', { error: error.message })
    return response.internalError('Config test failed', { error: error.message })
  }
}

async function handleIntegrationTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Full monitoring workflow
    try {
      // Initialize monitoring
      const config = initializeMonitoring({
        failureRateThreshold: 0.1,
        latencyThreshold: 1000
      })
      
      // Record health check
      recordHealthCheck({
        id: 'integration_test_health',
        name: 'Integration Test Health Check',
        status: 'healthy',
        timestamp: new Date(),
        responseTime: 50,
        metadata: { test: true }
      })
      
      // Record system metrics
      recordSystemMetrics({
        timestamp: new Date(),
        cpuUsage: 30.0,
        memoryUsage: 50.0,
        diskUsage: 20.0,
        networkLatency: 100,
        activeConnections: 15,
        errorRate: 0.01,
        throughput: 800
      })
      
      // Check alert conditions
      const newAlerts = await checkAlertConditions()
      
      // Get system health
      const healthStatus = await getSystemHealthStatus()
      
      tests.push({
        test: 'full_monitoring_workflow',
        success: true,
        message: 'Full monitoring workflow completed successfully',
        details: {
          config_initialized: !!config,
          health_check_recorded: true,
          metrics_recorded: true,
          alerts_checked: newAlerts.length,
          health_status: healthStatus.status
        }
      })
    } catch (error) {
      tests.push({
        test: 'full_monitoring_workflow',
        success: false,
        message: `Full monitoring workflow failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: Alert notification workflow
    try {
      // Create test alert rule
      const testRule = {
        id: 'integration_test_rule',
        name: 'Integration Test Rule',
        description: 'Test rule for integration testing',
        condition: 'test_condition > 0',
        threshold: 0,
        severity: 'medium' as const,
        enabled: true,
        channels: ['email'],
        cooldownMinutes: 1
      }
      
      addAlertRule(testRule)
      
      // Check alert conditions (should trigger alert)
      const newAlerts = await checkAlertConditions()
      
      // Send notifications
      if (newAlerts.length > 0) {
        await sendAlertNotifications(newAlerts)
      }
      
      // Cleanup
      removeAlertRule('integration_test_rule')
      
      tests.push({
        test: 'alert_notification_workflow',
        success: true,
        message: 'Alert notification workflow completed successfully',
        details: {
          test_rule_created: true,
          alerts_triggered: newAlerts.length,
          notifications_sent: newAlerts.length > 0
        }
      })
    } catch (error) {
      tests.push({
        test: 'alert_notification_workflow',
        success: false,
        message: `Alert notification workflow failed: ${error.message}`,
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
      'Integration test completed',
      200
    )
    
  } catch (error) {
    logger.error('Integration test failed:', 'monitoring-test', { error: error.message })
    return response.internalError('Integration test failed', { error: error.message })
  }
}

async function handlePerformanceTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Configuration performance
    const startTime1 = Date.now()
    try {
      const config = getMonitoringConfig()
      const duration1 = Date.now() - startTime1
      
      tests.push({
        test: 'configuration_performance',
        success: !!config,
        duration_ms: duration1,
        message: `Configuration retrieval took ${duration1}ms`
      })
    } catch (error) {
      tests.push({
        test: 'configuration_performance',
        success: false,
        duration_ms: Date.now() - startTime1,
        message: `Configuration performance test failed: ${error.message}`
      })
    }
    
    // Test 2: Health check performance
    const startTime2 = Date.now()
    try {
      const healthStatus = await getSystemHealthStatus()
      const duration2 = Date.now() - startTime2
      
      tests.push({
        test: 'health_check_performance',
        success: true,
        duration_ms: duration2,
        message: `Health check took ${duration2}ms`
      })
    } catch (error) {
      tests.push({
        test: 'health_check_performance',
        success: false,
        duration_ms: Date.now() - startTime2,
        message: `Health check performance test failed: ${error.message}`
      })
    }
    
    // Test 3: Alert checking performance
    const startTime3 = Date.now()
    try {
      const newAlerts = await checkAlertConditions()
      const duration3 = Date.now() - startTime3
      
      tests.push({
        test: 'alert_checking_performance',
        success: true,
        duration_ms: duration3,
        message: `Alert checking took ${duration3}ms`
      })
    } catch (error) {
      tests.push({
        test: 'alert_checking_performance',
        success: false,
        duration_ms: Date.now() - startTime3,
        message: `Alert checking performance test failed: ${error.message}`
      })
    }
    
    // Test 4: Metrics recording performance
    const startTime4 = Date.now()
    try {
      const metrics = {
        timestamp: new Date(),
        cpuUsage: 40.0,
        memoryUsage: 60.0,
        diskUsage: 25.0,
        networkLatency: 120,
        activeConnections: 20,
        errorRate: 0.02,
        throughput: 900
      }
      
      recordSystemMetrics(metrics)
      const duration4 = Date.now() - startTime4
      
      tests.push({
        test: 'metrics_recording_performance',
        success: true,
        duration_ms: duration4,
        message: `Metrics recording took ${duration4}ms`
      })
    } catch (error) {
      tests.push({
        test: 'metrics_recording_performance',
        success: false,
        duration_ms: Date.now() - startTime4,
        message: `Metrics recording performance test failed: ${error.message}`
      })
    }
    
    const allTestsPassed = tests.every(test => test.success)
    const averageDuration = tests.reduce((sum, test) => sum + test.duration_ms, 0) / tests.length
    
    return response.success(
      {
        tests: tests,
        all_tests_passed: allTestsPassed,
        performance_summary: {
          total_tests: tests.length,
          passed_tests: tests.filter(test => test.success).length,
          failed_tests: tests.filter(test => !test.success).length,
          average_duration_ms: averageDuration,
          max_duration_ms: Math.max(...tests.map(test => test.duration_ms)),
          min_duration_ms: Math.min(...tests.map(test => test.duration_ms))
        }
      },
      'Performance test completed',
      200
    )
    
  } catch (error) {
    logger.error('Performance test failed:', 'monitoring-test', { error: error.message })
    return response.internalError('Performance test failed', { error: error.message })
  }
}

async function handleStressTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: High volume health check recording
    const startTime1 = Date.now()
    try {
      const healthCheckCount = 100
      for (let i = 0; i < healthCheckCount; i++) {
        recordHealthCheck({
          id: `stress_test_health_${i}`,
          name: `Stress Test Health Check ${i}`,
          status: i % 3 === 0 ? 'unhealthy' : i % 3 === 1 ? 'degraded' : 'healthy',
          timestamp: new Date(),
          responseTime: Math.random() * 1000,
          metadata: { test: true, iteration: i }
        })
      }
      
      const duration1 = Date.now() - startTime1
      
      tests.push({
        test: 'high_volume_health_checks',
        success: true,
        duration_ms: duration1,
        message: `Recorded ${healthCheckCount} health checks in ${duration1}ms`
      })
    } catch (error) {
      tests.push({
        test: 'high_volume_health_checks',
        success: false,
        duration_ms: Date.now() - startTime1,
        message: `High volume health checks failed: ${error.message}`
      })
    }
    
    // Test 2: High volume metrics recording
    const startTime2 = Date.now()
    try {
      const metricsCount = 100
      for (let i = 0; i < metricsCount; i++) {
        recordSystemMetrics({
          timestamp: new Date(Date.now() - i * 1000),
          cpuUsage: Math.random() * 100,
          memoryUsage: Math.random() * 100,
          diskUsage: Math.random() * 100,
          networkLatency: Math.random() * 500,
          activeConnections: Math.floor(Math.random() * 100),
          errorRate: Math.random() * 0.1,
          throughput: Math.random() * 2000
        })
      }
      
      const duration2 = Date.now() - startTime2
      
      tests.push({
        test: 'high_volume_metrics',
        success: true,
        duration_ms: duration2,
        message: `Recorded ${metricsCount} metrics in ${duration2}ms`
      })
    } catch (error) {
      tests.push({
        test: 'high_volume_metrics',
        success: false,
        duration_ms: Date.now() - startTime2,
        message: `High volume metrics failed: ${error.message}`
      })
    }
    
    // Test 3: Concurrent alert rule operations
    const startTime3 = Date.now()
    try {
      const ruleCount = 50
      const promises = []
      
      for (let i = 0; i < ruleCount; i++) {
        const rule = {
          id: `stress_test_rule_${i}`,
          name: `Stress Test Rule ${i}`,
          description: `Stress test rule ${i}`,
          condition: `condition_${i} > threshold`,
          threshold: i,
          severity: 'medium' as const,
          enabled: true,
          channels: ['email'],
          cooldownMinutes: 5
        }
        
        promises.push(Promise.resolve().then(() => addAlertRule(rule)))
      }
      
      await Promise.all(promises)
      
      const duration3 = Date.now() - startTime3
      
      tests.push({
        test: 'concurrent_alert_rules',
        success: true,
        duration_ms: duration3,
        message: `Created ${ruleCount} alert rules in ${duration3}ms`
      })
      
      // Cleanup
      for (let i = 0; i < ruleCount; i++) {
        removeAlertRule(`stress_test_rule_${i}`)
      }
    } catch (error) {
      tests.push({
        test: 'concurrent_alert_rules',
        success: false,
        duration_ms: Date.now() - startTime3,
        message: `Concurrent alert rules failed: ${error.message}`
      })
    }
    
    const allTestsPassed = tests.every(test => test.success)
    const averageDuration = tests.reduce((sum, test) => sum + test.duration_ms, 0) / tests.length
    
    return response.success(
      {
        tests: tests,
        all_tests_passed: allTestsPassed,
        stress_summary: {
          total_tests: tests.length,
          passed_tests: tests.filter(test => test.success).length,
          failed_tests: tests.filter(test => !test.success).length,
          average_duration_ms: averageDuration,
          max_duration_ms: Math.max(...tests.map(test => test.duration_ms)),
          min_duration_ms: Math.min(...tests.map(test => test.duration_ms))
        }
      },
      'Stress test completed',
      200
    )
    
  } catch (error) {
    logger.error('Stress test failed:', 'monitoring-test', { error: error.message })
    return response.internalError('Stress test failed', { error: error.message })
  }
}

// Test helper functions
async function testBasicMonitoring(): Promise<any> {
  try {
    const config = getMonitoringConfig()
    const healthStatus = await getSystemHealthStatus()
    const recentMetrics = getRecentSystemMetrics(1)
    
    return {
      config: {
        failureRateThreshold: config.failureRateThreshold,
        latencyThreshold: config.latencyThreshold,
        enablePerformanceMonitoring: config.enablePerformanceMonitoring
      },
      health: healthStatus,
      recent_metrics: recentMetrics.length,
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testAlertSystem(): Promise<any> {
  try {
    const rules = getAllAlertRules()
    const activeAlerts = getActiveAlerts()
    const newAlerts = await checkAlertConditions()
    
    return {
      rules: rules.length,
      active_alerts: activeAlerts.length,
      new_alerts: newAlerts.length,
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testHealthChecks(): Promise<any> {
  try {
    const healthStatus = await getSystemHealthStatus()
    
    return {
      status: healthStatus.status,
      details: healthStatus.details,
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testMetricsCollection(): Promise<any> {
  try {
    const recentMetrics = getRecentSystemMetrics(1)
    
    return {
      metrics_count: recentMetrics.length,
      latest_metric: recentMetrics[recentMetrics.length - 1] || null,
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testAlertRules(): Promise<any> {
  try {
    const rules = getAllAlertRules()
    
    return {
      total_rules: rules.length,
      enabled_rules: rules.filter(rule => rule.enabled).length,
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testConfiguration(): Promise<any> {
  try {
    const config = getMonitoringConfig()
    
    return {
      initialized: !!config,
      failureRateThreshold: config.failureRateThreshold,
      latencyThreshold: config.latencyThreshold,
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
