import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createAdminRetryManager,
  performManualRetry,
  getAdminRetryStatistics,
  getJobRetryHistory,
  ADMIN_RETRY_TYPES
} from '../content-automation/admin-retry-manager.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const jobId = url.searchParams.get('job_id') || 'test-job-123'
    const adminUserId = url.searchParams.get('admin_user_id') || 'test-admin-123'
    const adminRole = url.searchParams.get('admin_role') || 'admin'
    
    console.log(`Admin retry test - Action: ${action}, Job ID: ${jobId}, Admin: ${adminUserId} (${adminRole})`)
    
    switch (action) {
      case 'test':
        return await handleManualRetryTest(jobId, adminUserId, adminRole, req)
      
      case 'statistics':
        return await handleStatisticsTest(req)
      
      case 'history':
        return await handleHistoryTest(jobId)
      
      case 'permissions':
        return await handlePermissionsTest(req)
      
      case 'eligibility':
        return await handleEligibilityTest(jobId, req)
      
      case 'simulate-scenarios':
        return await handleSimulateScenariosTest(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, statistics, history, permissions, eligibility, simulate-scenarios' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Admin retry test error:', error)
    
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

async function handleManualRetryTest(jobId: string, adminUserId: string, adminRole: string, req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      retry_type = ADMIN_RETRY_TYPES.MANUAL_RETRY,
      reason = 'Test manual retry',
      force_override = false,
      reset_retry_count = false,
      custom_delay = undefined
    } = body
    
    const request = {
      job_id: jobId,
      admin_user_id: adminUserId,
      admin_role: adminRole,
      retry_type: retry_type,
      reason: reason,
      force_override: force_override,
      reset_retry_count: reset_retry_count,
      custom_delay: custom_delay,
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    }
    
    const result = await performManualRetry(
      adminUserId,
      adminRole,
      request,
      '127.0.0.1',
      'AdminRetryTest/1.0'
    )
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'test',
        job_id: jobId,
        admin_user_id: adminUserId,
        admin_role: adminRole,
        request: request,
        result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing manual retry:', error)
    
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

async function handleStatisticsTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { days = 30 } = body
    
    const statistics = await getAdminRetryStatistics(days)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'statistics',
        days: days,
        statistics: statistics,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing statistics:', error)
    
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

async function handleHistoryTest(jobId: string) {
  try {
    const history = await getJobRetryHistory(jobId)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'history',
        job_id: jobId,
        history: history,
        history_count: history.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing history:', error)
    
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

async function handlePermissionsTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      test_cases = [
        { role: 'admin', retry_type: ADMIN_RETRY_TYPES.MANUAL_RETRY, force_override: false },
        { role: 'super_admin', retry_type: ADMIN_RETRY_TYPES.EMERGENCY_RETRY, force_override: true },
        { role: 'content_manager', retry_type: ADMIN_RETRY_TYPES.MANUAL_RETRY, force_override: false },
        { role: 'user', retry_type: ADMIN_RETRY_TYPES.MANUAL_RETRY, force_override: false },
        { role: 'content_manager', retry_type: ADMIN_RETRY_TYPES.EMERGENCY_RETRY, force_override: false }
      ]
    } = body
    
    const results = []
    
    for (const testCase of test_cases) {
      const manager = createAdminRetryManager(testCase.role, testCase.role)
      
      // Test permission validation
      const request = {
        job_id: 'test-job-123',
        admin_user_id: 'test-admin',
        admin_role: testCase.role,
        retry_type: testCase.retry_type,
        reason: 'Permission test',
        force_override: testCase.force_override
      }
      
      try {
        const result = await manager.performManualRetry(request)
        results.push({
          test_case: testCase,
          result: result,
          permission_granted: result.success
        })
      } catch (error) {
        results.push({
          test_case: testCase,
          result: null,
          permission_granted: false,
          error: error.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'permissions',
        test_cases: test_cases,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing permissions:', error)
    
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

async function handleEligibilityTest(jobId: string, req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      test_scenarios = [
        { retry_type: ADMIN_RETRY_TYPES.MANUAL_RETRY, force_override: false },
        { retry_type: ADMIN_RETRY_TYPES.FORCE_RETRY, force_override: true },
        { retry_type: ADMIN_RETRY_TYPES.RESET_RETRY_COUNT, force_override: false },
        { retry_type: ADMIN_RETRY_TYPES.OVERRIDE_MAX_RETRIES, force_override: true },
        { retry_type: ADMIN_RETRY_TYPES.EMERGENCY_RETRY, force_override: true }
      ]
    } = body
    
    const results = []
    
    for (const scenario of test_scenarios) {
      const manager = createAdminRetryManager('test-admin', 'admin')
      
      const request = {
        job_id: jobId,
        admin_user_id: 'test-admin',
        admin_role: 'admin',
        retry_type: scenario.retry_type,
        reason: 'Eligibility test',
        force_override: scenario.force_override
      }
      
      try {
        const result = await manager.performManualRetry(request)
        results.push({
          scenario: scenario,
          result: result,
          eligible: result.success
        })
      } catch (error) {
        results.push({
          scenario: scenario,
          result: null,
          eligible: false,
          error: error.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'eligibility',
        job_id: jobId,
        test_scenarios: test_scenarios,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing eligibility:', error)
    
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

async function handleSimulateScenariosTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      scenarios = [
        {
          name: 'Normal manual retry',
          job_id: 'test-job-1',
          admin_role: 'admin',
          retry_type: ADMIN_RETRY_TYPES.MANUAL_RETRY,
          reason: 'Content generation failed due to OpenAI API error'
        },
        {
          name: 'Force retry with override',
          job_id: 'test-job-2',
          admin_role: 'super_admin',
          retry_type: ADMIN_RETRY_TYPES.FORCE_RETRY,
          reason: 'WordPress site was temporarily down',
          force_override: true
        },
        {
          name: 'Reset retry count',
          job_id: 'test-job-3',
          admin_role: 'admin',
          retry_type: ADMIN_RETRY_TYPES.RESET_RETRY_COUNT,
          reason: 'Previous retries were due to temporary issues'
        },
        {
          name: 'Emergency retry',
          job_id: 'test-job-4',
          admin_role: 'super_admin',
          retry_type: ADMIN_RETRY_TYPES.EMERGENCY_RETRY,
          reason: 'Critical content needed for immediate publication',
          force_override: true
        },
        {
          name: 'Permission denied',
          job_id: 'test-job-5',
          admin_role: 'user',
          retry_type: ADMIN_RETRY_TYPES.MANUAL_RETRY,
          reason: 'Should fail due to insufficient permissions'
        }
      ]
    } = body
    
    const results = []
    
    for (const scenario of scenarios) {
      const manager = createAdminRetryManager('test-admin', scenario.admin_role)
      
      const request = {
        job_id: scenario.job_id,
        admin_user_id: 'test-admin',
        admin_role: scenario.admin_role,
        retry_type: scenario.retry_type,
        reason: scenario.reason,
        force_override: scenario.force_override || false,
        metadata: {
          scenario: scenario.name,
          test: true
        }
      }
      
      try {
        const result = await manager.performManualRetry(request)
        results.push({
          scenario: scenario,
          result: result,
          success: result.success
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
        action: 'simulate-scenarios',
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
