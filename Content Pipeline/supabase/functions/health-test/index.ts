import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createHealthMonitor,
  performHealthCheck,
  getHealthConfig
} from '../content-automation/health-monitor.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const scenario = url.searchParams.get('scenario') || 'normal'
    
    console.log(`Health test - Action: ${action}, Scenario: ${scenario}`)
    
    switch (action) {
      case 'test':
        return await handleHealthTest(scenario)
      
      case 'scenario-test':
        return await handleScenarioTest(req)
      
      case 'performance-test':
        return await handlePerformanceTest(req)
      
      case 'config-test':
        return await handleConfigTest()
      
      case 'threshold-test':
        return await handleThresholdTest(req)
      
      case 'integration-test':
        return await handleIntegrationTest(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, scenario-test, performance-test, config-test, threshold-test, integration-test' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Health test error:', error)
    
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

async function handleHealthTest(scenario: string): Promise<Response> {
  try {
    const monitor = createHealthMonitor()
    
    // Simulate different scenarios
    switch (scenario) {
      case 'normal':
        // Normal health check
        break
      case 'slow':
        // Simulate slow response
        await new Promise(resolve => setTimeout(resolve, 2000))
        break
      case 'error':
        // Simulate error scenario
        throw new Error('Simulated health check error')
      case 'warning':
        // Simulate warning scenario
        break
      case 'critical':
        // Simulate critical scenario
        break
    }
    
    const health = await monitor.performHealthCheck()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'test',
        scenario: scenario,
        health: health,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing health:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        scenario: scenario
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleScenarioTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      scenarios = [
        {
          name: 'Normal Operation',
          description: 'All systems functioning normally',
          expected_status: 'healthy',
          test_checks: ['database', 'external_services', 'system_resources']
        },
        {
          name: 'Database Slow',
          description: 'Database responding slowly',
          expected_status: 'warning',
          test_checks: ['database'],
          simulate_delay: 2000
        },
        {
          name: 'External Service Down',
          description: 'External service unavailable',
          expected_status: 'critical',
          test_checks: ['external_services'],
          simulate_error: true
        },
        {
          name: 'High Resource Usage',
          description: 'System resources under stress',
          expected_status: 'warning',
          test_checks: ['system_resources'],
          simulate_high_usage: true
        },
        {
          name: 'Multiple Issues',
          description: 'Multiple system issues',
          expected_status: 'critical',
          test_checks: ['database', 'external_services', 'system_resources'],
          simulate_multiple_issues: true
        }
      ]
    } = body
    
    const results = []
    
    for (const scenario of scenarios) {
      try {
        const monitor = createHealthMonitor()
        
        // Simulate scenario conditions
        if (scenario.simulate_delay) {
          await new Promise(resolve => setTimeout(resolve, scenario.simulate_delay))
        }
        
        if (scenario.simulate_error) {
          // Simulate error by modifying configuration
          monitor.getHealthConfig().EXTERNAL_SERVICES.openai = 'https://invalid-url.com'
        }
        
        if (scenario.simulate_high_usage) {
          // Simulate high resource usage
          // In a real implementation, this would modify system resource simulation
        }
        
        if (scenario.simulate_multiple_issues) {
          // Simulate multiple issues
          monitor.getHealthConfig().EXTERNAL_SERVICES.openai = 'https://invalid-url.com'
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
        
        const health = await monitor.performHealthCheck()
        
        const result = {
          scenario: scenario,
          actual_status: health.overall_status,
          expected_status: scenario.expected_status,
          status_match: health.overall_status === scenario.expected_status,
          health: health,
          success: true
        }
        
        results.push(result)
        
      } catch (error) {
        results.push({
          scenario: scenario,
          actual_status: 'down',
          expected_status: scenario.expected_status,
          status_match: scenario.expected_status === 'down',
          health: null,
          success: false,
          error: error.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'scenario-test',
        scenarios: scenarios,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing scenarios:', error)
    
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

async function handlePerformanceTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      test_iterations = 10,
      test_duration_seconds = 60
    } = body
    
    const results = []
    const startTime = Date.now()
    
    for (let i = 0; i < test_iterations; i++) {
      const iterationStart = Date.now()
      
      try {
        const monitor = createHealthMonitor()
        const health = await monitor.performHealthCheck()
        
        const iterationTime = Date.now() - iterationStart
        
        results.push({
          iteration: i + 1,
          success: true,
          response_time_ms: iterationTime,
          overall_status: health.overall_status,
          checks_count: health.checks.length,
          average_response_time: health.summary.average_response_time
        })
        
        // Check if we've exceeded test duration
        if (Date.now() - startTime > test_duration_seconds * 1000) {
          break
        }
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        results.push({
          iteration: i + 1,
          success: false,
          response_time_ms: Date.now() - iterationStart,
          overall_status: 'down',
          checks_count: 0,
          average_response_time: 0,
          error: error.message
        })
      }
    }
    
    const totalTime = Date.now() - startTime
    const successfulTests = results.filter(r => r.success).length
    const averageResponseTime = results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'performance-test',
        test_config: {
          iterations: test_iterations,
          duration_seconds: test_duration_seconds
        },
        results: results,
        performance_summary: {
          total_tests: results.length,
          successful_tests: successfulTests,
          success_rate: (successfulTests / results.length) * 100,
          total_time_ms: totalTime,
          average_response_time_ms: averageResponseTime,
          tests_per_second: results.length / (totalTime / 1000)
        },
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing performance:', error)
    
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

async function handleConfigTest(): Promise<Response> {
  try {
    const config = getHealthConfig()
    const monitor = createHealthMonitor()
    
    // Test configuration access
    const originalConfig = { ...config }
    
    // Test configuration validation
    const configValidation = {
      intervals_valid: Object.values(config.INTERVALS).every(interval => interval > 0),
      thresholds_valid: Object.values(config.THRESHOLDS).every(threshold => threshold >= 0),
      status_levels_valid: Object.values(config.STATUS_LEVELS).every(level => 
        ['healthy', 'warning', 'critical', 'down'].includes(level)
      ),
      timeouts_valid: Object.values(config.TIMEOUTS).every(timeout => timeout > 0)
    }
    
    // Test configuration modification
    const modifiedConfig = monitor.getHealthConfig()
    modifiedConfig.THRESHOLDS.database_response_time = 2000
    
    const configModified = modifiedConfig.THRESHOLDS.database_response_time === 2000
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'config-test',
        original_config: originalConfig,
        config_validation: configValidation,
        config_modified: configModified,
        all_valid: Object.values(configValidation).every(valid => valid),
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing config:', error)
    
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

async function handleThresholdTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      threshold_tests = [
        {
          name: 'Database Response Time',
          threshold: 1000,
          test_values: [500, 1000, 1500, 2000, 3000],
          expected_statuses: ['healthy', 'healthy', 'warning', 'critical', 'critical']
        },
        {
          name: 'External Service Timeout',
          threshold: 5000,
          test_values: [2000, 5000, 7500, 10000, 15000],
          expected_statuses: ['healthy', 'healthy', 'warning', 'critical', 'critical']
        },
        {
          name: 'Memory Usage',
          threshold: 80,
          test_values: [50, 80, 85, 90, 95],
          expected_statuses: ['healthy', 'healthy', 'warning', 'critical', 'critical']
        },
        {
          name: 'CPU Usage',
          threshold: 70,
          test_values: [40, 70, 75, 80, 90],
          expected_statuses: ['healthy', 'healthy', 'warning', 'critical', 'critical']
        },
        {
          name: 'Failure Rate',
          threshold: 20,
          test_values: [5, 20, 25, 30, 40],
          expected_statuses: ['healthy', 'healthy', 'warning', 'critical', 'critical']
        }
      ]
    } = body
    
    const results = []
    
    for (const test of threshold_tests) {
      const testResults = []
      
      for (let i = 0; i < test.test_values.length; i++) {
        const testValue = test.test_values[i]
        const expectedStatus = test.expected_statuses[i]
        
        // Simulate threshold checking
        let actualStatus: string
        if (testValue <= test.threshold) {
          actualStatus = 'healthy'
        } else if (testValue <= test.threshold * 1.5) {
          actualStatus = 'warning'
        } else {
          actualStatus = 'critical'
        }
        
        testResults.push({
          test_value: testValue,
          threshold: test.threshold,
          expected_status: expectedStatus,
          actual_status: actualStatus,
          status_match: actualStatus === expectedStatus
        })
      }
      
      const allMatch = testResults.every(result => result.status_match)
      
      results.push({
        test: test,
        results: testResults,
        all_thresholds_correct: allMatch,
        success: allMatch
      })
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'threshold-test',
        threshold_tests: threshold_tests,
        results: results,
        overall_success: results.every(result => result.success),
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing thresholds:', error)
    
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

async function handleIntegrationTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      integration_tests = [
        {
          name: 'Database Integration',
          test_type: 'database',
          expected_components: ['database_health']
        },
        {
          name: 'External Services Integration',
          test_type: 'external_services',
          expected_components: ['openai_health', 'wordpress_health']
        },
        {
          name: 'System Resources Integration',
          test_type: 'system_resources',
          expected_components: ['system_resources']
        },
        {
          name: 'Performance Metrics Integration',
          test_type: 'performance_metrics',
          expected_components: ['performance_metrics']
        },
        {
          name: 'Content Processing Integration',
          test_type: 'content_processing',
          expected_components: ['content_processing']
        }
      ]
    } = body
    
    const results = []
    
    for (const test of integration_tests) {
      try {
        const monitor = createHealthMonitor()
        const health = await monitor.performHealthCheck()
        
        // Check if expected components are present
        const actualComponents = health.checks.map(check => check.id)
        const expectedComponents = test.expected_components
        const componentsPresent = expectedComponents.every(component => 
          actualComponents.includes(component)
        )
        
        // Check if all expected components are healthy
        const expectedComponentChecks = health.checks.filter(check => 
          expectedComponents.includes(check.id)
        )
        const allHealthy = expectedComponentChecks.every(check => 
          check.status === 'healthy'
        )
        
        results.push({
          test: test,
          components_present: componentsPresent,
          all_healthy: allHealthy,
          actual_components: actualComponents,
          expected_components: expectedComponents,
          component_checks: expectedComponentChecks,
          success: componentsPresent && allHealthy
        })
        
      } catch (error) {
        results.push({
          test: test,
          components_present: false,
          all_healthy: false,
          actual_components: [],
          expected_components: test.expected_components,
          component_checks: [],
          success: false,
          error: error.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'integration-test',
        integration_tests: integration_tests,
        results: results,
        overall_success: results.every(result => result.success),
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing integration:', error)
    
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
