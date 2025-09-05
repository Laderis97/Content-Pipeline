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
    const action = url.searchParams.get('action') || 'cleanup'
    const tableName = url.searchParams.get('table') || ''
    const dryRun = url.searchParams.get('dry_run') === 'true'
    
    console.log(`Cleanup function - Action: ${action}, Table: ${tableName}, Dry run: ${dryRun}`)
    
    switch (action) {
      case 'cleanup':
        return await handleCleanup(tableName, dryRun)
      
      case 'full-cleanup':
        return await handleFullCleanup(dryRun)
      
      case 'config':
        return await handleConfig()
      
      case 'recommendations':
        return await handleRecommendations()
      
      case 'statistics':
        return await handleStatistics(req)
      
      case 'schedule':
        return await handleSchedule(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: cleanup, full-cleanup, config, recommendations, statistics, schedule' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Cleanup function error:', error)
    
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

async function handleCleanup(tableName: string, dryRun: boolean): Promise<Response> {
  try {
    if (!tableName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Table name is required for cleanup action'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }
    
    if (dryRun) {
      // Simulate cleanup without actually doing it
      return new Response(
        JSON.stringify({
          success: true,
          action: 'cleanup',
          table_name: tableName,
          dry_run: true,
          message: `Would cleanup table ${tableName}`,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    const result = await cleanupTable(tableName)
    
    return new Response(
      JSON.stringify({
        success: result.success,
        action: 'cleanup',
        table_name: tableName,
        dry_run: false,
        result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    )
    
  } catch (error) {
    console.error('Error during cleanup:', error)
    
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

async function handleFullCleanup(dryRun: boolean): Promise<Response> {
  try {
    if (dryRun) {
      // Simulate full cleanup without actually doing it
      return new Response(
        JSON.stringify({
          success: true,
          action: 'full-cleanup',
          dry_run: true,
          message: 'Would perform full cleanup of all tables',
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    const result = await performFullCleanup()
    
    return new Response(
      JSON.stringify({
        success: result.success,
        action: 'full-cleanup',
        dry_run: false,
        result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    )
    
  } catch (error) {
    console.error('Error during full cleanup:', error)
    
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

async function handleConfig(): Promise<Response> {
  try {
    const config = getCleanupConfig()
    
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

async function handleRecommendations(): Promise<Response> {
  try {
    // In a real implementation, this would call the database function
    // For now, we'll simulate recommendations
    const recommendations = [
      {
        table_name: 'job_runs',
        recommendation_type: 'high_priority',
        recommendation_message: 'Immediate cleanup recommended - large size impact',
        priority: 'high',
        estimated_impact: 'High - 150.5MB reduction'
      },
      {
        table_name: 'monitoring_alerts',
        recommendation_type: 'medium_priority',
        recommendation_message: 'Cleanup recommended - moderate size impact',
        priority: 'medium',
        estimated_impact: 'Medium - 75.2MB reduction'
      },
      {
        table_name: 'notification_logs',
        recommendation_type: 'low_priority',
        recommendation_message: 'Optional cleanup - small size impact',
        priority: 'low',
        estimated_impact: 'Low - 25.1MB reduction'
      }
    ]
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'recommendations',
        recommendations: recommendations,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting recommendations:', error)
    
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

async function handleStatistics(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url)
    const days = parseInt(url.searchParams.get('days') || '30')
    const tableName = url.searchParams.get('table') || ''
    
    // In a real implementation, this would call the database functions
    // For now, we'll simulate statistics
    const statistics = {
      total_cleanups: 15,
      average_processing_time: 2500,
      average_size_reduction: 125.5,
      average_success_rate: 95.2,
      total_records_processed: 50000,
      total_records_archived: 45000,
      total_records_deleted: 45000,
      total_size_reduction_mb: 1882.5,
      performance_trend: 'improving'
    }
    
    const performanceMetrics = [
      {
        date: '2024-01-15',
        cleanups_count: 1,
        total_processing_time: 2500,
        total_size_reduction: 125.5,
        average_success_rate: 100,
        records_processed: 3500,
        records_deleted: 3500
      },
      {
        date: '2024-01-14',
        cleanups_count: 1,
        total_processing_time: 1800,
        total_size_reduction: 95.2,
        average_success_rate: 100,
        records_processed: 2800,
        records_deleted: 2800
      }
    ]
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'statistics',
        days: days,
        table_name: tableName,
        statistics: statistics,
        performance_metrics: performanceMetrics,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error getting statistics:', error)
    
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

async function handleSchedule(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      cleanup_type = 'scheduled_cleanup',
      tables_to_cleanup = null
    } = body
    
    // In a real implementation, this would call the database function
    // For now, we'll simulate scheduling
    const scheduleResult = {
      scheduled: true,
      message: 'Cleanup scheduled for 6 tables with 25000 records to process',
      estimated_duration_minutes: 25
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'schedule',
        cleanup_type: cleanup_type,
        tables_to_cleanup: tables_to_cleanup,
        schedule_result: scheduleResult,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error scheduling cleanup:', error)
    
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
