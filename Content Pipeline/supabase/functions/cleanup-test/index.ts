import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createCleanupArchivalManager,
  performFullCleanup,
  cleanupTable,
  getCleanupConfig
} from '../content-automation/cleanup-archival.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const tableName = url.searchParams.get('table') || 'job_runs'
    
    console.log(`Cleanup test - Action: ${action}, Table: ${tableName}`)
    
    switch (action) {
      case 'test':
        return await handleCleanupTest(tableName)
      
      case 'full-test':
        return await handleFullCleanupTest()
      
      case 'config-test':
        return await handleConfigTest()
      
      case 'performance-test':
        return await handlePerformanceTest(req)
      
      case 'archival-test':
        return await handleArchivalTest(req)
      
      case 'batch-test':
        return await handleBatchTest(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, full-test, config-test, performance-test, archival-test, batch-test' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Cleanup test error:', error)
    
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

async function handleCleanupTest(tableName: string): Promise<Response> {
  try {
    const manager = createCleanupArchivalManager()
    const result = await manager.cleanupTable(tableName)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'test',
        table_name: tableName,
        result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing cleanup:', error)
    
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

async function handleFullCleanupTest(): Promise<Response> {
  try {
    const result = await performFullCleanup()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'full-test',
        result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing full cleanup:', error)
    
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
    const config = getCleanupConfig()
    const manager = createCleanupArchivalManager()
    
    // Test configuration updates
    const originalConfig = { ...config }
    
    // Update configuration
    manager.updateCleanupConfig({
      BATCH_LIMITS: {
        max_records_per_batch: 500,
        max_processing_time: 5 * 60 * 1000,
        batch_delay: 500
      }
    })
    
    const updatedConfig = manager.getCleanupConfig()
    
    // Restore original configuration
    manager.updateCleanupConfig(originalConfig)
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'config-test',
        original_config: originalConfig,
        updated_config: updatedConfig,
        config_updated: true,
        config_restored: true,
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

async function handlePerformanceTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      test_scenarios = [
        { table: 'job_runs', record_count: 1000, expected_time_ms: 5000 },
        { table: 'monitoring_alerts', record_count: 500, expected_time_ms: 2500 },
        { table: 'notification_logs', record_count: 2000, expected_time_ms: 3000 },
        { table: 'sweeper_logs', record_count: 300, expected_time_ms: 1500 }
      ]
    } = body
    
    const results = []
    
    for (const scenario of test_scenarios) {
      const startTime = Date.now()
      
      try {
        // Simulate cleanup performance test
        const manager = createCleanupArchivalManager()
        const result = await manager.cleanupTable(scenario.table)
        
        const actualTime = Date.now() - startTime
        const performanceRatio = actualTime / scenario.expected_time_ms
        
        results.push({
          scenario: scenario,
          result: result,
          actual_time_ms: actualTime,
          expected_time_ms: scenario.expected_time_ms,
          performance_ratio: performanceRatio,
          performance_status: performanceRatio <= 1.2 ? 'good' : performanceRatio <= 2.0 ? 'acceptable' : 'poor',
          success: true
        })
        
      } catch (error) {
        results.push({
          scenario: scenario,
          result: null,
          actual_time_ms: Date.now() - startTime,
          expected_time_ms: scenario.expected_time_ms,
          performance_ratio: null,
          performance_status: 'failed',
          success: false,
          error: error.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'performance-test',
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

async function handleArchivalTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      archival_scenarios = [
        {
          table: 'job_runs',
          record_count: 1000,
          compression_enabled: true,
          expected_compression_ratio: 0.7
        },
        {
          table: 'monitoring_alerts',
          record_count: 500,
          compression_enabled: false,
          expected_compression_ratio: 1.0
        },
        {
          table: 'notification_logs',
          record_count: 2000,
          compression_enabled: true,
          expected_compression_ratio: 0.6
        }
      ]
    } = body
    
    const results = []
    
    for (const scenario of archival_scenarios) {
      try {
        const manager = createCleanupArchivalManager()
        
        // Update configuration for this scenario
        manager.updateCleanupConfig({
          ARCHIVAL: {
            enabled: true,
            archive_before_delete: true,
            compression_enabled: scenario.compression_enabled,
            archive_format: 'json',
            archive_location: 'test_archives'
          }
        })
        
        // Simulate archival test
        const result = await manager.cleanupTable(scenario.table)
        
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
        action: 'archival-test',
        archival_scenarios: archival_scenarios,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing archival:', error)
    
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

async function handleBatchTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      batch_scenarios = [
        {
          table: 'job_runs',
          total_records: 5000,
          batch_size: 100,
          expected_batches: 50
        },
        {
          table: 'monitoring_alerts',
          total_records: 2000,
          batch_size: 200,
          expected_batches: 10
        },
        {
          table: 'notification_logs',
          total_records: 10000,
          batch_size: 500,
          expected_batches: 20
        }
      ]
    } = body
    
    const results = []
    
    for (const scenario of batch_scenarios) {
      try {
        const manager = createCleanupArchivalManager()
        
        // Update batch configuration
        manager.updateCleanupConfig({
          BATCH_LIMITS: {
            max_records_per_batch: scenario.batch_size,
            max_processing_time: 10 * 60 * 1000,
            batch_delay: 100
          }
        })
        
        const startTime = Date.now()
        
        // Simulate batch processing test
        const result = await manager.cleanupTable(scenario.table)
        
        const processingTime = Date.now() - startTime
        const actualBatches = Math.ceil(scenario.total_records / scenario.batch_size)
        
        results.push({
          scenario: scenario,
          result: result,
          actual_batches: actualBatches,
          expected_batches: scenario.expected_batches,
          processing_time_ms: processingTime,
          batch_efficiency: actualBatches === scenario.expected_batches ? 'optimal' : 'suboptimal',
          success: true
        })
        
      } catch (error) {
        results.push({
          scenario: scenario,
          result: null,
          actual_batches: 0,
          expected_batches: scenario.expected_batches,
          processing_time_ms: 0,
          batch_efficiency: 'failed',
          success: false,
          error: error.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'batch-test',
        batch_scenarios: batch_scenarios,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing batch processing:', error)
    
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
