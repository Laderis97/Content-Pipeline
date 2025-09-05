import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { response } from '../_shared/response.ts'
import { logger } from '../_shared/logger.ts'
import { 
  initializeBackup, 
  getBackupConfig, 
  getBackupStatus,
  createDatabaseBackup,
  createFunctionBackup,
  createConfigBackup,
  createSecretsBackup,
  restoreFromBackup,
  executeDisasterRecoveryPlan,
  getBackupJob,
  getAllBackupJobs,
  getRestoreJob,
  getAllRestoreJobs,
  getDisasterRecoveryPlan,
  getAllDisasterRecoveryPlans,
  addDisasterRecoveryPlan,
  removeDisasterRecoveryPlan,
  updateBackupConfig,
  cleanupOldBackupJobs,
  resetBackupSystem
} from '../_shared/backup.ts'
import { requireServiceRole } from '../_shared/auth.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Require service role for backup operations
    const userContext = await requireServiceRole()(req)
    
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'status'
    
    logger.info(`Backup - Action: ${action}`, 'backup')
    
    switch (action) {
      case 'status':
        return await handleGetStatus()
      
      case 'init':
        return await handleInitialize(req)
      
      case 'backup-database':
        return await handleCreateDatabaseBackup()
      
      case 'backup-function':
        return await handleCreateFunctionBackup()
      
      case 'backup-config':
        return await handleCreateConfigBackup()
      
      case 'backup-secrets':
        return await handleCreateSecretsBackup()
      
      case 'backup-all':
        return await handleCreateAllBackups()
      
      case 'restore':
        return await handleRestore(req)
      
      case 'jobs':
        return await handleGetJobs()
      
      case 'job':
        return await handleGetJob(req)
      
      case 'disaster-recovery':
        return await handleDisasterRecovery(req)
      
      case 'plans':
        return await handleGetPlans()
      
      case 'add-plan':
        return await handleAddPlan(req)
      
      case 'remove-plan':
        return await handleRemovePlan(req)
      
      case 'update-config':
        return await handleUpdateConfig(req)
      
      case 'cleanup':
        return await handleCleanup()
      
      case 'test':
        return await handleTestBackup()
      
      default:
        return response.validationError(
          'Invalid action. Supported actions: status, init, backup-database, backup-function, backup-config, backup-secrets, backup-all, restore, jobs, job, disaster-recovery, plans, add-plan, remove-plan, update-config, cleanup, test'
        )
    }
    
  } catch (error) {
    logger.error('Backup error:', 'backup', { error: error.message })
    return response.internalError('Backup failed', { error: error.message })
  }
})

async function handleGetStatus(): Promise<Response> {
  try {
    const status = getBackupStatus()
    
    return response.success(
      {
        ...status,
        timestamp: new Date().toISOString()
      },
      'Backup status retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get backup status:', 'backup', { error: error.message })
    return response.internalError('Failed to get backup status', { error: error.message })
  }
}

async function handleInitialize(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { config = {} } = body
    
    const backupConfig = initializeBackup(config)
    
    return response.success(
      {
        config: backupConfig,
        initialized: true
      },
      'Backup system initialized successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to initialize backup system:', 'backup', { error: error.message })
    return response.internalError('Failed to initialize backup system', { error: error.message })
  }
}

async function handleCreateDatabaseBackup(): Promise<Response> {
  try {
    const job = await createDatabaseBackup()
    
    return response.success(
      {
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          startedAt: job.startedAt,
          size: job.size,
          checksum: job.checksum,
          location: job.location
        }
      },
      'Database backup created successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to create database backup:', 'backup', { error: error.message })
    return response.internalError('Failed to create database backup', { error: error.message })
  }
}

async function handleCreateFunctionBackup(): Promise<Response> {
  try {
    const job = await createFunctionBackup()
    
    return response.success(
      {
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          startedAt: job.startedAt,
          size: job.size,
          checksum: job.checksum,
          location: job.location
        }
      },
      'Function backup created successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to create function backup:', 'backup', { error: error.message })
    return response.internalError('Failed to create function backup', { error: error.message })
  }
}

