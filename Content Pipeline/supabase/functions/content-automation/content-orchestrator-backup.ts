// Content generation orchestration flow
// PRD Reference: Functional Requirements 1-6, 12-15, 32-35, 46-50

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  ContentJob, 
  JobRun, 
  ProcessingResult, 
  ContentGenerationResponse,
  ContentValidationResult,
  WordPressPostResponse,
  PerformanceMetrics
} from './types.ts'
import { 
  claimNextJob, 
  releaseJob, 
  completeJob, 
  failJob 
} from './job-claiming.ts'
import { 
  createJobRunLog,
  updateJobRunLog,
  logProcessingStep,
  logJobCompletion,
  createLoggingContext,
  logFunctionEntry,
  logFunctionExit,
  logPerformanceMetrics
} from './execution-logger.ts'
import { 
  generateContentFingerprint,
  checkForDuplicates,
  createIdempotencyKey,
  markJobAsProcessed
} from './idempotency-manager.ts'
import { PerformanceMonitor } from './performance-monitor.ts'
import { generateContent } from './openai-client.ts'
import { validateContent } from './content-validator.ts'
import { postToWordPress } from './wordpress-client.ts'
import { getTaxonomyForJob } from './wordpress-taxonomy.ts'
import { createRetryTracker, recordRetryAttempt, recordSuccess } from './retry-tracker.ts'
import { 
  createWordPressUnavailabilityHandler,
  checkWordPressUnavailability,
  requeueJobForWordPressUnavailability
} from './wordpress-unavailability-handler.ts'
import { 
  createOpenAIFailureHandler,
  analyzeOpenAIFailure,
  requeueJobForOpenAIFailure
} from './openai-failure-handler.ts'
import { 
  createGracefulDegradationManager,
  handlePartialFailure,
  PARTIAL_FAILURE_TYPES
} from './graceful-degradation.ts'

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Main orchestration function that coordinates the entire content generation pipeline
 * Flow: claim → generate → validate → post → update
 */
