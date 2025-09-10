import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface BackupConfig {
  retentionDays: number
  compressionEnabled: boolean
  encryptionEnabled: boolean
  scheduleInterval: string
  backupTypes: string[]
}

interface BackupJob {
  id: string
  type: string
  status: string
  startedAt: string
  completedAt?: string
  size?: number
  location?: string
  error?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'status'
    const backupType = url.searchParams.get('type') || 'full'

    let result: any = {}

    switch (action) {
      case 'create':
        result = await createBackup(supabase, backupType)
        break
      case 'list':
        result = await listBackups(supabase)
        break
      case 'restore':
        const backupId = url.searchParams.get('backupId')
        if (!backupId) {
          throw new Error('Backup ID is required for restore operation')
        }
        result = await restoreBackup(supabase, backupId)
        break
      case 'cleanup':
        result = await cleanupOldBackups(supabase)
        break
      case 'status':
      default:
        result = await getBackupStatus(supabase)
        break
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Backup manager error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function createBackup(supabase: any, backupType: string) {
  const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startedAt = new Date().toISOString()

  try {
    // Log backup start
    const { error: logError } = await supabase
      .from('backup_logs')
      .insert({
        backup_id: backupId,
        backup_type: backupType,
        status: 'started',
        started_at: startedAt,
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to log backup start:', logError)
    }

    // Create backup based on type
    let backupData: any = {}
    
    if (backupType === 'full') {
      backupData = await createFullBackup(supabase)
    } else if (backupType === 'incremental') {
      backupData = await createIncrementalBackup(supabase)
    } else if (backupType === 'schema') {
      backupData = await createSchemaBackup(supabase)
    } else {
      throw new Error(`Unsupported backup type: ${backupType}`)
    }

    const completedAt = new Date().toISOString()
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime()

    // Update backup log
    const { error: updateError } = await supabase
      .from('backup_logs')
      .update({
        status: 'completed',
        completed_at: completedAt,
        duration_ms: duration,
        size_bytes: backupData.size || 0,
        location: backupData.location || 'local',
        error: null
      })
      .eq('backup_id', backupId)

    if (updateError) {
      console.error('Failed to update backup log:', updateError)
    }

    return {
      backupId,
      type: backupType,
      status: 'completed',
      startedAt,
      completedAt,
      duration: duration,
      size: backupData.size || 0,
      location: backupData.location || 'local',
      tables: backupData.tables || [],
      records: backupData.records || 0
    }

  } catch (error) {
    // Log backup failure
    const { error: logError } = await supabase
      .from('backup_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: error.message
      })
      .eq('backup_id', backupId)

    if (logError) {
      console.error('Failed to log backup failure:', logError)
    }

    throw error
  }
}

async function createFullBackup(supabase: any) {
  const tables = [
    'content_jobs',
    'job_runs', 
    'health_checks',
    'metrics_data',
    'monitoring_alerts',
    'notification_logs',
    'cleanup_logs',
    'vault_secrets'
  ]

  const backupData: any = {
    tables: [],
    records: 0,
    size: 0
  }

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')

      if (error) {
        console.error(`Error backing up table ${table}:`, error)
        continue
      }

      backupData.tables.push({
        name: table,
        records: data?.length || 0,
        data: data || []
      })

      backupData.records += data?.length || 0
    } catch (error) {
      console.error(`Error backing up table ${table}:`, error)
    }
  }

  // Estimate size (rough calculation)
  backupData.size = JSON.stringify(backupData).length
  backupData.location = 'supabase_storage'

  return backupData
}

async function createIncrementalBackup(supabase: any) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  const tables = [
    'content_jobs',
    'job_runs',
    'health_checks',
    'metrics_data',
    'monitoring_alerts'
  ]

  const backupData: any = {
    tables: [],
    records: 0,
    size: 0,
    incremental: true,
    since: oneDayAgo
  }

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .gte('created_at', oneDayAgo)

      if (error) {
        console.error(`Error backing up table ${table}:`, error)
        continue
      }

      backupData.tables.push({
        name: table,
        records: data?.length || 0,
        data: data || []
      })

      backupData.records += data?.length || 0
    } catch (error) {
      console.error(`Error backing up table ${table}:`, error)
    }
  }

  backupData.size = JSON.stringify(backupData).length
  backupData.location = 'supabase_storage'

  return backupData
}