async function handleCreateConfigBackup(): Promise<Response> {
  try {
    const job = await createConfigBackup()
    
    return response.success(
      {
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          startedAt: job.startedAt,
          size: job.size,
          checksum: job.checksum,
          location: job.location
        }
      },
      'Configuration backup created successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to create configuration backup:', 'backup', { error: error.message })
    return response.internalError('Failed to create configuration backup', { error: error.message })
  }
}

async function handleCreateSecretsBackup(): Promise<Response> {
  try {
    const job = await createSecretsBackup()
    
    return response.success(
      {
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          startedAt: job.startedAt,
          size: job.size,
          checksum: job.checksum,
          location: job.location
        }
      },
      'Secrets backup created successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to create secrets backup:', 'backup', { error: error.message })
    return response.internalError('Failed to create secrets backup', { error: error.message })
  }
}

async function handleCreateAllBackups(): Promise<Response> {
  try {
    const config = getBackupConfig()
    const jobs = []
    
    if (config.enableDatabaseBackup) {
      try {
        const job = await createDatabaseBackup()
        jobs.push({ type: 'database', job: { id: job.id, status: job.status } })
      } catch (error) {
        jobs.push({ type: 'database', error: error.message })
      }
    }
    
    if (config.enableFunctionBackup) {
      try {
        const job = await createFunctionBackup()
        jobs.push({ type: 'function', job: { id: job.id, status: job.status } })
      } catch (error) {
        jobs.push({ type: 'function', error: error.message })
      }
    }
    
    if (config.enableConfigBackup) {
      try {
        const job = await createConfigBackup()
        jobs.push({ type: 'config', job: { id: job.id, status: job.status } })
      } catch (error) {
        jobs.push({ type: 'config', error: error.message })
      }
    }
    
    if (config.enableSecretsBackup) {
      try {
        const job = await createSecretsBackup()
        jobs.push({ type: 'secrets', job: { id: job.id, status: job.status } })
      } catch (error) {
        jobs.push({ type: 'secrets', error: error.message })
      }
    }
    
    const successCount = jobs.filter(job => job.job).length
    const errorCount = jobs.filter(job => job.error).length
    
    return response.success(
      {
        jobs,
        summary: {
          total: jobs.length,
          successful: successCount,
          failed: errorCount
        }
      },
      `All backups completed - ${successCount}/${jobs.length} successful`,
      200
    )
    
  } catch (error) {
    logger.error('Failed to create all backups:', 'backup', { error: error.message })
    return response.internalError('Failed to create all backups', { error: error.message })
  }
}

async function handleRestore(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { backupId, type } = body
    
    if (!backupId || !type) {
      return response.validationError('Backup ID and type are required')
    }
    
    if (!['database', 'function', 'config', 'secrets'].includes(type)) {
      return response.validationError('Invalid backup type. Must be one of: database, function, config, secrets')
    }
    
    const job = await restoreFromBackup(backupId, type)
    
    return response.success(
      {
        job: {
          id: job.id,
          backupId: job.backupId,
          type: job.type,
          status: job.status,
          startedAt: job.startedAt
        }
      },
      'Restore job started successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to start restore job:', 'backup', { error: error.message })
    return response.internalError('Failed to start restore job', { error: error.message })
  }
}

async function handleGetJobs(): Promise<Response> {
  try {
    const backupJobs = getAllBackupJobs()
    const restoreJobs = getAllRestoreJobs()
    
    return response.success(
      {
        backup_jobs: backupJobs,
        restore_jobs: restoreJobs,
        summary: {
          total_backup_jobs: backupJobs.length,
          total_restore_jobs: restoreJobs.length,
          active_backup_jobs: backupJobs.filter(job => job.status === 'running').length,
          active_restore_jobs: restoreJobs.filter(job => job.status === 'running').length
        }
      },
      'Backup and restore jobs retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get backup jobs:', 'backup', { error: error.message })
    return response.internalError('Failed to get backup jobs', { error: error.message })
  }
}

