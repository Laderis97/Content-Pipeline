import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface BackupSchedule {
  id: string
  name: string
  type: string
  schedule: string
  enabled: boolean
  retentionDays: number
  lastRun?: string
  nextRun?: string
  status: string
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

    let result: any = {}

    switch (action) {
      case 'create':
        const body = await req.json()
        result = await createSchedule(supabase, body)
        break
      case 'update':
        const updateBody = await req.json()
        result = await updateSchedule(supabase, updateBody)
        break
      case 'delete':
        const scheduleId = url.searchParams.get('id')
        if (!scheduleId) {
          throw new Error('Schedule ID is required for delete operation')
        }
        result = await deleteSchedule(supabase, scheduleId)
        break
      case 'run':
        const runScheduleId = url.searchParams.get('id')
        if (!runScheduleId) {
          throw new Error('Schedule ID is required for run operation')
        }
        result = await runScheduledBackup(supabase, runScheduleId)
        break
      case 'list':
        result = await listSchedules(supabase)
        break
      case 'status':
      default:
        result = await getSchedulerStatus(supabase)
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
    console.error('Backup scheduler error:', error)
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

async function createSchedule(supabase: any, scheduleData: any) {
  const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const schedule: BackupSchedule = {
    id: scheduleId,
    name: scheduleData.name || 'Backup Schedule',
    type: scheduleData.type || 'full',
    schedule: scheduleData.schedule || '0 2 * * *', // Daily at 2 AM
    enabled: scheduleData.enabled !== false,
    retentionDays: scheduleData.retentionDays || 30,
    status: 'active',
    nextRun: calculateNextRun(scheduleData.schedule || '0 2 * * *')
  }

  const { error } = await supabase
    .from('backup_schedules')
    .insert({
      id: schedule.id,
      name: schedule.name,
      backup_type: schedule.type,
      cron_schedule: schedule.schedule,
      enabled: schedule.enabled,
      retention_days: schedule.retentionDays,
      status: schedule.status,
      next_run: schedule.nextRun,
      created_at: new Date().toISOString()
    })

  if (error) {
    throw error
  }

  return {
    schedule,
    message: 'Backup schedule created successfully'
  }
}

async function updateSchedule(supabase: any, updateData: any) {
  const { id, ...updateFields } = updateData

  if (!id) {
    throw new Error('Schedule ID is required for update')
  }

  const updatePayload: any = {
    updated_at: new Date().toISOString()
  }

  if (updateFields.name) updatePayload.name = updateFields.name
  if (updateFields.type) updatePayload.backup_type = updateFields.type
  if (updateFields.schedule) {
    updatePayload.cron_schedule = updateFields.schedule
    updatePayload.next_run = calculateNextRun(updateFields.schedule)
  }
  if (updateFields.enabled !== undefined) updatePayload.enabled = updateFields.enabled
  if (updateFields.retentionDays) updatePayload.retention_days = updateFields.retentionDays
  if (updateFields.status) updatePayload.status = updateFields.status

  const { error } = await supabase
    .from('backup_schedules')
    .update(updatePayload)
    .eq('id', id)

  if (error) {
    throw error
  }

  return {
    message: 'Backup schedule updated successfully',
    updatedFields: Object.keys(updateFields)
  }
}

async function deleteSchedule(supabase: any, scheduleId: string) {
  const { error } = await supabase
    .from('backup_schedules')
    .delete()
    .eq('id', scheduleId)

  if (error) {
    throw error
  }

  return {
    message: 'Backup schedule deleted successfully'
  }
}

async function runScheduledBackup(supabase: any, scheduleId: string) {
  // Get schedule details
  const { data: schedule, error: scheduleError } = await supabase
    .from('backup_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (scheduleError || !schedule) {
    throw new Error(`Schedule not found: ${scheduleId}`)
  }

  if (!schedule.enabled) {
    throw new Error('Schedule is disabled')
  }

  // Call backup manager to create backup
  const backupManagerUrl = Deno.env.get('SUPABASE_URL') + '/functions/v1/backup-manager'
  const response = await fetch(`${backupManagerUrl}?action=create&type=${schedule.backup_type}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Backup creation failed: ${response.status}`)
  }

  const backupResult = await response.json()

  // Update schedule last run
  const { error: updateError } = await supabase
    .from('backup_schedules')
    .update({
      last_run: new Date().toISOString(),
      next_run: calculateNextRun(schedule.cron_schedule),
      status: 'completed'
    })
    .eq('id', scheduleId)

  if (updateError) {
    console.error('Failed to update schedule last run:', updateError)
  }

  return {
    scheduleId,
    backupResult: backupResult.data,
    message: 'Scheduled backup executed successfully'
  }
}

async function listSchedules(supabase: any) {
  const { data: schedules, error } = await supabase
    .from('backup_schedules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return {
    schedules: schedules || [],
    total: schedules?.length || 0
  }
}

async function getSchedulerStatus(supabase: any) {
  // Get all schedules
  const { data: schedules, error: schedulesError } = await supabase
    .from('backup_schedules')
    .select('*')

  if (schedulesError) {
    throw schedulesError
  }

  // Get recent backup runs
  const { data: recentRuns, error: runsError } = await supabase
    .from('backup_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (runsError) {
    throw runsError
  }

  const activeSchedules = schedules?.filter(s => s.enabled) || []
  const totalSchedules = schedules?.length || 0
  const recentBackups = recentRuns?.length || 0

  // Calculate next run times
  const schedulesWithNextRun = schedules?.map(schedule => ({
    ...schedule,
    next_run: calculateNextRun(schedule.cron_schedule)
  })) || []

  return {
    totalSchedules,
    activeSchedules: activeSchedules.length,
    recentBackups,
    schedules: schedulesWithNextRun,
    nextScheduledRun: schedulesWithNextRun
      .filter(s => s.enabled)
      .sort((a, b) => new Date(a.next_run).getTime() - new Date(b.next_run).getTime())[0] || null
  }
}

function calculateNextRun(cronSchedule: string): string {
  // Simplified cron calculation - in production, use a proper cron library
  const now = new Date()
  
  // Parse basic cron patterns
  const parts = cronSchedule.split(' ')
  if (parts.length !== 5) {
    // Default to daily at 2 AM if invalid
    const next = new Date(now)
    next.setDate(next.getDate() + 1)
    next.setHours(2, 0, 0, 0)
    return next.toISOString()
  }

  const [minute, hour, day, month, dayOfWeek] = parts

  // Handle daily schedules
  if (day === '*' && month === '*' && dayOfWeek === '*') {
    const next = new Date(now)
    const targetHour = hour === '*' ? 2 : parseInt(hour)
    const targetMinute = minute === '*' ? 0 : parseInt(minute)
    
    next.setHours(targetHour, targetMinute, 0, 0)
    
    // If time has passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
    
    return next.toISOString()
  }

  // Handle weekly schedules (simplified)
  if (dayOfWeek !== '*') {
    const next = new Date(now)
    const targetDay = parseInt(dayOfWeek)
    const targetHour = hour === '*' ? 2 : parseInt(hour)
    const targetMinute = minute === '*' ? 0 : parseInt(minute)
    
    // Find next occurrence of target day
    const daysUntilTarget = (targetDay - next.getDay() + 7) % 7
    next.setDate(next.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget))
    next.setHours(targetHour, targetMinute, 0, 0)
    
    return next.toISOString()
  }

  // Default fallback
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  next.setHours(2, 0, 0, 0)
  return next.toISOString()
}