export async function orchestrateContentGeneration(): Promise<ProcessingResult> {
  const functionStart = Date.now()
  let job: ContentJob | null = null
  let jobRun: JobRun | null = null
  let loggingContext: any = null
  const performanceMonitor = new PerformanceMonitor()
  
  try {
    console.log('Starting content generation orchestration...')
    performanceMonitor.startMeasurement('content_generation_orchestration')
    
    // Step 1: Claim next available job
    console.log('Step 1: Claiming next available job...')
    const claimStart = Date.now()
    const claimResult = await claimNextJob()
    const claimDuration = Date.now() - claimStart
    performanceMonitor.recordDatabasePerformance(claimDuration, 'job_claim')
    
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
    
    // Create logging context
    loggingContext = createLoggingContext(job.id, 'content-orchestrator', job.retry_count)
    logFunctionEntry(loggingContext, { topic: job.topic, retry_count: job.retry_count })
    
    // Step 2: Create job run record for tracking
    jobRun = await createJobRunLog(job.id, 'started', job.retry_count)
    console.log(`Created job run: ${jobRun.id}`)
    
    // Log claim step
    await logProcessingStep(jobRun.id, 'job_claim', claimStart, Date.now(), true, undefined, {
      job_id: job.id,
      topic: job.topic,
      retry_count: job.retry_count
    })
    
    // Step 2.5: Check for duplicates before processing
    console.log('Step 2.5: Checking for duplicates...')
    const duplicateCheckStart = Date.now()
    const topicFingerprint = generateContentFingerprint(job.topic)
    const duplicateResult = await checkForDuplicates(job, topicFingerprint)
    const duplicateCheckDuration = Date.now() - duplicateCheckStart
    
    // Log duplicate check step
    await logProcessingStep(jobRun.id, 'duplicate_check', duplicateCheckStart, Date.now(), !duplicateResult.is_duplicate, duplicateResult.is_duplicate ? `Duplicate found: ${duplicateResult.duplicate_type}` : undefined, {
      is_duplicate: duplicateResult.is_duplicate,
      duplicate_type: duplicateResult.duplicate_type,
      confidence_score: duplicateResult.confidence_score,
      existing_job_id: duplicateResult.existing_job_id
    })
    
    if (duplicateResult.is_duplicate) {
      const errorMessage = `Duplicate ${duplicateResult.duplicate_type} detected (confidence: ${duplicateResult.confidence_score})`
      await handleJobFailure(job.id, errorMessage, jobRun.id)
      logFunctionExit(loggingContext, false, null, errorMessage)
      return createFailureResult(
        functionStart,
        errorMessage,
        job.id,
        jobRun.id
      )
    }
    
    console.log('No duplicates found, proceeding with content generation')
    
    // Step 3: Generate content using OpenAI
    console.log('Step 3: Generating content with OpenAI...')
    const openaiStart = Date.now()
    const contentResult = await generateContent(job)
    const openaiDuration = Date.now() - openaiStart
    performanceMonitor.recordOpenAIPerformance(openaiDuration, contentResult.tokens_used)
    
    // Log OpenAI step
    await logProcessingStep(jobRun.id, 'openai_generation', openaiStart, Date.now(), contentResult.success, contentResult.error, {
      model: job.model,
      prompt_template: job.prompt_template,
      word_count: contentResult.word_count
    })
    
    if (!contentResult.success) {
      // Try graceful degradation for content generation failure
      const degradationResult = await handlePartialFailure(
        job,
        PARTIAL_FAILURE_TYPES.CONTENT_GENERATION,
        {
          error: contentResult.error,
          model: job.model,
          prompt_template: job.prompt_template
        },
        job.retry_count || 0
      )
      
      if (degradationResult.success && degradationResult.degraded) {
        console.log(`[GracefulDegradation] Content generation degraded: ${degradationResult.degradation_strategy}`)
        
        // Log degradation step
        await logProcessingStep(jobRun.id, 'content_generation_degradation', Date.now(), Date.now(), true, null, {
          degradation_strategy: degradationResult.degradation_strategy,
          fallback_data: degradationResult.fallback_data,
          warnings: degradationResult.warnings,
          next_steps: degradationResult.next_steps
        })
        
        // Apply degradation strategy
        if (degradationResult.degradation_strategy === 'fallback_model' && degradationResult.fallback_data?.model) {
          // Retry with fallback model
          const fallbackResult = await generateContent({
            ...job,
            model: degradationResult.fallback_data.model
          })
          
          if (fallbackResult.success) {
            console.log(`[GracefulDegradation] Content generated successfully with fallback model: ${degradationResult.fallback_data.model}`)
            // Continue with the fallback result
            contentResult.success = true
            contentResult.generated_title = fallbackResult.generated_title
            contentResult.generated_content = fallbackResult.generated_content
            contentResult.model_used = fallbackResult.model_used
            contentResult.tokens_used = fallbackResult.tokens_used
          }
        } else if (degradationResult.degradation_strategy === 'template_fallback') {
          // Use template fallback
          const templateResult = await generateContentWithTemplate(job)
          if (templateResult.success) {
            console.log(`[GracefulDegradation] Content generated successfully with template fallback`)
            contentResult.success = true
            contentResult.generated_title = templateResult.generated_title
            contentResult.generated_content = templateResult.generated_content
            contentResult.model_used = templateResult.model_used
            contentResult.tokens_used = templateResult.tokens_used
          }
        }
      }
      
      // If graceful degradation didn't work, proceed with normal error handling
      if (!contentResult.success) {
        // Check for OpenAI API failure
        const failureResult = await analyzeOpenAIFailure(new Error(contentResult.error!))
        
        if (failureResult.is_failure && failureResult.should_requeue) {
        console.log(`[OpenAI] OpenAI API failure detected: ${failureResult.category.description}`)
        
        // Requeue job for OpenAI API failure
        const requeueResult = await requeueJobForOpenAIFailure(
          job.id,
          new Error(contentResult.error!),
          job.retry_count || 0
        )
        
        if (requeueResult.success) {
          console.log(`[OpenAI] Job ${job.id} requeued due to OpenAI API failure: ${requeueResult.requeue_reason}`)
          
          // Log requeue step
          await logProcessingStep(jobRun.id, 'openai_requeue', Date.now(), Date.now(), true, null, {
            requeue_reason: requeueResult.requeue_reason,
            retry_count: requeueResult.retry_count,
            next_retry_at: requeueResult.next_retry_at,
            failure_category: failureResult.category.category,
            failure_severity: failureResult.category.severity
          })
          
          logFunctionExit(loggingContext, false, null, `OpenAI API failure - job requeued: ${failureResult.category.description}`)
          return createFailureResult(
            functionStart,
            `OpenAI API failure - job requeued: ${failureResult.category.description}`,
            job.id,
            jobRun.id,
            { 
              openai_duration: openaiDuration,
              requeued: true,
              requeue_reason: failureResult.category.description,
              retry_count: requeueResult.retry_count,
              failure_category: failureResult.category.category
            }
          )
        } else {
          console.error(`[OpenAI] Failed to requeue job ${job.id}: ${requeueResult.error}`)
        }
      }
      
      // Record retry attempt for content generation failure
      const retryResult = await recordRetryAttempt(job.id, new Error(contentResult.error!), true)
      console.log(`Content generation retry attempt recorded: ${retryResult.retry_count}/${3}`)
      
      await handleJobFailure(job.id, contentResult.error!, jobRun.id)
      logFunctionExit(loggingContext, false, null, contentResult.error)
      return createFailureResult(
        functionStart,
        contentResult.error!,
        job.id,
        jobRun.id,
        { openai_duration: openaiDuration }
      )
    }
    
    console.log(`Content generated successfully: ${contentResult.generated_title}`)
    
    // Step 3.5: Check for content duplicates after generation
    console.log('Step 3.5: Checking for content duplicates...')
    const contentFingerprint = generateContentFingerprint(job.topic, contentResult.generated_content, contentResult.generated_title)
    const contentDuplicateResult = await checkForDuplicates(job, contentFingerprint)
    
    if (contentDuplicateResult.is_duplicate) {
      const errorMessage = `Duplicate content detected after generation (confidence: ${contentDuplicateResult.confidence_score})`
      await handleJobFailure(job.id, errorMessage, jobRun.id)
      logFunctionExit(loggingContext, false, null, errorMessage)
      return createFailureResult(
        functionStart,
        errorMessage,
        job.id,
        jobRun.id,
        { openai_duration: openaiDuration }
      )
    }
    
    console.log('No content duplicates found, proceeding with validation')
    
    // Step 4: Validate generated content
    console.log('Step 4: Validating generated content...')
    const validationStart = Date.now()
    const validationResult = await validateContent(
      contentResult.generated_content!,
      contentResult.generated_title!,
      job.topic
    )
    const validationDuration = Date.now() - validationStart
    
    // Log validation step
    await logProcessingStep(jobRun.id, 'content_validation', validationStart, Date.now(), validationResult.valid, validationResult.error, {
      word_count: validationResult.word_count,
      has_title: validationResult.has_title,
      has_content: validationResult.has_content,
      meets_minimum_length: validationResult.meets_minimum_length
    })
    
    if (!validationResult.valid) {
      await handleJobFailure(job.id, validationResult.error!, jobRun.id)
      logFunctionExit(loggingContext, false, null, validationResult.error)
      return createFailureResult(
        functionStart,
        validationResult.error!,
        job.id,
        jobRun.id,
        { openai_duration: openaiDuration }
      )
    }
    
    console.log('Content validation passed')
    
    // Step 5: Get taxonomy suggestions and post to WordPress
    console.log('Step 5: Getting taxonomy suggestions and posting to WordPress...')
    const wordpressStart = Date.now()
    
    // Get taxonomy suggestions with fallback defaults
    const taxonomyResult = await getTaxonomyForJob({
      topic: job.topic,
      content_type: job.content_type,
      tags: job.tags,
      categories: job.categories
    })
    
    console.log(`[Taxonomy] Resolved ${taxonomyResult.categories.length} categories and ${taxonomyResult.tags.length} tags`)
    console.log(`[Taxonomy] Suggestions: ${taxonomyResult.suggestions.categories.join(', ')} categories, ${taxonomyResult.suggestions.tags.join(', ')} tags`)
    
    const wordpressResult = await postToWordPress(
      contentResult.generated_title!,
      contentResult.generated_content!,
      job.tags || taxonomyResult.suggestions.tags,
      job.categories || taxonomyResult.suggestions.categories,
      job.author_id || 1 // Default to author ID 1 (content-bot user)
    )
    const wordpressDuration = Date.now() - wordpressStart
    performanceMonitor.recordWordPressPerformance(wordpressDuration)
    
    // Log WordPress step
    await logProcessingStep(jobRun.id, 'wordpress_posting', wordpressStart, Date.now(), wordpressResult.success, wordpressResult.error, {
      post_id: wordpressResult.post_id,
      post_url: wordpressResult.post_url,
      tags: job.tags,
      categories: job.categories
    })
    
    if (!wordpressResult.success) {
      // Check for WordPress unavailability
      const wordpressUrl = Deno.env.get('WORDPRESS_BASE_URL') || ''
      const unavailabilityResult = await checkWordPressUnavailability(wordpressUrl, new Error(wordpressResult.error!))
      
      if (unavailabilityResult.is_unavailable && unavailabilityResult.should_requeue) {
        console.log(`[WordPress] WordPress unavailability detected: ${unavailabilityResult.reason}`)
        
        // Requeue job for WordPress unavailability
        const requeueResult = await requeueJobForWordPressUnavailability(
          wordpressUrl,
          job.id,
          new Error(wordpressResult.error!),
          job.retry_count || 0
        )
        
        if (requeueResult.success) {
          console.log(`[WordPress] Job ${job.id} requeued due to WordPress unavailability: ${requeueResult.requeue_reason}`)
          
          // Log requeue step
          await logProcessingStep(jobRun.id, 'wordpress_requeue', Date.now(), Date.now(), true, null, {
            requeue_reason: requeueResult.requeue_reason,
            retry_count: requeueResult.retry_count,
            next_retry_at: requeueResult.next_retry_at,
            unavailability_type: unavailabilityResult.error_type
          })
          
          logFunctionExit(loggingContext, false, null, `WordPress unavailable - job requeued: ${unavailabilityResult.reason}`)
          return createFailureResult(
            functionStart,
            `WordPress unavailable - job requeued: ${unavailabilityResult.reason}`,
            job.id,
            jobRun.id,
            { 
              openai_duration: openaiDuration,
              wordpress_duration: wordpressDuration,
              requeued: true,
              requeue_reason: unavailabilityResult.reason,
              retry_count: requeueResult.retry_count
            }
          )
        } else {
          console.error(`[WordPress] Failed to requeue job ${job.id}: ${requeueResult.error}`)
        }
      }
      
      // Record retry attempt for WordPress posting failure
      const retryResult = await recordRetryAttempt(job.id, new Error(wordpressResult.error!), true)
      console.log(`WordPress posting retry attempt recorded: ${retryResult.retry_count}/${3}`)
      
      await handleJobFailure(job.id, wordpressResult.error!, jobRun.id)
      logFunctionExit(loggingContext, false, null, wordpressResult.error)
      return createFailureResult(
        functionStart,
        wordpressResult.error!,
        job.id,
        jobRun.id,
        { 
          openai_duration: openaiDuration,
          wordpress_duration: wordpressDuration
        }
      )
    }
    
    console.log(`Posted to WordPress successfully: Post ID ${wordpressResult.post_id}`)
    
    // Step 5.5: Check for WordPress post ID duplicates
    console.log('Step 5.5: Checking for WordPress post ID duplicates...')
    const postDuplicateResult = await checkForDuplicates(job, undefined)
    
    if (postDuplicateResult.is_duplicate && postDuplicateResult.duplicate_type === 'wordpress_post') {
      const errorMessage = `Duplicate WordPress post ID detected: ${wordpressResult.post_id}`
      await handleJobFailure(job.id, errorMessage, jobRun.id)
      logFunctionExit(loggingContext, false, null, errorMessage)
      return createFailureResult(
        functionStart,
        errorMessage,
        job.id,
        jobRun.id,
        { 
          openai_duration: openaiDuration,
          wordpress_duration: wordpressDuration
        }
      )
    }
    
    console.log('No WordPress post ID duplicates found, proceeding with job completion')
    
    // Step 6: Complete the job
    console.log('Step 6: Completing job...')
    const completeStart = Date.now()
    
    // Record successful attempt
    const successResult = await recordSuccess(job.id)
    console.log(`Success recorded for job ${job.id}`)
    
    const completeResult = await completeJob(
      job.id,
      contentResult.generated_title!,
      contentResult.generated_content!,
      wordpressResult.post_id!
    )
    const completeDuration = Date.now() - completeStart
    
    // Log completion step
    await logProcessingStep(jobRun.id, 'job_completion', completeStart, Date.now(), completeResult.success, completeResult.message, {
      wordpress_post_id: wordpressResult.post_id
    })
    
    if (!completeResult.success) {
      await handleJobFailure(job.id, completeResult.message!, jobRun.id)
      logFunctionExit(loggingContext, false, null, completeResult.message)
      return createFailureResult(
        functionStart,
        completeResult.message!,
        job.id,
        jobRun.id,
        { 
          openai_duration: openaiDuration,
          wordpress_duration: wordpressDuration
        }
      )
    }
    
    const functionEnd = Date.now()
    const totalDuration = functionEnd - functionStart
    
    // Create final result
    const finalResult: ProcessingResult = {
      success: true,
      job_id: job.id,
      wordpress_post_id: wordpressResult.post_id,
      generated_title: contentResult.generated_title,
      generated_content: contentResult.generated_content,
      timings: {
        function_start: functionStart,
        function_end: functionEnd,
        total_duration: totalDuration,
        openai_duration: openaiDuration,
        wordpress_duration: wordpressDuration
      }
    }
    
    // Step 7: Create idempotency key and mark as processed
    console.log('Step 7: Creating idempotency key and marking as processed...')
    try {
      await createIdempotencyKey(job.id, contentFingerprint)
      await markJobAsProcessed(job.id, wordpressResult.post_id, contentFingerprint)
      console.log('Job marked as processed with idempotency key')
    } catch (error) {
      console.error('Error creating idempotency key or marking as processed:', error)
      // Don't fail the job for idempotency errors, but log them
    }
    
    // Record final performance metrics
    const finalMetrics = performanceMonitor.endMeasurement('content_generation_orchestration', {
      openai_duration_ms: openaiDuration,
      wordpress_duration_ms: wordpressDuration,
      total_duration_ms: totalDuration
    })
    
    // Log performance metrics
    await logPerformanceMetrics(jobRun.id, performanceMonitor.getMetrics())
    
    // Log any performance alerts
    const alerts = performanceMonitor.getAlerts()
    if (alerts.length > 0) {
      console.warn(`[PERF] Performance alerts detected:`, alerts)
    }
    
    // Log job completion with comprehensive details
    await logJobCompletion(jobRun.id, finalResult, performanceMonitor.getMetrics())
    
    // Log function exit
    logFunctionExit(loggingContext, true, {
      wordpress_post_id: wordpressResult.post_id,
      generated_title: contentResult.generated_title,
      total_duration_ms: totalDuration,
      idempotency_key_created: true,
      performance_acceptable: performanceMonitor.isPerformanceAcceptable(),
      performance_alerts: alerts.length
    })
    
    console.log(`Content generation orchestration completed successfully in ${totalDuration}ms`)
    console.log(`[PERF] Performance acceptable: ${performanceMonitor.isPerformanceAcceptable()}`)
    
    return finalResult
    
  } catch (error) {
    console.error('Unexpected error in orchestrateContentGeneration:', error)
    
    if (job) {
      // Record retry attempt
      const retryResult = await recordRetryAttempt(job.id, error, true)
      console.log(`Retry attempt recorded: ${retryResult.retry_count}/${3}`)
      
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

// Job run management is now handled by execution-logger.ts module

/**
 * Handles job failure with proper error logging and status updates
 */
async function handleJobFailure(
  jobId: string, 
  errorMessage: string, 
  jobRunId?: string
): Promise<void> {
  try {
    console.error(`Handling job failure for ${jobId}: ${errorMessage}`)
    
    // Update job status to error or release for retry
    const result = await failJob(jobId, errorMessage)
    
    if (!result.success) {
      console.error('Failed to update job status:', result.message)
    }
    
    // Update job run status
    if (jobRunId) {
      await updateJobRun(jobRunId, 'failed', { 
        error_details: { 
          message: errorMessage,
          timestamp: new Date().toISOString()
        } 
      })
    }
  } catch (error) {
    console.error('Error handling job failure:', error)
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

/**
 * Validates the orchestration flow configuration
 */
export function validateOrchestrationConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check required environment variables
  if (!Deno.env.get('SUPABASE_URL')) {
    errors.push('SUPABASE_URL environment variable is required')
  }
  
  if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  }
  
  // Check OpenAI configuration (will be implemented in task 3.1)
  if (!Deno.env.get('OPENAI_API_KEY')) {
    errors.push('OPENAI_API_KEY environment variable is required')
  }
  
  // Check WordPress configuration (will be implemented in task 3.3)
  if (!Deno.env.get('WORDPRESS_BASE_URL')) {
    errors.push('WORDPRESS_BASE_URL environment variable is required')
  }
  
  if (!Deno.env.get('WORDPRESS_APP_PASSWORD')) {
    errors.push('WORDPRESS_APP_PASSWORD environment variable is required')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Generates content using template fallback
 */
async function generateContentWithTemplate(job: ContentJob): Promise<{
  success: boolean
  generated_title?: string
  generated_content?: string
  model_used?: string
  tokens_used?: number
  error?: string
}> {
  try {
    console.log(`[TemplateFallback] Generating content with template for job ${job.id}`)
    
    // Simple template-based content generation
    const template = getContentTemplate(job.content_type || 'blog_post')
    const title = generateTitleFromTemplate(job.topic, template)
    const content = generateContentFromTemplate(job.topic, template, job)
    
    return {
      success: true,
      generated_title: title,
      generated_content: content,
      model_used: 'template_fallback',
      tokens_used: 0
    }
    
  } catch (error) {
    console.error(`[TemplateFallback] Failed to generate content with template:`, error)
    
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Gets content template based on content type
 */
function getContentTemplate(contentType: string): any {
  const templates = {
    blog_post: {
      title_template: '{topic} - A Comprehensive Guide',
      content_template: `
        <h1>{title}</h1>
        <p>In this comprehensive guide, we'll explore {topic} and provide you with valuable insights and practical information.</p>
        
        <h2>Introduction to {topic}</h2>
        <p>{topic} is an important topic that affects many aspects of our daily lives. Understanding the fundamentals is crucial for making informed decisions.</p>
        
        <h2>Key Concepts</h2>
        <p>Let's dive into the key concepts related to {topic}:</p>
        <ul>
          <li>Fundamental principles</li>
          <li>Best practices</li>
          <li>Common challenges</li>
          <li>Future trends</li>
        </ul>
        
        <h2>Practical Applications</h2>
        <p>Here are some practical ways to apply knowledge about {topic}:</p>
        <ol>
          <li>Identify opportunities</li>
          <li>Implement solutions</li>
          <li>Monitor progress</li>
          <li>Optimize results</li>
        </ol>
        
        <h2>Conclusion</h2>
        <p>In conclusion, {topic} represents a significant area of focus that requires careful consideration and strategic planning. By understanding the key concepts and applying best practices, you can achieve better outcomes.</p>
      `
    },
    product_description: {
      title_template: '{topic} - Product Overview',
      content_template: `
        <h1>{title}</h1>
        <p>Discover {topic} - a high-quality product designed to meet your needs and exceed your expectations.</p>
        
        <h2>Product Features</h2>
        <ul>
          <li>Premium quality materials</li>
          <li>Advanced technology</li>
          <li>User-friendly design</li>
          <li>Reliable performance</li>
        </ul>
        
        <h2>Benefits</h2>
        <p>When you choose {topic}, you get:</p>
        <ul>
          <li>Superior quality and durability</li>
          <li>Enhanced user experience</li>
          <li>Excellent value for money</li>
          <li>Comprehensive support</li>
        </ul>
        
        <h2>Why Choose {topic}?</h2>
        <p>{topic} stands out from the competition with its innovative features, reliable performance, and commitment to customer satisfaction. Make the smart choice today.</p>
      `
    }
  }
  
  return templates[contentType] || templates.blog_post
}

/**
 * Generates title from template
 */
function generateTitleFromTemplate(topic: string, template: any): string {
  return template.title_template.replace('{topic}', topic)
}

/**
 * Generates content from template
 */
function generateContentFromTemplate(topic: string, template: any, job: ContentJob): string {
  let content = template.content_template
    .replace(/{topic}/g, topic)
    .replace(/{title}/g, generateTitleFromTemplate(topic, template))
  
  // Add job-specific content if available
  if (job.key_points && job.key_points.length > 0) {
    const keyPointsHtml = job.key_points.map(point => `<li>${point}</li>`).join('')
    content = content.replace('<li>Fundamental principles</li>', keyPointsHtml)
  }
  
  if (job.audience) {
    content = content.replace('our daily lives', `${job.audience} daily lives`)
  }
  
  return content.trim()
}

/**
 * Gets orchestration performance metrics
 */
export async function getOrchestrationMetrics(): Promise<{
  total_jobs_processed: number
  success_rate: number
  avg_processing_time_ms: number
  avg_openai_time_ms: number
  avg_wordpress_time_ms: number
  error_rate: number
}> {
  try {
    const { data, error } = await supabase.rpc('get_job_run_stats')
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
    
    const stats = data?.[0] || {
      total_runs: 0,
      successful_runs: 0,
      failed_runs: 0,
      avg_duration_ms: 0
    }
    
    return {
      total_jobs_processed: stats.total_runs,
      success_rate: stats.success_rate || 0,
      avg_processing_time_ms: stats.avg_duration_ms || 0,
      avg_openai_time_ms: 0, // Will be calculated from job_runs table
      avg_wordpress_time_ms: 0, // Will be calculated from job_runs table
      error_rate: stats.failure_rate || 0
    }
    
  } catch (error) {
    console.error('Error getting orchestration metrics:', error)
    throw error
  }
}

// Placeholder functions - will be implemented in subsequent tasks


