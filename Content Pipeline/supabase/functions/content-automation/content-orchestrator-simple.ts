// Content generation orchestration flow - Simplified version
// PRD Reference: Functional Requirements 1-6, 12-15, 32-35, 46-50

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  ContentJob, 
  JobRun, 
  ProcessingResult, 
  ContentGenerationResponse,
  ContentValidationResult,
  PerformanceMetrics
} from './types.ts'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Main orchestration function for content generation
 * Flow: claim → generate → validate → post → update
 */
export async function orchestrateContentGeneration(): Promise<ProcessingResult> {
  const functionStart = Date.now()
  let job: ContentJob | null = null
  let jobRun: JobRun | null = null
  
  try {
    console.log('Starting content generation orchestration...')
    
    // Step 1: Claim next available job
    console.log('Step 1: Claiming next available job...')
    const claimResult = await claimNextJob()
    
    if (!claimResult.success || !claimResult.job) {
      return createFailureResult(
        functionStart,
        'No pending jobs available',
        null,
        null
      )
    }
    
    job = claimResult.job
    console.log(`Claimed job: ${job.id} - Topic: ${job.topic}`)
    
    // Step 2: Create job run record for tracking
    jobRun = await createJobRunLog(job.id, 'started', job.retry_count)
    console.log(`Created job run: ${jobRun.id}`)
    
    // Step 3: Generate content using OpenAI
    console.log('Step 3: Generating content with OpenAI...')
    const contentResult = await generateContent(job)
    
    if (!contentResult.success) {
      await handleJobFailure(job.id, contentResult.error!, jobRun.id)
      return createFailureResult(
        functionStart,
        contentResult.error!,
        job.id,
        jobRun.id
      )
    }
    
    console.log(`Content generated successfully: ${contentResult.generated_title}`)
    
    // Step 4: Validate generated content
    console.log('Step 4: Validating generated content...')
    const validationResult = await validateContent(contentResult)
    
    if (!validationResult.is_valid) {
      const errorMessage = `Content validation failed: ${validationResult.errors.join(', ')}`
      await handleJobFailure(job.id, errorMessage, jobRun.id)
      return createFailureResult(
        functionStart,
        errorMessage,
        job.id,
        jobRun.id
      )
    }
    
    console.log('Content validation passed')
    
    // Step 5: Post to WordPress
    console.log('Step 5: Posting to WordPress...')
    const wordpressResult = await postToWordPress(job, contentResult)
    
    if (!wordpressResult.success) {
      await handleJobFailure(job.id, wordpressResult.error!, jobRun.id)
      return createFailureResult(
        functionStart,
        wordpressResult.error!,
        job.id,
        jobRun.id
      )
    }
    
    console.log(`Posted to WordPress: ${wordpressResult.post_id}`)
    
    // Step 6: Complete job
    console.log('Step 6: Completing job...')
    const completeResult = await completeJob(
      job.id,
      contentResult.generated_title!,
      contentResult.generated_content!,
      wordpressResult.post_id!
    )
    
    if (!completeResult.success) {
      await handleJobFailure(job.id, completeResult.error!, jobRun.id)
      return createFailureResult(
        functionStart,
        completeResult.error!,
        job.id,
        jobRun.id
      )
    }
    
    // Update job run status
    await updateJobRun(jobRun.id, 'completed', {
      wordpress_post_id: wordpressResult.post_id,
      generated_title: contentResult.generated_title,
      generated_content: contentResult.generated_content
    })
    
    const functionEnd = Date.now()
    const totalDuration = functionEnd - functionStart
    
    console.log(`Content generation orchestration completed successfully in ${totalDuration}ms`)
    
    return {
      success: true,
      job_id: job.id,
      wordpress_post_id: wordpressResult.post_id,
      generated_title: contentResult.generated_title,
      generated_content: contentResult.generated_content,
      timings: {
        function_start: functionStart,
        function_end: functionEnd,
        total_duration: totalDuration
      }
    }
    
  } catch (error) {
    console.error('Unexpected error in orchestrateContentGeneration:', error)
    
    if (job) {
      await handleJobFailure(job.id, error.message, jobRun?.id)
    }
    
    return createFailureResult(
      functionStart,
      error.message,
      job?.id,
      jobRun?.id
    )
  }
}

/**
 * Creates a standardized failure result
 */
function createFailureResult(
  functionStart: number,
  errorMessage: string,
  jobId?: string,
  jobRunId?: string,
  timings?: { openai_duration?: number; wordpress_duration?: number }
): ProcessingResult {
  const functionEnd = Date.now()
  
  return {
    success: false,
    job_id: jobId,
    error: errorMessage,
    timings: {
      function_start: functionStart,
      function_end: functionEnd,
      total_duration: functionEnd - functionStart,
      openai_duration: timings?.openai_duration,
      wordpress_duration: timings?.wordpress_duration
    }
  }
}

// Placeholder functions - will be implemented in subsequent tasks
async function claimNextJob(): Promise<{ success: boolean; job?: ContentJob; error?: string }> {
  // Implementation will be added
  return { success: false, error: 'Not implemented' }
}

async function createJobRunLog(jobId: string, status: string, retryCount: number): Promise<JobRun> {
  // Implementation will be added
  return { job_id: jobId, status: 'started' as any, retry_attempt: retryCount }
}

async function generateContent(job: ContentJob): Promise<ContentGenerationResponse> {
  // Implementation will be added
  return { success: false, error: 'Not implemented' }
}

async function validateContent(content: ContentGenerationResponse): Promise<ContentValidationResult> {
  // Implementation will be added
  return { is_valid: false, errors: ['Not implemented'] }
}

async function postToWordPress(job: ContentJob, content: ContentGenerationResponse): Promise<{ success: boolean; post_id?: number; error?: string }> {
  // Implementation will be added
  return { success: false, error: 'Not implemented' }
}

async function completeJob(jobId: string, title: string, content: string, postId: number): Promise<{ success: boolean; error?: string }> {
  // Implementation will be added
  return { success: false, error: 'Not implemented' }
}

async function handleJobFailure(jobId: string, error: string, jobRunId?: string): Promise<void> {
  // Implementation will be added
  console.error(`Job ${jobId} failed: ${error}`)
}

async function updateJobRun(jobRunId: string, status: string, data: any): Promise<void> {
  // Implementation will be added
  console.log(`Job run ${jobRunId} updated to ${status}`)
}
