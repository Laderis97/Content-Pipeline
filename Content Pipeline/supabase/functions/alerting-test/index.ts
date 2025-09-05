import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createAlertingSystem,
  checkFailureRateAndAlert,
  getAlertingConfig
} from '../content-automation/alerting-system.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const failureRate = parseFloat(url.searchParams.get('failure_rate') || '0.25')
    const totalJobs = parseInt(url.searchParams.get('total_jobs') || '100')
    const timeWindow = url.searchParams.get('time_window') || 'daily'
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    console.log(`Alerting test - Action: ${action}, Failure rate: ${failureRate}, Total jobs: ${totalJobs}`)
    
    switch (action) {
      case 'test':
        return await handleAlertingTest(failureRate, totalJobs, timeWindow, date)
      
      case 'config':
        return await handleConfigTest()
      
      case 'simulate':
        return await handleSimulationTest(req)
      
      case 'thresholds':
        return await handleThresholdsTest()
      
      case 'notifications':
        return await handleNotificationsTest(req)
      
      case 'escalation':
        return await handleEscalationTest(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, config, simulate, thresholds, notifications, escalation' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Alerting test error:', error)
    
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
})

async function handleAlertingTest(
  failureRate: number,
  totalJobs: number,
  timeWindow: string,
  date: string
): Promise<Response> {
  try {
    const failedJobs = Math.round(totalJobs * failureRate)
    
    const result = await checkFailureRateAndAlert(
      failureRate,
      totalJobs,
      failedJobs,
      timeWindow,
      date
    )
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'test',
        input: {
          failure_rate: failureRate,
          total_jobs: totalJobs,
          failed_jobs: failedJobs,
          time_window: timeWindow,
          date: date
        },
        result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing alerting:', error)
    
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
    const config = getAlertingConfig()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'config',
        config: config,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting config:', error)
    
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

async function handleSimulationTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      scenarios = [
        { failure_rate: 0.10, total_jobs: 50, time_window: 'daily', description: 'Low failure rate - no alert' },
        { failure_rate: 0.18, total_jobs: 100, time_window: 'daily', description: 'Warning level failure rate' },
        { failure_rate: 0.25, total_jobs: 200, time_window: 'daily', description: 'Critical level failure rate' },
        { failure_rate: 0.35, total_jobs: 150, time_window: 'daily', description: 'Emergency level failure rate' },
        { failure_rate: 0.12, total_jobs: 80, time_window: 'hourly', description: 'Hourly warning level' },
        { failure_rate: 0.22, total_jobs: 120, time_window: 'weekly', description: 'Weekly critical level' }
      ]
    } = body
    
    const results = []
    
    for (const scenario of scenarios) {
      const failedJobs = Math.round(scenario.total_jobs * scenario.failure_rate)
      
      try {
        const result = await checkFailureRateAndAlert(
          scenario.failure_rate,
          scenario.total_jobs,
          failedJobs,
          scenario.time_window,
          new Date().toISOString().split('T')[0]
        )
        
        results.push({
          scenario: scenario,
          result: result,
          success: true
        })
      } catch (error) {
        results.push({
          scenario: scenario,
          result: null,
          success: false,
          error: error.message
        })
      }
      
      // Small delay between scenarios
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'simulate',
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
    console.error('Error simulating scenarios:', error)
    
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

async function handleThresholdsTest(): Promise<Response> {
  try {
    const config = getAlertingConfig()
    const thresholds = config.FAILURE_RATE_THRESHOLDS
    
    const testCases = [
      {
        failure_rate: 0.10,
        expected_severity: null,
        description: 'Below warning threshold'
      },
      {
        failure_rate: 0.15,
        expected_severity: 'warning',
        description: 'At warning threshold'
      },
      {
        failure_rate: 0.18,
        expected_severity: 'warning',
        description: 'Above warning, below critical'
      },
      {
        failure_rate: 0.20,
        expected_severity: 'critical',
        description: 'At critical threshold (PRD requirement)'
      },
      {
        failure_rate: 0.25,
        expected_severity: 'critical',
        description: 'Above critical, below emergency'
      },
      {
        failure_rate: 0.30,
        expected_severity: 'emergency',
        description: 'At emergency threshold'
      },
      {
        failure_rate: 0.40,
        expected_severity: 'emergency',
        description: 'Above emergency threshold'
      }
    ]
    
    const results = []
    
    for (const testCase of testCases) {
      const totalJobs = 100
      const failedJobs = Math.round(totalJobs * testCase.failure_rate)
      
      try {
        const result = await checkFailureRateAndAlert(
          testCase.failure_rate,
          totalJobs,
          failedJobs,
          'daily',
          new Date().toISOString().split('T')[0]
        )
        
        const actualSeverity = result.alerts.length > 0 ? result.alerts[0].severity : null
        
        results.push({
          test_case: testCase,
          expected_severity: testCase.expected_severity,
          actual_severity: actualSeverity,
          alerts_generated: result.alerts_generated,
          correct: actualSeverity === testCase.expected_severity,
          result: result
        })
      } catch (error) {
        results.push({
          test_case: testCase,
          expected_severity: testCase.expected_severity,
          actual_severity: null,
          alerts_generated: 0,
          correct: false,
          error: error.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'thresholds',
        thresholds: thresholds,
        test_cases: testCases,
        results: results,
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

async function handleNotificationsTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      test_notifications = [
        { severity: 'warning', channels: ['email'] },
        { severity: 'critical', channels: ['email', 'slack'] },
        { severity: 'emergency', channels: ['email', 'slack', 'webhook'] }
      ]
    } = body
    
    const results = []
    
    for (const test of test_notifications) {
      const failureRate = test.severity === 'warning' ? 0.18 : 
                         test.severity === 'critical' ? 0.25 : 0.35
      const totalJobs = 100
      const failedJobs = Math.round(totalJobs * failureRate)
      
      try {
        const result = await checkFailureRateAndAlert(
          failureRate,
          totalJobs,
          failedJobs,
          'daily',
          new Date().toISOString().split('T')[0]
        )
        
        results.push({
          test: test,
          failure_rate: failureRate,
          result: result,
          success: true
        })
      } catch (error) {
        results.push({
          test: test,
          failure_rate: failureRate,
          result: null,
          success: false,
          error: error.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'notifications',
        test_notifications: test_notifications,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing notifications:', error)
    
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

async function handleEscalationTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      escalation_scenarios = [
        {
          name: 'Critical alert escalation',
          failure_rate: 0.25,
          total_jobs: 100,
          time_window: 'daily',
          expected_escalation: true
        },
        {
          name: 'Emergency alert escalation',
          failure_rate: 0.35,
          total_jobs: 150,
          time_window: 'daily',
          expected_escalation: true
        },
        {
          name: 'Warning alert no escalation',
          failure_rate: 0.18,
          total_jobs: 80,
          time_window: 'daily',
          expected_escalation: false
        }
      ]
    } = body
    
    const results = []
    
    for (const scenario of escalation_scenarios) {
      const failedJobs = Math.round(scenario.total_jobs * scenario.failure_rate)
      
      try {
        const result = await checkFailureRateAndAlert(
          scenario.failure_rate,
          scenario.total_jobs,
          failedJobs,
          scenario.time_window,
          new Date().toISOString().split('T')[0]
        )
        
        results.push({
          scenario: scenario,
          result: result,
          success: true
        })
      } catch (error) {
        results.push({
          scenario: scenario,
          result: null,
          success: false,
          error: error.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'escalation',
        escalation_scenarios: escalation_scenarios,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing escalation:', error)
    
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
