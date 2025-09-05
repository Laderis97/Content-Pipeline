// Concurrent job processing support
// PRD Reference: Functional Requirements 6, 37, 46, 109

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  ContentJob, 
  ProcessingResult, 
  JobRun,
  PerformanceMetrics
} from './types.ts'
import { orchestrateContentGeneration } from './content-orchestrator.ts'
import { getJobStatistics } from './job-claiming.ts'

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configuration
const MAX_CONCURRENT_JOBS = parseInt(Deno.env.get('MAX_CONCURRENT_JOBS') || '5')
const PROCESSING_TIMEOUT_MS = parseInt(Deno.env.get('PROCESSING_TIMEOUT_MS') || '30000')
const BATCH_SIZE = parseInt(Deno.env.get('BATCH_SIZE') || '3')

interface ConcurrentProcessingResult {
  total_processed: number
  successful: number
  failed: number
  concurrent_executions: number
  total_duration_ms: number
  results: ProcessingResult[]
  errors: string[]
}

interface ProcessingSlot {
  id: string
  job_id?: string
  start_time: number
  promise?: Promise<ProcessingResult>
  status: 'idle' | 'processing' | 'completed' | 'failed'
}

/**
 * Processes multiple jobs concurrently with controlled parallelism
 */
export async function processJobsConcurrently(
  maxJobs: number = MAX_CONCURRENT_JOBS
): Promise<ConcurrentProcessingResult> {
  const startTime = Date.now()
  const results: ProcessingResult[] = []
  const errors: string[] = []
  let successful = 0
  let failed = 0
  
  console.log(`Starting concurrent processing with max ${maxJobs} simultaneous jobs`)
  
  // Create processing slots
  const slots: ProcessingSlot[] = Array.from({ length: maxJobs }, (_, i) => ({
    id: `slot-${i}`,
    start_time: 0,
    status: 'idle'
  }))
  
  // Process jobs in batches
  let totalProcessed = 0
  let hasMoreJobs = true
  
  while (hasMoreJobs && totalProcessed < 50) { // Safety limit to prevent infinite loops
    const availableSlots = slots.filter(slot => slot.status === 'idle' || slot.status === 'completed')
    
    if (availableSlots.length === 0) {
      // Wait for at least one slot to become available
      await waitForSlotCompletion(slots)
      continue
    }
    
    // Start new jobs in available slots
    const jobsToStart = Math.min(availableSlots.length, BATCH_SIZE)
    const promises: Promise<ProcessingResult>[] = []
    
    for (let i = 0; i < jobsToStart; i++) {
      const slot = availableSlots[i]
      const promise = processJobInSlot(slot)
      promises.push(promise)
    }
    
    // Wait for batch completion or timeout
    try {
      const batchResults = await Promise.allSettled(promises)
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
          if (result.value.success) {
            successful++
          } else {
            failed++
            if (result.value.error) {
              errors.push(result.value.error)
            }
          }
          totalProcessed++
        } else {
          failed++
          errors.push(`Promise rejected: ${result.reason}`)
          totalProcessed++
        }
      }
      
      // Check if we should continue processing
      hasMoreJobs = await hasPendingJobs()
      
    } catch (error) {
      console.error('Error in concurrent processing batch:', error)
      errors.push(`Batch processing error: ${error.message}`)
      break
    }
  }
  
  const totalDuration = Date.now() - startTime
  const concurrentExecutions = Math.min(maxJobs, totalProcessed)
  
  console.log(`Concurrent processing completed: ${totalProcessed} jobs in ${totalDuration}ms`)
  console.log(`Success: ${successful}, Failed: ${failed}, Concurrent: ${concurrentExecutions}`)
  
  return {
    total_processed: totalProcessed,
    successful,
    failed,
    concurrent_executions: concurrentExecutions,
    total_duration_ms: totalDuration,
    results,
    errors
  }
}

