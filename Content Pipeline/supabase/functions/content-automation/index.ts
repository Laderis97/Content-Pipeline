import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  claimNextJob, 
  releaseJob, 
  completeJob, 
  failJob,
  getJobStatistics 
} from './job-claiming.ts'
import { orchestrateContentGeneration } from './content-orchestrator.ts'
import { processJobsConcurrently } from './concurrent-processor.ts'

// Types
interface ContentJob {
  id: string
  topic: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  prompt_template?: string
  model: string
  retry_count: number
  claimed_at?: string
  last_error?: string
  generated_title?: string
  generated_content?: string
  wordpress_post_id?: number
  tags?: string[]
  categories?: string[]
}

interface JobRun {
  job_id: string
  status: 'started' | 'completed' | 'failed' | 'retrying'
  error_details?: any
  timings?: any
  function_duration_ms?: number
  openai_duration_ms?: number
  wordpress_duration_ms?: number
  total_duration_ms?: number
  retry_attempt: number
}

interface ProcessingResult {
  success: boolean
  job_id?: string
  error?: string
  wordpress_post_id?: number
  generated_title?: string
  generated_content?: string
  timings: {
    function_start: number
    function_end: number
    total_duration: number
    openai_duration?: number
    wordpress_duration?: number
  }
}

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Performance tracking
const startTime = Date.now()

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Content automation function started')
    
    // Check if concurrent processing is requested
    const url = new URL(req.url)
    const mode = url.searchParams.get('mode') || 'single'
    const maxJobs = parseInt(url.searchParams.get('max_jobs') || '5')
    
    if (mode === 'concurrent') {
      // Process multiple jobs concurrently
      console.log(`Starting concurrent processing with max ${maxJobs} jobs`)
      const result = await processJobsConcurrently(maxJobs)
      
      const endTime = Date.now()
      const totalDuration = endTime - startTime
      
      console.log(`Concurrent processing completed: ${result.total_processed} jobs in ${totalDuration}ms`)
      
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'concurrent',
          ...result,
          function_duration_ms: totalDuration
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } else {
      // Process single job (default behavior)
      const result = await orchestrateContentGeneration()
      
      const endTime = Date.now()
      const totalDuration = endTime - startTime
      
      console.log(`Content automation completed in ${totalDuration}ms`)
      
      return new Response(
        JSON.stringify({
          success: result.success,
          mode: 'single',
          job_id: result.job_id,
          wordpress_post_id: result.wordpress_post_id,
          generated_title: result.generated_title,
          timings: {
            ...result.timings,
            function_duration_ms: totalDuration
          },
          error: result.error
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500
        }
      )
    }
    
  } catch (error) {
    console.error('Content automation function error:', error)
    
    const endTime = Date.now()
    const totalDuration = endTime - startTime
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timings: {
          function_duration_ms: totalDuration
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// Content processing orchestration is now handled by content-orchestrator.ts module

// All job management and orchestration logic is now handled by dedicated modules:
// - job-claiming.ts: Job claiming, completion, and failure handling
// - content-orchestrator.ts: Content generation orchestration flow

// All content processing functions are now implemented in content-orchestrator.ts module
