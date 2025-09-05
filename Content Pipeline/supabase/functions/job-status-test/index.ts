import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createJobStatusManager,
  transitionJobToPending,
  transitionJobToProcessing,
  transitionJobToCompleted,
  transitionJobToFailed,
  transitionJobToCancelled,
  getJobStatus,
  getJobStatusHistory,
  validateJobStatusConsistency,
  getJobsByStatus,
  getJobStatusStatistics,
  JOB_STATUS
} from '../content-automation/job-status-manager.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const jobId = url.searchParams.get('job_id') || 'test-job-123'
    
    console.log(`Job status test - Action: ${action}, Job ID: ${jobId}`)
    
    switch (action) {
      case 'test':
        return await handleStatusTransitionTest(jobId, req)
      
      case 'history':
        return await handleStatusHistoryTest(jobId)
      
      case 'consistency':
        return await handleStatusConsistencyTest(jobId)
      
      case 'by-status':
        return await handleJobsByStatusTest(req)
      
      case 'statistics':
        return await handleStatusStatisticsTest()
      
      case 'invalid':
        return await handleInvalidTransitionTest(jobId)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, history, consistency, by-status, statistics, invalid' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Job status test error:', error)
    
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

async function handleStatusTransitionTest(jobId: string, req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      test_type = 'full_cycle',
      start_status = JOB_STATUS.PENDING
    } = body
    
    const manager = createJobStatusManager(jobId)
    const results = []
    
    if (test_type === 'full_cycle') {
      // Test full status transition cycle
      const transitions = [
        { to: JOB_STATUS.PROCESSING, reason: 'Job claimed for processing' },
        { to: JOB_STATUS.COMPLETED, reason: 'Content generated and posted successfully' }
      ]
      
      for (const transition of transitions) {
        const result = await manager.transitionTo(transition.to, transition.reason, {
          timestamp: new Date().toISOString(),
          test_transition: true
        })
        
        results.push({
          transition: transition,
          result: result
        })
        
        // Small delay between transitions
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } else if (test_type === 'failure_cycle') {
      // Test failure cycle
      const transitions = [
        { to: JOB_STATUS.PROCESSING, reason: 'Job claimed for processing' },
        { to: JOB_STATUS.FAILED, reason: 'Content generation failed' }
      ]
      
      for (const transition of transitions) {
        const result = await manager.transitionTo(transition.to, transition.reason, {
          timestamp: new Date().toISOString(),
          test_transition: true
        })
        
        results.push({
          transition: transition,
          result: result
        })
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } else if (test_type === 'retry_cycle') {
      // Test retry cycle
      const transitions = [
        { to: JOB_STATUS.PROCESSING, reason: 'Job claimed for processing' },
        { to: JOB_STATUS.FAILED, reason: 'Content generation failed' },
        { to: JOB_STATUS.PENDING, reason: 'Retry requested' }
      ]
      
      for (const transition of transitions) {
        const result = await manager.transitionTo(transition.to, transition.reason, {
          timestamp: new Date().toISOString(),
          test_transition: true
        })
        
        results.push({
          transition: transition,
          result: result
        })
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // Get final status
    const finalStatus = await manager.getCurrentStatus()
    
    return new Response(
      JSON.stringify({
        success: true,
        test_type,
        job_id: jobId,
        transitions: results,
        final_status: finalStatus,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing status transitions:', error)
    
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

async function handleStatusHistoryTest(jobId: string) {
  try {
    const manager = createJobStatusManager(jobId)
    const history = await manager.getStatusHistory()
    const currentStatus = await manager.getCurrentStatus()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'history',
        job_id: jobId,
        current_status: currentStatus,
        status_history: history,
        history_count: history.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing status history:', error)
    
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

async function handleStatusConsistencyTest(jobId: string) {
  try {
    const consistency = await validateJobStatusConsistency(jobId)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'consistency',
        job_id: jobId,
        consistency_check: consistency,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing status consistency:', error)
    
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

async function handleJobsByStatusTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { status = JOB_STATUS.PENDING } = body
    
    const jobs = await getJobsByStatus(status)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'by-status',
        status: status,
        jobs: jobs,
        job_count: jobs.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing jobs by status:', error)
    
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

async function handleStatusStatisticsTest() {
  try {
    const statistics = await getJobStatusStatistics()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'statistics',
        statistics: statistics,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing status statistics:', error)
    
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

async function handleInvalidTransitionTest(jobId: string) {
  try {
    const manager = createJobStatusManager(jobId)
    const results = []
    
    // Test invalid transitions
    const invalidTransitions = [
      { from: JOB_STATUS.COMPLETED, to: JOB_STATUS.PROCESSING, reason: 'Invalid: completed to processing' },
      { from: JOB_STATUS.CANCELLED, to: JOB_STATUS.PENDING, reason: 'Invalid: cancelled to pending' },
      { from: JOB_STATUS.PENDING, to: JOB_STATUS.COMPLETED, reason: 'Invalid: pending to completed (skip processing)' }
    ]
    
    for (const transition of invalidTransitions) {
      // First set the job to the from status (if possible)
      try {
        await manager.transitionTo(transition.from, `Setting to ${transition.from} for test`)
      } catch (error) {
        // Ignore errors when setting initial status
      }
      
      // Then try the invalid transition
      const result = await manager.transitionTo(transition.to, transition.reason, {
        test_invalid_transition: true
      })
      
      results.push({
        transition: transition,
        result: result,
        expected_to_fail: true
      })
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'invalid',
        job_id: jobId,
        invalid_transitions: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing invalid transitions:', error)
    
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