/**
 * Processes a single job in a processing slot
 */
async function processJobInSlot(slot: ProcessingSlot): Promise<ProcessingResult> {
  slot.status = 'processing'
  slot.start_time = Date.now()
  
  try {
    console.log(`Starting job processing in slot ${slot.id}`)
    
    // Set a timeout for the job processing
    const timeoutPromise = new Promise<ProcessingResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Job processing timeout after ${PROCESSING_TIMEOUT_MS}ms`))
      }, PROCESSING_TIMEOUT_MS)
    })
    
    // Race between job processing and timeout
    const result = await Promise.race([
      orchestrateContentGeneration(),
      timeoutPromise
    ])
    
    slot.status = result.success ? 'completed' : 'failed'
    slot.job_id = result.job_id
    
    console.log(`Job processing completed in slot ${slot.id}: ${result.success ? 'success' : 'failed'}`)
    
    return result
    
  } catch (error) {
    slot.status = 'failed'
    console.error(`Job processing failed in slot ${slot.id}:`, error)
    
    return {
      success: false,
      error: error.message,
      timings: {
        function_start: slot.start_time,
        function_end: Date.now(),
        total_duration: Date.now() - slot.start_time
      }
    }
  }
}

/**
 * Waits for at least one processing slot to become available
 */
async function waitForSlotCompletion(slots: ProcessingSlot[]): Promise<void> {
  return new Promise((resolve) => {
    const checkSlots = () => {
      const availableSlots = slots.filter(slot => slot.status === 'idle' || slot.status === 'completed')
      if (availableSlots.length > 0) {
        resolve()
      } else {
        setTimeout(checkSlots, 100) // Check every 100ms
      }
    }
    checkSlots()
  })
}

/**
 * Checks if there are pending jobs available for processing
 */
async function hasPendingJobs(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('content_jobs')
      .select('id')
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .limit(1)
    
    if (error) {
      console.error('Error checking for pending jobs:', error)
      return false
    }
    
    return data && data.length > 0
  } catch (error) {
    console.error('Exception checking for pending jobs:', error)
    return false
  }
}

/**
 * Gets current processing statistics
 */
export async function getProcessingStatistics(): Promise<{
  active_jobs: number
  pending_jobs: number
  processing_jobs: number
  completed_today: number
  failed_today: number
  avg_processing_time_ms: number
  concurrent_capacity: number
}> {
  try {
    const stats = await getJobStatistics()
    
    // Get today's job runs
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todayRuns, error } = await supabase
      .from('job_runs')
      .select('status, function_duration_ms')
      .gte('execution_time', today.toISOString())
    
    if (error) {
      console.error('Error getting today\'s job runs:', error)
    }
    
    const completedToday = todayRuns?.filter(run => run.status === 'completed').length || 0
    const failedToday = todayRuns?.filter(run => run.status === 'failed').length || 0
    const avgProcessingTime = todayRuns?.reduce((sum, run) => sum + (run.function_duration_ms || 0), 0) / (todayRuns?.length || 1) || 0
    
    return {
      active_jobs: stats.processing_jobs,
      pending_jobs: stats.pending_jobs,
      processing_jobs: stats.processing_jobs,
      completed_today: completedToday,
      failed_today: failedToday,
      avg_processing_time_ms: Math.round(avgProcessingTime),
      concurrent_capacity: MAX_CONCURRENT_JOBS
    }
    
  } catch (error) {
    console.error('Error getting processing statistics:', error)
    throw error
  }
}

/**
 * Monitors concurrent processing health
 */
export async function monitorConcurrentProcessing(): Promise<{
  healthy: boolean
  issues: string[]
  recommendations: string[]
}> {
  const issues: string[] = []
  const recommendations: string[] = []
  
  try {
    const stats = await getProcessingStatistics()
    
    // Check for stuck processing jobs
    if (stats.processing_jobs > MAX_CONCURRENT_JOBS) {
      issues.push(`Too many processing jobs: ${stats.processing_jobs} (max: ${MAX_CONCURRENT_JOBS})`)
      recommendations.push('Check for stuck processing jobs and run sweeper function')
    }
    
    // Check processing time
    if (stats.avg_processing_time_ms > 10000) { // 10 seconds
      issues.push(`High average processing time: ${stats.avg_processing_time_ms}ms`)
      recommendations.push('Investigate performance bottlenecks in OpenAI or WordPress APIs')
    }
    
    // Check failure rate
    const totalToday = stats.completed_today + stats.failed_today
    if (totalToday > 0) {
      const failureRate = (stats.failed_today / totalToday) * 100
      if (failureRate > 20) {
        issues.push(`High failure rate: ${failureRate.toFixed(1)}%`)
        recommendations.push('Check error logs and investigate API issues')
      }
    }
    
    // Check pending job backlog
    if (stats.pending_jobs > 20) {
      issues.push(`Large pending job backlog: ${stats.pending_jobs} jobs`)
      recommendations.push('Consider increasing concurrent processing capacity')
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    }
    
  } catch (error) {
    console.error('Error monitoring concurrent processing:', error)
    return {
      healthy: false,
      issues: [`Monitoring error: ${error.message}`],
      recommendations: ['Check system health and database connectivity']
    }
  }
}

/**
 * Optimizes concurrent processing based on current load
 */
export async function optimizeConcurrentProcessing(): Promise<{
  recommended_concurrent_jobs: number
  recommended_batch_size: number
  reasoning: string[]
}> {
  const reasoning: string[] = []
  let recommendedConcurrent = MAX_CONCURRENT_JOBS
  let recommendedBatch = BATCH_SIZE
  
  try {
    const stats = await getProcessingStatistics()
    
    // Adjust based on pending jobs
    if (stats.pending_jobs > 50) {
      recommendedConcurrent = Math.min(MAX_CONCURRENT_JOBS + 2, 8)
      reasoning.push(`High pending job count (${stats.pending_jobs}), increasing concurrent capacity`)
    } else if (stats.pending_jobs < 5) {
      recommendedConcurrent = Math.max(MAX_CONCURRENT_JOBS - 1, 2)
      reasoning.push(`Low pending job count (${stats.pending_jobs}), reducing concurrent capacity`)
    }
    
    // Adjust based on processing time
    if (stats.avg_processing_time_ms > 15000) { // 15 seconds
      recommendedBatch = Math.max(BATCH_SIZE - 1, 1)
      reasoning.push(`High processing time (${stats.avg_processing_time_ms}ms), reducing batch size`)
    } else if (stats.avg_processing_time_ms < 5000) { // 5 seconds
      recommendedBatch = Math.min(BATCH_SIZE + 1, 5)
      reasoning.push(`Low processing time (${stats.avg_processing_time_ms}ms), increasing batch size`)
    }
    
    // Adjust based on failure rate
    const totalToday = stats.completed_today + stats.failed_today
    if (totalToday > 0) {
      const failureRate = (stats.failed_today / totalToday) * 100
      if (failureRate > 15) {
        recommendedConcurrent = Math.max(recommendedConcurrent - 1, 2)
        reasoning.push(`High failure rate (${failureRate.toFixed(1)}%), reducing concurrent capacity`)
      }
    }
    
    if (reasoning.length === 0) {
      reasoning.push('Current settings are optimal for the current load')
    }
    
    return {
      recommended_concurrent_jobs: recommendedConcurrent,
      recommended_batch_size: recommendedBatch,
      reasoning
    }
    
  } catch (error) {
    console.error('Error optimizing concurrent processing:', error)
    return {
      recommended_concurrent_jobs: MAX_CONCURRENT_JOBS,
      recommended_batch_size: BATCH_SIZE,
      reasoning: [`Optimization error: ${error.message}`]
    }
  }
}
