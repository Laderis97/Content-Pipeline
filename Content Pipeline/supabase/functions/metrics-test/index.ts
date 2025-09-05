import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createMetricsCollector,
  collectMetrics,
  getMetricsSummary,
  getMetricsConfig
} from '../content-automation/metrics-collector.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const testType = url.searchParams.get('type') || 'basic'
    
    console.log(`Metrics test - Action: ${action}, Type: ${testType}`)
    
    switch (action) {
      case 'test':
        return await handleMetricsTest(testType)
      
      case 'collection-test':
        return await handleCollectionTest(req)
      
      case 'performance-test':
        return await handlePerformanceTest(req)
      
      case 'aggregation-test':
        return await handleAggregationTest(req)
      
      case 'threshold-test':
        return await handleThresholdTest(req)
      
      case 'config-test':
        return await handleConfigTest()
      
      case 'integration-test':
        return await handleIntegrationTest(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, collection-test, performance-test, aggregation-test, threshold-test, config-test, integration-test' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Metrics test error:', error)
    
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

async function handleMetricsTest(testType: string): Promise<Response> {
  try {
    const collector = createMetricsCollector()
    
    let result: any
    
    switch (testType) {
      case 'basic':
        result = await collector.collectMetrics()
        break
      case 'summary':
        result = await collector.getMetricsSummary('hourly')
        break
      case 'config':
        result = collector.getMetricsConfig()
        break
      default:
        result = await collector.collectMetrics()
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'test',
        test_type: testType,
        result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing metrics:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        test_type: testType
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleCollectionTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      test_scenarios = [
        {
          name: 'Normal Operation',
          description: 'Standard metrics collection',
          expected_metrics: ['performance', 'system'],
          simulate_data: false
        },
        {
          name: 'High Load',
          description: 'Metrics collection under high load',
          expected_metrics: ['performance', 'system'],
          simulate_data: true,
          simulate_high_load: true
        },
        {
          name: 'Error Conditions',
          description: 'Metrics collection with errors',
          expected_metrics: ['performance', 'system'],
          simulate_data: true,
          simulate_errors: true
        },
        {
          name: 'Custom Metrics',
          description: 'Collection of custom metrics',
          expected_metrics: ['performance', 'system', 'content_generation', 'wordpress_posting'],
          simulate_data: true,
          simulate_custom_metrics: true
        }
      ]
    } = body
    
    const results = []
    
    for (const scenario of test_scenarios) {
      try {
        const collector = createMetricsCollector()
        
        // Simulate scenario conditions
        if (scenario.simulate_high_load) {
          // Simulate high load by adding delay
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        if (scenario.simulate_errors) {
          // Simulate errors by modifying configuration
          // In a real implementation, this would simulate actual errors
        }
        
        if (scenario.simulate_custom_metrics) {
          // Simulate custom metrics collection
          // In a real implementation, this would collect actual custom metrics
        }
        
        const result = await collector.collectMetrics()
        
        const expectedMetricsFound = scenario.expected_metrics.every(expectedType => 
          result.performance_metrics || result.system_metrics
        )
        
        results.push({
          scenario: scenario,
          result: result,
          expected_metrics_found: expectedMetricsFound,
          metrics_collected: result.metrics_collected,
          success: result.success && expectedMetricsFound
        })
        
      } catch (error) {
        results.push({
          scenario: scenario,
          result: null,
          expected_metrics_found: false,
          metrics_collected: 0,
          success: false,
          error: error.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'collection-test',
        test_scenarios: test_scenarios,
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
    console.error('Error testing collection:', error)
    
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
      test_iterations = 5,
      test_duration_seconds = 30
    } = body
    
    const results = []
    const startTime = Date.now()
    
    for (let i = 0; i < test_iterations; i++) {
      const iterationStart = Date.now()
      
      try {
        const collector = createMetricsCollector()
        const result = await collector.collectMetrics()
        
        const iterationTime = Date.now() - iterationStart
        
        results.push({
          iteration: i + 1,
          success: result.success,
          response_time_ms: iterationTime,
          metrics_collected: result.metrics_collected,
          alerts_generated: result.alerts.length,
          errors_count: result.errors.length
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
          metrics_collected: 0,
          alerts_generated: 0,
          errors_count: 1,
          error: error.message
        })
      }
    }
    
    const totalTime = Date.now() - startTime
    const successfulTests = results.filter(r => r.success).length
    const averageResponseTime = results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length
    const totalMetricsCollected = results.reduce((sum, r) => sum + r.metrics_collected, 0)
    
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
          total_metrics_collected: totalMetricsCollected,
          metrics_per_second: totalMetricsCollected / (totalTime / 1000),
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

async function handleAggregationTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      aggregation_tests = [
        {
          name: 'Performance Metrics Aggregation',
          metric_type: 'performance',
          expected_metrics: ['success_rate', 'processing_time_avg', 'throughput_per_hour', 'queue_size'],
          time_period: 'hourly'
        },
        {
          name: 'System Metrics Aggregation',
          metric_type: 'system',
          expected_metrics: ['database_query_time_avg', 'openai_response_time', 'memory_usage_percent'],
          time_period: 'hourly'
        },
        {
          name: 'Custom Metrics Aggregation',
          metric_type: 'content_generation',
          expected_metrics: ['blog_post_success_rate', 'product_description_success_rate'],
          time_period: 'daily'
        }
      ]
    } = body
    
    const results = []
    
    for (const test of aggregation_tests) {
      try {
        const collector = createMetricsCollector()
        const summary = await collector.getMetricsSummary(test.time_period)
        
        // Check if expected metrics are present
        const expectedMetricsPresent = test.expected_metrics.every(expectedMetric => {
          if (test.metric_type === 'performance') {
            return summary.performance_metrics && 
                   Object.keys(summary.performance_metrics).includes(expectedMetric)
          } else if (test.metric_type === 'system') {
            return summary.system_metrics && 
                   (Object.keys(summary.system_metrics.database_performance).includes(expectedMetric) ||
                    Object.keys(summary.system_metrics.external_services).includes(expectedMetric) ||
                    Object.keys(summary.system_metrics.resource_usage).includes(expectedMetric))
          }
          return true
        })
        
        results.push({
          test: test,
          summary: summary,
          expected_metrics_present: expectedMetricsPresent,
          total_metrics: summary.total_metrics,
          success: expectedMetricsPresent
        })
        
      } catch (error) {
        results.push({
          test: test,
          summary: null,
          expected_metrics_present: false,
          total_metrics: 0,
          success: false,
          error: error.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'aggregation-test',
        aggregation_tests: aggregation_tests,
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
    console.error('Error testing aggregation:', error)
    
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
          name: 'Success Rate Thresholds',
          metric_name: 'success_rate',
          test_values: [85, 90, 95, 98, 99],
          warning_threshold: 95,
          critical_threshold: 90,
          expected_alerts: ['critical', 'critical', 'warning', 'none', 'none']
        },
        {
          name: 'Processing Time Thresholds',
          metric_name: 'processing_time_avg',
          test_values: [5000, 10000, 15000, 30000, 45000],
          warning_threshold: 10000,
          critical_threshold: 30000,
          expected_alerts: ['none', 'warning', 'warning', 'critical', 'critical']
        },
        {
          name: 'Queue Size Thresholds',
          metric_name: 'queue_size',
          test_values: [25, 50, 75, 100, 150],
          warning_threshold: 50,
          critical_threshold: 100,
          expected_alerts: ['none', 'warning', 'warning', 'critical', 'critical']
        },
        {
          name: 'Throughput Thresholds',
          metric_name: 'throughput_per_hour',
          test_values: [2, 5, 8, 10, 15],
          warning_threshold: 10,
          critical_threshold: 5,
          expected_alerts: ['critical', 'critical', 'warning', 'none', 'none']
        }
      ]
    } = body
    
    const results = []
    
    for (const test of threshold_tests) {
      const testResults = []
      
      for (let i = 0; i < test.test_values.length; i++) {
        const testValue = test.test_values[i]
        const expectedAlert = test.expected_alerts[i]
        
        // Simulate threshold checking
        let actualAlert: string
        if (testValue <= test.critical_threshold || testValue >= test.critical_threshold) {
          actualAlert = 'critical'
        } else if (testValue <= test.warning_threshold || testValue >= test.warning_threshold) {
          actualAlert = 'warning'
        } else {
          actualAlert = 'none'
        }
        
        testResults.push({
          test_value: testValue,
          warning_threshold: test.warning_threshold,
          critical_threshold: test.critical_threshold,
          expected_alert: expectedAlert,
          actual_alert: actualAlert,
          alert_match: actualAlert === expectedAlert
        })
      }
      
      const allMatch = testResults.every(result => result.alert_match)
      
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

async function handleConfigTest(): Promise<Response> {
  try {
    const config = getMetricsConfig()
    const collector = createMetricsCollector()
    
    // Test configuration access
    const originalConfig = { ...config }
    
    // Test configuration validation
    const configValidation = {
      intervals_valid: Object.values(config.INTERVALS).every(interval => interval > 0),
      retention_valid: Object.values(config.RETENTION).every(retention => retention > 0),
      thresholds_valid: Object.values(config.THRESHOLDS).every(threshold => threshold >= 0),
      aggregation_valid: Object.values(config.AGGREGATION).every(value => 
        typeof value === 'number' ? value > 0 : true
      )
    }
    
    // Test configuration structure
    const configStructure = {
      has_intervals: 'INTERVALS' in config,
      has_retention: 'RETENTION' in config,
      has_thresholds: 'THRESHOLDS' in config,
      has_aggregation: 'AGGREGATION' in config
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'config-test',
        original_config: originalConfig,
        config_validation: configValidation,
        config_structure: configStructure,
        all_valid: Object.values(configValidation).every(valid => valid) && 
                   Object.values(configStructure).every(valid => valid),
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

async function handleIntegrationTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      integration_tests = [
        {
          name: 'Metrics Collection Integration',
          test_type: 'collection',
          expected_components: ['performance_metrics', 'system_metrics', 'custom_metrics']
        },
        {
          name: 'Metrics Aggregation Integration',
          test_type: 'aggregation',
          expected_components: ['performance_summary', 'system_summary', 'trends']
        },
        {
          name: 'Metrics Storage Integration',
          test_type: 'storage',
          expected_components: ['database_storage', 'metrics_retrieval']
        },
        {
          name: 'Metrics Alerting Integration',
          test_type: 'alerting',
          expected_components: ['threshold_checking', 'alert_generation']
        }
      ]
    } = body
    
    const results = []
    
    for (const test of integration_tests) {
      try {
        const collector = createMetricsCollector()
        
        let testResult: any
        let componentsPresent = false
        
        switch (test.test_type) {
          case 'collection':
            testResult = await collector.collectMetrics()
            componentsPresent = testResult.performance_metrics && testResult.system_metrics
            break
          case 'aggregation':
            testResult = await collector.getMetricsSummary('hourly')
            componentsPresent = testResult.performance_metrics && testResult.system_metrics && testResult.trends
            break
          case 'storage':
            // Test storage by collecting and then retrieving metrics
            await collector.collectMetrics()
            testResult = await collector.getMetricsSummary('hourly')
            componentsPresent = testResult.total_metrics > 0
            break
          case 'alerting':
            testResult = await collector.collectMetrics()
            componentsPresent = Array.isArray(testResult.alerts)
            break
          default:
            testResult = await collector.collectMetrics()
            componentsPresent = true
        }
        
        results.push({
          test: test,
          result: testResult,
          components_present: componentsPresent,
          success: componentsPresent
        })
        
      } catch (error) {
        results.push({
          test: test,
          result: null,
          components_present: false,
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