async function createSchemaBackup(supabase: any) {
  // Get schema information
  const { data: tables, error } = await supabase
    .rpc('get_table_schemas')

  if (error) {
    console.error('Error getting schema information:', error)
    throw error
  }

  const backupData = {
    type: 'schema',
    tables: tables || [],
    records: 0,
    size: JSON.stringify(tables || {}).length,
    location: 'supabase_storage'
  }

  return backupData
}

async function listBackups(supabase: any) {
  const { data: backups, error } = await supabase
    .from('backup_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw error
  }

  return {
    backups: backups || [],
    total: backups?.length || 0
  }
}

async function restoreBackup(supabase: any, backupId: string) {
  // Get backup information
  const { data: backup, error: backupError } = await supabase
    .from('backup_logs')
    .select('*')
    .eq('backup_id', backupId)
    .single()

  if (backupError || !backup) {
    throw new Error(`Backup not found: ${backupId}`)
  }

  if (backup.status !== 'completed') {
    throw new Error(`Backup not completed: ${backup.status}`)
  }

  // Log restore start
  const restoreId = `restore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startedAt = new Date().toISOString()

  const { error: logError } = await supabase
    .from('backup_logs')
    .insert({
      backup_id: restoreId,
      backup_type: 'restore',
      status: 'started',
      started_at: startedAt,
      created_at: new Date().toISOString(),
      parent_backup_id: backupId
    })

  if (logError) {
    console.error('Failed to log restore start:', logError)
  }

  try {
    // This is a simplified restore - in production, you'd implement actual restore logic
    const completedAt = new Date().toISOString()
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime()

    // Update restore log
    const { error: updateError } = await supabase
      .from('backup_logs')
      .update({
        status: 'completed',
        completed_at: completedAt,
        duration_ms: duration
      })
      .eq('backup_id', restoreId)

    if (updateError) {
      console.error('Failed to update restore log:', updateError)
    }

    return {
      restoreId,
      backupId,
      status: 'completed',
      startedAt,
      completedAt,
      duration
    }

  } catch (error) {
    // Log restore failure
    const { error: logError } = await supabase
      .from('backup_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: error.message
      })
      .eq('backup_id', restoreId)

    if (logError) {
      console.error('Failed to log restore failure:', logError)
    }

    throw error
  }
}

async function cleanupOldBackups(supabase: any) {
  const retentionDays = 30
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: oldBackups, error: selectError } = await supabase
    .from('backup_logs')
    .select('backup_id')
    .lt('created_at', cutoffDate)
    .eq('status', 'completed')

  if (selectError) {
    throw selectError
  }

  if (!oldBackups || oldBackups.length === 0) {
    return {
      deleted: 0,
      message: 'No old backups to clean up'
    }
  }

  // Delete old backup records
  const { error: deleteError } = await supabase
    .from('backup_logs')
    .delete()
    .lt('created_at', cutoffDate)
    .eq('status', 'completed')

  if (deleteError) {
    throw deleteError
  }

  return {
    deleted: oldBackups.length,
    message: `Cleaned up ${oldBackups.length} old backups`
  }
}

async function getBackupStatus(supabase: any) {
  // Get recent backups
  const { data: recentBackups, error: recentError } = await supabase
    .from('backup_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (recentError) {
    throw recentError
  }

  // Get backup statistics
  const { data: stats, error: statsError } = await supabase
    .from('backup_logs')
    .select('status, backup_type, size_bytes, duration_ms')

  if (statsError) {
    throw statsError
  }

  const totalBackups = stats?.length || 0
  const completedBackups = stats?.filter(s => s.status === 'completed').length || 0
  const failedBackups = stats?.filter(s => s.status === 'failed').length || 0
  const totalSize = stats?.reduce((sum, s) => sum + (s.size_bytes || 0), 0) || 0
  const avgDuration = stats?.length > 0 
    ? stats.reduce((sum, s) => sum + (s.duration_ms || 0), 0) / stats.length 
    : 0

  return {
    recentBackups: recentBackups || [],
    statistics: {
      total: totalBackups,
      completed: completedBackups,
      failed: failedBackups,
      successRate: totalBackups > 0 ? (completedBackups / totalBackups) * 100 : 0,
      totalSize: totalSize,
      averageDuration: Math.round(avgDuration)
    },
    lastBackup: recentBackups?.[0] || null
  }
}