async function handleGetJob(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url)
    const jobId = url.searchParams.get('jobId')
    const jobType = url.searchParams.get('type') || 'backup'
    
    if (!jobId) {
      return response.validationError('Job ID is required')
    }
    
    let job
    if (jobType === 'restore') {
      job = getRestoreJob(jobId)
    } else {
      job = getBackupJob(jobId)
    }
    
    if (!job) {
      return response.notFound('Job not found')
    }
    
    return response.success(
      { job },
      'Job retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get job:', 'backup', { error: error.message })
    return response.internalError('Failed to get job', { error: error.message })
  }
}

async function handleDisasterRecovery(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { planId, trigger } = body
    
    if (!planId || !trigger) {
      return response.validationError('Plan ID and trigger are required')
    }
    
    const result = await executeDisasterRecoveryPlan(planId, trigger)
    
    return response.success(
      {
        plan_id: result.planId,
        status: result.status,
        steps: result.steps,
        duration_ms: result.duration,
        summary: {
          total_steps: result.steps.length,
          successful_steps: result.steps.filter(step => step.status === 'success').length,
          failed_steps: result.steps.filter(step => step.status === 'failed').length
        }
      },
      `Disaster recovery plan ${result.status}`,
      200
    )
    
  } catch (error) {
    logger.error('Failed to execute disaster recovery plan:', 'backup', { error: error.message })
    return response.internalError('Failed to execute disaster recovery plan', { error: error.message })
  }
}

async function handleGetPlans(): Promise<Response> {
  try {
    const plans = getAllDisasterRecoveryPlans()
    
    return response.success(
      { plans },
      'Disaster recovery plans retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get disaster recovery plans:', 'backup', { error: error.message })
    return response.internalError('Failed to get disaster recovery plans', { error: error.message })
  }
}

async function handleAddPlan(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { plan } = body
    
    if (!plan || !plan.id || !plan.name) {
      return response.validationError('Plan with ID and name is required')
    }
    
    addDisasterRecoveryPlan(plan)
    
    return response.success(
      { plan },
      'Disaster recovery plan added successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to add disaster recovery plan:', 'backup', { error: error.message })
    return response.internalError('Failed to add disaster recovery plan', { error: error.message })
  }
}

async function handleRemovePlan(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { planId } = body
    
    if (!planId) {
      return response.validationError('Plan ID is required')
    }
    
    const plan = getDisasterRecoveryPlan(planId)
    if (!plan) {
      return response.notFound('Disaster recovery plan not found')
    }
    
    removeDisasterRecoveryPlan(planId)
    
    return response.success(
      { planId, removed: true },
      'Disaster recovery plan removed successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to remove disaster recovery plan:', 'backup', { error: error.message })
    return response.internalError('Failed to remove disaster recovery plan', { error: error.message })
  }
}

async function handleUpdateConfig(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { updates = {} } = body
    
    if (Object.keys(updates).length === 0) {
      return response.validationError('No updates provided')
    }
    
    const updatedConfig = updateBackupConfig(updates)
    
    return response.success(
      {
        config: updatedConfig,
        updated_fields: Object.keys(updates)
      },
      'Backup configuration updated successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to update backup config:', 'backup', { error: error.message })
    return response.internalError('Failed to update backup configuration', { error: error.message })
  }
}

async function handleCleanup(): Promise<Response> {
  try {
    cleanupOldBackupJobs()
    
    return response.success(
      { cleanup_completed: true },
      'Old backup jobs cleaned up successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to cleanup old backup jobs:', 'backup', { error: error.message })
    return response.internalError('Failed to cleanup old backup jobs', { error: error.message })
  }
}

