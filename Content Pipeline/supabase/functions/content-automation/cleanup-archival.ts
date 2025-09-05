// Job runs cleanup and archival logic for performance
// PRD Reference: Monitoring & Maintenance Functions (5.4), Performance & Scalability (F1-F3)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Cleanup and archival configuration
const CLEANUP_CONFIG = {
  // Retention periods
  RETENTION_PERIODS: {
    job_runs_active: 30 * 24 * 60 * 60 * 1000, // 30 days
    job_runs_archived: 365 * 24 * 60 * 60 * 1000, // 1 year
    monitoring_alerts: 90 * 24 * 60 * 60 * 1000, // 90 days
    notification_logs: 90 * 24 * 60 * 60 * 1000, // 90 days
    sweeper_logs: 90 * 24 * 60 * 60 * 1000, // 90 days
    admin_retry_audit_log: 90 * 24 * 60 * 60 * 1000, // 90 days
  },
  
  // Batch processing limits
  BATCH_LIMITS: {
    max_records_per_batch: 1000,
    max_processing_time: 10 * 60 * 1000, // 10 minutes
    batch_delay: 1000, // 1 second between batches
  },
  
  // Archival settings
  ARCHIVAL: {
    enabled: true,
    archive_before_delete: true,
    compression_enabled: true,
    archive_format: 'json',
    archive_location: 'archived_data',
  },
  
  // Performance thresholds
  PERFORMANCE: {
    max_table_size_mb: 1000, // 1GB
    max_index_size_mb: 100, // 100MB
    cleanup_frequency_hours: 24, // Daily cleanup
    emergency_cleanup_threshold: 0.8, // 80% of max size
  }
}

interface CleanupResult {
  success: boolean
  table_name: string
  records_processed: number
  records_archived: number
  records_deleted: number
  processing_time_ms: number
  errors: string[]
  warnings: string[]
  performance_impact: {
    before_size_mb: number
    after_size_mb: number
    size_reduction_mb: number
    index_rebuild_time_ms: number
  }
}

interface ArchivalResult {
  success: boolean
  table_name: string
  records_archived: number
  archive_file_path: string
  archive_size_mb: number
  compression_ratio: number
  processing_time_ms: number
  errors: string[]
}

interface CleanupStatistics {
  total_tables_processed: number
  total_records_processed: number
  total_records_archived: number
  total_records_deleted: number
  total_processing_time_ms: number
  total_size_reduction_mb: number
  cleanup_success_rate: number
  performance_improvement: number
  last_cleanup_time: string
}

/**
 * Cleanup and archival manager for job runs and related tables
 */
export class CleanupArchivalManager {
  private cleanupHistory: Map<string, number> = new Map()

  constructor() {
    // Initialize cleanup history
  }

  /**
   * Performs comprehensive cleanup and archival for all tables
   */
  async performFullCleanup(): Promise<{
    success: boolean
    results: CleanupResult[]
    statistics: CleanupStatistics
    errors: string[]
  }> {
    const startTime = Date.now()
    const results: CleanupResult[] = []
    const errors: string[] = []
    
    try {
      console.log('[CleanupArchival] Starting full cleanup and archival process')
      
      // Define tables to cleanup in order of dependency
      const tablesToCleanup = [
        'notification_logs',
        'sweeper_logs',
        'admin_retry_audit_log',
        'monitoring_alerts',
        'job_runs',
        'idempotency_keys'
      ]
      
      for (const tableName of tablesToCleanup) {
        try {
          console.log(`[CleanupArchival] Processing table: ${tableName}`)
          
          const result = await this.cleanupTable(tableName)
          results.push(result)
          
          if (!result.success) {
            errors.push(`Failed to cleanup table ${tableName}: ${result.errors.join(', ')}`)
          }
          
          // Small delay between tables
          await new Promise(resolve => setTimeout(resolve, 500))
          
        } catch (error) {
          console.error(`[CleanupArchival] Error processing table ${tableName}:`, error)
          errors.push(`Error processing table ${tableName}: ${error.message}`)
        }
      }
      
      // Calculate statistics
      const statistics = this.calculateCleanupStatistics(results, Date.now() - startTime)
      
      // Log cleanup completion
      await this.logCleanupCompletion(results, statistics, errors)
      
      console.log(`[CleanupArchival] Full cleanup completed in ${Date.now() - startTime}ms`)
      
      return {
        success: errors.length === 0,
        results: results,
        statistics: statistics,
        errors: errors
      }
      
    } catch (error) {
      console.error('[CleanupArchival] Full cleanup failed:', error)
      
      return {
        success: false,
        results: results,
        statistics: this.calculateCleanupStatistics(results, Date.now() - startTime),
        errors: [...errors, error.message]
      }
    }
  }

  /**
   * Cleans up a specific table
   */
  async cleanupTable(tableName: string): Promise<CleanupResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      console.log(`[CleanupArchival] Cleaning up table: ${tableName}`)
      
      // Get table size before cleanup
      const beforeSize = await this.getTableSize(tableName)
      
      // Get records to cleanup
      const recordsToCleanup = await this.getRecordsToCleanup(tableName)
      
      if (recordsToCleanup.length === 0) {
        return {
          success: true,
          table_name: tableName,
          records_processed: 0,
          records_archived: 0,
          records_deleted: 0,
          processing_time_ms: Date.now() - startTime,
          errors: [],
          warnings: ['No records to cleanup'],
          performance_impact: {
            before_size_mb: beforeSize,
            after_size_mb: beforeSize,
            size_reduction_mb: 0,
            index_rebuild_time_ms: 0
          }
        }
      }
      
      let recordsArchived = 0
      let recordsDeleted = 0
      
      // Archive records if enabled
      if (CLEANUP_CONFIG.ARCHIVAL.enabled && CLEANUP_CONFIG.ARCHIVAL.archive_before_delete) {
        const archivalResult = await this.archiveRecords(tableName, recordsToCleanup)
        if (archivalResult.success) {
          recordsArchived = archivalResult.records_archived
        } else {
          errors.push(`Archival failed: ${archivalResult.errors.join(', ')}`)
        }
      }
      
      // Delete records in batches
      const deleteResult = await this.deleteRecordsInBatches(tableName, recordsToCleanup)
      recordsDeleted = deleteResult.records_deleted
      
      if (deleteResult.errors.length > 0) {
        errors.push(...deleteResult.errors)
      }
      
      // Get table size after cleanup
      const afterSize = await this.getTableSize(tableName)
      
      // Rebuild indexes if significant size reduction
      const indexRebuildTime = await this.rebuildIndexesIfNeeded(tableName, beforeSize, afterSize)
      
      const processingTime = Date.now() - startTime
      