async function handleTestBackup(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Configuration initialization
    try {
      const config = getBackupConfig()
      tests.push({
        test: 'config_initialization',
        success: !!config,
        message: 'Backup configuration initialized successfully',
        details: {
          enableDatabaseBackup: config.enableDatabaseBackup,
          enableFunctionBackup: config.enableFunctionBackup,
          enableConfigBackup: config.enableConfigBackup,
          enableSecretsBackup: config.enableSecretsBackup
        }
      })
    } catch (error) {
      tests.push({
        test: 'config_initialization',
        success: false,
        message: `Configuration initialization failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: Disaster recovery plans
    try {
      const plans = getAllDisasterRecoveryPlans()
      tests.push({
        test: 'disaster_recovery_plans',
        success: plans.length > 0,
        message: `Disaster recovery plans loaded successfully (${plans.length} plans)`,
        details: {
          plan_count: plans.length,
          enabled_plans: plans.filter(plan => plan.enabled).length,
          plan_ids: plans.map(plan => plan.id)
        }
      })
    } catch (error) {
      tests.push({
        test: 'disaster_recovery_plans',
        success: false,
        message: `Disaster recovery plans test failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: Database backup
    try {
      const job = await createDatabaseBackup()
      tests.push({
        test: 'database_backup',
        success: job.status === 'completed',
        message: 'Database backup created successfully',
        details: {
          job_id: job.id,
          status: job.status,
          size: job.size,
          checksum: job.checksum
        }
      })
    } catch (error) {
      tests.push({
        test: 'database_backup',
        success: false,
        message: `Database backup failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 4: Function backup
    try {
      const job = await createFunctionBackup()
      tests.push({
        test: 'function_backup',
        success: job.status === 'completed',
        message: 'Function backup created successfully',
        details: {
          job_id: job.id,
          status: job.status,
          size: job.size,
          checksum: job.checksum
        }
      })
    } catch (error) {
      tests.push({
        test: 'function_backup',
        success: false,
        message: `Function backup failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 5: Configuration backup
    try {
      const job = await createConfigBackup()
      tests.push({
        test: 'config_backup',
        success: job.status === 'completed',
        message: 'Configuration backup created successfully',
        details: {
          job_id: job.id,
          status: job.status,
          size: job.size,
          checksum: job.checksum
        }
      })
    } catch (error) {
      tests.push({
        test: 'config_backup',
        success: false,
        message: `Configuration backup failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 6: Secrets backup
    try {
      const job = await createSecretsBackup()
      tests.push({
        test: 'secrets_backup',
        success: job.status === 'completed',
        message: 'Secrets backup created successfully',
        details: {
          job_id: job.id,
          status: job.status,
          size: job.size,
          checksum: job.checksum
        }
      })
    } catch (error) {
      tests.push({
        test: 'secrets_backup',
        success: false,
        message: `Secrets backup failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 7: Restore functionality
    try {
      const restoreJob = await restoreFromBackup('test_backup', 'database')
      tests.push({
        test: 'restore_functionality',
        success: restoreJob.status === 'completed',
        message: 'Restore functionality working correctly',
        details: {
          job_id: restoreJob.id,
          backup_id: restoreJob.backupId,
          type: restoreJob.type,
          status: restoreJob.status
        }
      })
    } catch (error) {
      tests.push({
        test: 'restore_functionality',
        success: false,
        message: `Restore functionality failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 8: Disaster recovery plan execution
    try {
      const result = await executeDisasterRecoveryPlan('database_failure', 'test_trigger')
      tests.push({
        test: 'disaster_recovery_execution',
        success: result.status === 'success',
        message: 'Disaster recovery plan execution successful',
        details: {
          plan_id: result.planId,
          status: result.status,
          steps: result.steps.length,
          duration_ms: result.duration
        }
      })
    } catch (error) {
      tests.push({
        test: 'disaster_recovery_execution',
        success: false,
        message: `Disaster recovery execution failed: ${error.message}`,
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
      `Backup test completed - ${tests.filter(test => test.success).length}/${tests.length} tests passed`,
      allTestsPassed ? 200 : 400
    )
    
  } catch (error) {
    logger.error('Backup test failed:', 'backup', { error: error.message })
    return response.internalError('Backup test failed', { error: error.message })
  }
}