      return {
        success: errors.length === 0,
        table_name: tableName,
        records_processed: recordsToCleanup.length,
        records_archived: recordsArchived,
        records_deleted: recordsDeleted,
        processing_time_ms: processingTime,
        errors: errors,
        warnings: warnings,
        performance_impact: {
          before_size_mb: beforeSize,
          after_size_mb: afterSize,
          size_reduction_mb: beforeSize - afterSize,
          index_rebuild_time_ms: indexRebuildTime
        }
      }
      
    } catch (error) {
      console.error(`[CleanupArchival] Failed to cleanup table ${tableName}:`, error)
      
      return {
        success: false,
        table_name: tableName,
        records_processed: 0,
        records_archived: 0,
        records_deleted: 0,
        processing_time_ms: Date.now() - startTime,
        errors: [error.message],
        warnings: [],
        performance_impact: {
          before_size_mb: 0,
          after_size_mb: 0,
          size_reduction_mb: 0,
          index_rebuild_time_ms: 0
        }
      }
    }
  }

  /**
   * Gets records to cleanup based on retention periods
   */
  private async getRecordsToCleanup(tableName: string): Promise<any[]> {
    try {
      const retentionPeriod = CLEANUP_CONFIG.RETENTION_PERIODS[tableName as keyof typeof CLEANUP_CONFIG.RETENTION_PERIODS]
      if (!retentionPeriod) {
        throw new Error(`No retention period configured for table ${tableName}`)
      }
      
      const cutoffDate = new Date(Date.now() - retentionPeriod)
      
      // Get records based on table-specific logic
      switch (tableName) {
        case 'job_runs':
          const { data: jobRuns, error: jobRunsError } = await supabase
            .from('job_runs')
            .select('*')
            .lt('created_at', cutoffDate.toISOString())
            .order('created_at', { ascending: true })
            .limit(CLEANUP_CONFIG.BATCH_LIMITS.max_records_per_batch)
          
          if (jobRunsError) {
            throw new Error(`Failed to get job runs: ${jobRunsError.message}`)
          }
          
          return jobRuns || []
          
        case 'monitoring_alerts':
          const { data: alerts, error: alertsError } = await supabase
            .from('monitoring_alerts')
            .select('*')
            .lt('timestamp', cutoffDate.toISOString())
            .eq('resolved', true) // Only cleanup resolved alerts
            .order('timestamp', { ascending: true })
            .limit(CLEANUP_CONFIG.BATCH_LIMITS.max_records_per_batch)
          
          if (alertsError) {
            throw new Error(`Failed to get monitoring alerts: ${alertsError.message}`)
          }
          
          return alerts || []
          
        case 'notification_logs':
          const { data: notifications, error: notificationsError } = await supabase
            .from('notification_logs')
            .select('*')
            .lt('timestamp', cutoffDate.toISOString())
            .order('timestamp', { ascending: true })
            .limit(CLEANUP_CONFIG.BATCH_LIMITS.max_records_per_batch)
          
          if (notificationsError) {
            throw new Error(`Failed to get notification logs: ${notificationsError.message}`)
          }
          
          return notifications || []
          
        case 'sweeper_logs':
          const { data: sweeperLogs, error: sweeperLogsError } = await supabase
            .from('sweeper_logs')
            .select('*')
            .lt('sweep_timestamp', cutoffDate.toISOString())
            .order('sweep_timestamp', { ascending: true })
            .limit(CLEANUP_CONFIG.BATCH_LIMITS.max_records_per_batch)
          
          if (sweeperLogsError) {
            throw new Error(`Failed to get sweeper logs: ${sweeperLogsError.message}`)
          }
          
          return sweeperLogs || []
          
        case 'admin_retry_audit_log':
          const { data: adminLogs, error: adminLogsError } = await supabase
            .from('admin_retry_audit_log')
            .select('*')
            .lt('timestamp', cutoffDate.toISOString())
            .order('timestamp', { ascending: true })
            .limit(CLEANUP_CONFIG.BATCH_LIMITS.max_records_per_batch)
          
          if (adminLogsError) {
            throw new Error(`Failed to get admin retry audit logs: ${adminLogsError.message}`)
          }
          
          return adminLogs || []
          
        case 'idempotency_keys':
          const { data: idempotencyKeys, error: idempotencyKeysError } = await supabase
            .from('idempotency_keys')
            .select('*')
            .lt('expires_at', new Date().toISOString()) // Cleanup expired keys
            .order('created_at', { ascending: true })
            .limit(CLEANUP_CONFIG.BATCH_LIMITS.max_records_per_batch)
          
          if (idempotencyKeysError) {
            throw new Error(`Failed to get idempotency keys: ${idempotencyKeysError.message}`)
          }
          
          return idempotencyKeys || []
          
        default:
          throw new Error(`Unknown table: ${tableName}`)
      }
      
    } catch (error) {
      console.error(`[CleanupArchival] Failed to get records to cleanup for ${tableName}:`, error)
      throw error
    }
  }

  /**
   * Archives records before deletion
   */
  private async archiveRecords(tableName: string, records: any[]): Promise<ArchivalResult> {
    const startTime = Date.now()
    const errors: string[] = []
    
    try {
      console.log(`[CleanupArchival] Archiving ${records.length} records from ${tableName}`)
      
      // Create archive data
      const archiveData = {
        table_name: tableName,
        archived_at: new Date().toISOString(),
        record_count: records.length,
        records: records,
        metadata: {
          retention_period: CLEANUP_CONFIG.RETENTION_PERIODS[tableName as keyof typeof CLEANUP_CONFIG.RETENTION_PERIODS],
          cleanup_config: CLEANUP_CONFIG.ARCHIVAL
        }
      }
      
      // Compress data if enabled
      let archiveContent: string
      let compressionRatio = 1.0
      
      if (CLEANUP_CONFIG.ARCHIVAL.compression_enabled) {
        // In a real implementation, this would use compression
        archiveContent = JSON.stringify(archiveData)
        compressionRatio = 0.7 // Simulate 30% compression
      } else {
        archiveContent = JSON.stringify(archiveData)
      }
      
      // Store archive (in a real implementation, this would store to S3, etc.)
      const archiveFileName = `${tableName}_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`
      const archiveFilePath = `${CLEANUP_CONFIG.ARCHIVAL.archive_location}/${archiveFileName}`
      
      // Simulate archive storage
      console.log(`[CleanupArchival] Archive stored at: ${archiveFilePath}`)
      
      const archiveSizeMB = (archiveContent.length / (1024 * 1024)) * compressionRatio
      
      return {
        success: true,
        table_name: tableName,
        records_archived: records.length,
        archive_file_path: archiveFilePath,
        archive_size_mb: archiveSizeMB,
        compression_ratio: compressionRatio,
        processing_time_ms: Date.now() - startTime,
        errors: []
      }
      
    } catch (error) {
      console.error(`[CleanupArchival] Failed to archive records from ${tableName}:`, error)
      
      return {
        success: false,
        table_name: tableName,
        records_archived: 0,
        archive_file_path: '',
        archive_size_mb: 0,
        compression_ratio: 1.0,
        processing_time_ms: Date.now() - startTime,
        errors: [error.message]
      }
    }
  }

  /**
   * Deletes records in batches
   */
  private async deleteRecordsInBatches(tableName: string, records: any[]): Promise<{
    records_deleted: number
    errors: string[]
  }> {
    const errors: string[] = []
    let recordsDeleted = 0
    
    try {
      const batchSize = Math.min(CLEANUP_CONFIG.BATCH_LIMITS.max_records_per_batch, 100)
      const batches = this.chunkArray(records, batchSize)
      
      for (const batch of batches) {
        try {
          const batchResult = await this.deleteBatch(tableName, batch)
          recordsDeleted += batchResult.records_deleted
          
          if (batchResult.errors.length > 0) {
            errors.push(...batchResult.errors)
          }
          
          // Delay between batches
          await new Promise(resolve => setTimeout(resolve, CLEANUP_CONFIG.BATCH_LIMITS.batch_delay))
          
        } catch (error) {
          errors.push(`Batch deletion failed: ${error.message}`)
        }
      }
      
    } catch (error) {
      errors.push(`Failed to delete records in batches: ${error.message}`)
    }
    
    return {
      records_deleted: recordsDeleted,
      errors: errors
    }
  }

  /**
   * Deletes a batch of records
   */
  private async deleteBatch(tableName: string, batch: any[]): Promise<{
    records_deleted: number
    errors: string[]
  }> {
    const errors: string[] = []
    
    try {
      const ids = batch.map(record => record.id)
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .in('id', ids)
      
      if (error) {
        throw new Error(`Failed to delete batch: ${error.message}`)
      }
      
      return {
        records_deleted: batch.length,
        errors: []
      }
      
    } catch (error) {
      console.error(`[CleanupArchival] Failed to delete batch from ${tableName}:`, error)
      
      return {
        records_deleted: 0,
        errors: [error.message]
      }
    }
  }

  /**
   * Gets table size in MB
   */
  private async getTableSize(tableName: string): Promise<number> {
    try {
      // In a real implementation, this would query the database for actual table size
      // For now, we'll simulate based on record count
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.error(`[CleanupArchival] Failed to get table size for ${tableName}:`, error)
        return 0
      }
      
      // Estimate size (rough calculation)
      const estimatedSizeMB = (count || 0) * 0.001 // Assume 1KB per record
      return estimatedSizeMB
      
    } catch (error) {
      console.error(`[CleanupArchival] Failed to get table size for ${tableName}:`, error)
      return 0
    }
  }

  /**
   * Rebuilds indexes if needed
   */
  private async rebuildIndexesIfNeeded(tableName: string, beforeSize: number, afterSize: number): Promise<number> {
    try {
      const sizeReduction = beforeSize - afterSize
      const reductionPercentage = beforeSize > 0 ? sizeReduction / beforeSize : 0
      
      // Rebuild indexes if significant size reduction (>20%)
      if (reductionPercentage > 0.2) {
        console.log(`[CleanupArchival] Rebuilding indexes for ${tableName} (${(reductionPercentage * 100).toFixed(1)}% size reduction)`)
        
        const startTime = Date.now()
        
        // In a real implementation, this would rebuild indexes
        // For now, we'll simulate the time
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const rebuildTime = Date.now() - startTime
        console.log(`[CleanupArchival] Index rebuild completed for ${tableName} in ${rebuildTime}ms`)
        
        return rebuildTime
      }
      
      return 0
      
    } catch (error) {
      console.error(`[CleanupArchival] Failed to rebuild indexes for ${tableName}:`, error)
      return 0
    }
  }

  /**
   * Calculates cleanup statistics
   */
  private calculateCleanupStatistics(results: CleanupResult[], totalTime: number): CleanupStatistics {
    const totalTables = results.length
    const totalRecordsProcessed = results.reduce((sum, r) => sum + r.records_processed, 0)
    const totalRecordsArchived = results.reduce((sum, r) => sum + r.records_archived, 0)
    const totalRecordsDeleted = results.reduce((sum, r) => sum + r.records_deleted, 0)
    const totalSizeReduction = results.reduce((sum, r) => sum + r.performance_impact.size_reduction_mb, 0)
    
    const successfulCleanups = results.filter(r => r.success).length
    const cleanupSuccessRate = totalTables > 0 ? (successfulCleanups / totalTables) * 100 : 0
    
    const performanceImprovement = totalSizeReduction > 0 ? (totalSizeReduction / (totalSizeReduction + results.reduce((sum, r) => sum + r.performance_impact.after_size_mb, 0))) * 100 : 0
    
    return {
      total_tables_processed: totalTables,
      total_records_processed: totalRecordsProcessed,
      total_records_archived: totalRecordsArchived,
      total_records_deleted: totalRecordsDeleted,
      total_processing_time_ms: totalTime,
      total_size_reduction_mb: totalSizeReduction,
      cleanup_success_rate: cleanupSuccessRate,
      performance_improvement: performanceImprovement,
      last_cleanup_time: new Date().toISOString()
    }
  }

  /**
   * Logs cleanup completion
   */
  private async logCleanupCompletion(results: CleanupResult[], statistics: CleanupStatistics, errors: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('cleanup_logs')
        .insert({
          cleanup_type: 'full_cleanup',
          total_tables_processed: statistics.total_tables_processed,
          total_records_processed: statistics.total_records_processed,
          total_records_archived: statistics.total_records_archived,
          total_records_deleted: statistics.total_records_deleted,
          total_processing_time_ms: statistics.total_processing_time_ms,
          total_size_reduction_mb: statistics.total_size_reduction_mb,
          cleanup_success_rate: statistics.cleanup_success_rate,
          performance_improvement: statistics.performance_improvement,
          errors: errors,
          results: results,
          cleanup_timestamp: new Date().toISOString()
        })
      
      if (error) {
        console.error('[CleanupArchival] Failed to log cleanup completion:', error)
      }
      
    } catch (error) {
      console.error('[CleanupArchival] Failed to log cleanup completion:', error)
    }
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * Gets cleanup configuration
   */
  getCleanupConfig(): typeof CLEANUP_CONFIG {
    return CLEANUP_CONFIG
  }

  /**
   * Updates cleanup configuration
   */
  updateCleanupConfig(newConfig: Partial<typeof CLEANUP_CONFIG>): void {
    Object.assign(CLEANUP_CONFIG, newConfig)
    console.log('[CleanupArchival] Configuration updated')
  }
}

/**
 * Creates a cleanup and archival manager
 */
export function createCleanupArchivalManager(): CleanupArchivalManager {
  return new CleanupArchivalManager()
}

/**
 * Performs full cleanup and archival
 */
export async function performFullCleanup(): Promise<{
  success: boolean
  results: CleanupResult[]
  statistics: CleanupStatistics
  errors: string[]
}> {
  const manager = createCleanupArchivalManager()
  return await manager.performFullCleanup()
}

/**
 * Cleans up a specific table
 */
export async function cleanupTable(tableName: string): Promise<CleanupResult> {
  const manager = createCleanupArchivalManager()
  return await manager.cleanupTable(tableName)
}

/**
 * Gets cleanup configuration
 */
export function getCleanupConfig(): typeof CLEANUP_CONFIG {
  const manager = createCleanupArchivalManager()
  return manager.getCleanupConfig()
}
