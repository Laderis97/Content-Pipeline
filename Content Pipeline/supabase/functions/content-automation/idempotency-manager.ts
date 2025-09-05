// Idempotent processing to prevent duplicate posts
// PRD Reference: Success Metrics (<1% duplicate posts), Functional Requirements 6, 51

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ContentJob, ProcessingResult } from './types.ts'

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface IdempotencyKey {
  job_id: string
  topic_hash: string
  content_hash?: string
  wordpress_post_id?: number
  created_at: string
  expires_at: string
}

interface DuplicateCheckResult {
  is_duplicate: boolean
  duplicate_type?: 'content' | 'wordpress_post' | 'topic'
  existing_job_id?: string
  existing_wordpress_post_id?: number
  confidence_score?: number
}

interface ContentFingerprint {
  topic_hash: string
  content_hash?: string
  title_hash?: string
  word_count?: number
  key_phrases?: string[]
}

/**
 * Generates a content fingerprint for duplicate detection
 */
export function generateContentFingerprint(
  topic: string,
  content?: string,
  title?: string
): ContentFingerprint {
  const topicHash = generateHash(topic.toLowerCase().trim())
  
  const fingerprint: ContentFingerprint = {
    topic_hash: topicHash
  }
  
  if (content) {
    fingerprint.content_hash = generateHash(content.toLowerCase().trim())
    fingerprint.word_count = content.split(/\s+/).length
    fingerprint.key_phrases = extractKeyPhrases(content)
  }
  
  if (title) {
    fingerprint.title_hash = generateHash(title.toLowerCase().trim())
  }
  
  return fingerprint
}

/**
 * Generates a hash for content deduplication
 */
function generateHash(input: string): string {
  // Simple hash function for content fingerprinting
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Extracts key phrases from content for similarity detection
 */
function extractKeyPhrases(content: string): string[] {
  // Simple key phrase extraction (could be enhanced with NLP)
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
  
  // Count word frequency
  const wordCount: { [key: string]: number } = {}
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1
  })
  
  // Return top 10 most frequent words as key phrases
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word)
}

/**
 * Checks for duplicate content before processing
 */
export async function checkForDuplicates(
  job: ContentJob,
  contentFingerprint?: ContentFingerprint
): Promise<DuplicateCheckResult> {
  try {
    console.log(`Checking for duplicates for job: ${job.id}`)
    
    // Check for exact topic duplicates
    const topicDuplicate = await checkTopicDuplicates(job.topic, job.id)
    if (topicDuplicate.is_duplicate) {
      return topicDuplicate
    }
    
    // Check for WordPress post ID duplicates
    if (job.wordpress_post_id) {
      const postDuplicate = await checkWordPressPostDuplicates(job.wordpress_post_id, job.id)
      if (postDuplicate.is_duplicate) {
        return postDuplicate
      }
    }
    
    // Check for content duplicates if fingerprint is provided
    if (contentFingerprint) {
      const contentDuplicate = await checkContentDuplicates(contentFingerprint, job.id)
      if (contentDuplicate.is_duplicate) {
        return contentDuplicate
      }
    }
    
    return { is_duplicate: false }
    
  } catch (error) {
    console.error('Error checking for duplicates:', error)
    // In case of error, allow processing to continue (fail open)
    return { is_duplicate: false }
  }
}

/**
 * Checks for duplicate topics
 */
async function checkTopicDuplicates(topic: string, currentJobId: string): Promise<DuplicateCheckResult> {
  try {
    const topicHash = generateHash(topic.toLowerCase().trim())
    
    const { data, error } = await supabase
      .from('content_jobs')
      .select('id, wordpress_post_id, created_at, status')
      .neq('id', currentJobId)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Error checking topic duplicates:', error)
      return { is_duplicate: false }
    }
    
    // Check for similar topics (simple similarity check)
    for (const job of data || []) {
      // This is a simplified check - could be enhanced with more sophisticated similarity algorithms
      const similarity = calculateTopicSimilarity(topic, job.topic || '')
      if (similarity > 0.8) { // 80% similarity threshold
        return {
          is_duplicate: true,
          duplicate_type: 'topic',
          existing_job_id: job.id,
          existing_wordpress_post_id: job.wordpress_post_id,
          confidence_score: similarity
        }
      }
    }
    
    return { is_duplicate: false }
    
  } catch (error) {
    console.error('Error in checkTopicDuplicates:', error)
    return { is_duplicate: false }
  }
}

/**
 * Checks for duplicate WordPress post IDs
 */
async function checkWordPressPostDuplicates(
  wordpressPostId: number, 
  currentJobId: string
): Promise<DuplicateCheckResult> {
  try {
    const { data, error } = await supabase
      .from('content_jobs')
      .select('id, topic, created_at')
      .eq('wordpress_post_id', wordpressPostId)
      .neq('id', currentJobId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking WordPress post duplicates:', error)
      return { is_duplicate: false }
    }
    
    if (data) {
      return {
        is_duplicate: true,
        duplicate_type: 'wordpress_post',
        existing_job_id: data.id,
        existing_wordpress_post_id: wordpressPostId,
        confidence_score: 1.0
      }
    }
    
    return { is_duplicate: false }
    
  } catch (error) {
    console.error('Error in checkWordPressPostDuplicates:', error)
    return { is_duplicate: false }
  }
}

/**
 * Checks for duplicate content based on fingerprint
 */
async function checkContentDuplicates(
  fingerprint: ContentFingerprint,
  currentJobId: string
): Promise<DuplicateCheckResult> {
  try {
    // Check for exact content hash matches
    if (fingerprint.content_hash) {
      const { data, error } = await supabase
        .from('content_jobs')
        .select('id, topic, wordpress_post_id, created_at')
        .eq('status', 'completed')
        .neq('id', currentJobId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) {
        console.error('Error checking content duplicates:', error)
        return { is_duplicate: false }
      }
      
      // Check for content similarity
      for (const job of data || []) {
        if (job.generated_content) {
          const existingFingerprint = generateContentFingerprint(job.topic, job.generated_content)
          const similarity = calculateContentSimilarity(fingerprint, existingFingerprint)
          
          if (similarity > 0.85) { // 85% similarity threshold
            return {
              is_duplicate: true,
              duplicate_type: 'content',
              existing_job_id: job.id,
              existing_wordpress_post_id: job.wordpress_post_id,
              confidence_score: similarity
            }
          }
        }
      }
    }
    
    return { is_duplicate: false }
    
  } catch (error) {
    console.error('Error in checkContentDuplicates:', error)
    return { is_duplicate: false }
  }
}

/**
 * Calculates topic similarity
 */
function calculateTopicSimilarity(topic1: string, topic2: string): number {
  const words1 = new Set(topic1.toLowerCase().split(/\s+/))
  const words2 = new Set(topic2.toLowerCase().split(/\s+/))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}

/**
 * Calculates content similarity based on fingerprints
 */
function calculateContentSimilarity(fingerprint1: ContentFingerprint, fingerprint2: ContentFingerprint): number {
  let similarity = 0
  let factors = 0
  
  // Topic similarity
  if (fingerprint1.topic_hash === fingerprint2.topic_hash) {
    similarity += 0.3
  }
  factors += 0.3
  
  // Content hash similarity
  if (fingerprint1.content_hash && fingerprint2.content_hash) {
    if (fingerprint1.content_hash === fingerprint2.content_hash) {
      similarity += 0.5
    }
    factors += 0.5
  }
  
  // Key phrases similarity
  if (fingerprint1.key_phrases && fingerprint2.key_phrases) {
    const phrases1 = new Set(fingerprint1.key_phrases)
    const phrases2 = new Set(fingerprint2.key_phrases)
    const intersection = new Set([...phrases1].filter(x => phrases2.has(x)))
    const union = new Set([...phrases1, ...phrases2])
    
    if (union.size > 0) {
      similarity += (intersection.size / union.size) * 0.2
    }
    factors += 0.2
  }
  
  return factors > 0 ? similarity / factors : 0
}

/**
 * Creates an idempotency key for a job
 */
export async function createIdempotencyKey(
  jobId: string,
  fingerprint: ContentFingerprint,
  expiresInHours: number = 24
): Promise<string> {
  try {
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    const key = `${jobId}-${fingerprint.topic_hash}-${Date.now()}`
    
    const { error } = await supabase
      .from('idempotency_keys')
      .insert({
        key,
        job_id: jobId,
        topic_hash: fingerprint.topic_hash,
        content_hash: fingerprint.content_hash,
        expires_at: expiresAt.toISOString()
      })
    
    if (error) {
      console.error('Error creating idempotency key:', error)
      throw new Error(`Failed to create idempotency key: ${error.message}`)
    }
    
    return key
    
  } catch (error) {
    console.error('Error in createIdempotencyKey:', error)
    throw error
  }
}

/**
 * Validates an idempotency key
 */
export async function validateIdempotencyKey(key: string): Promise<{
  valid: boolean
  job_id?: string
  expired: boolean
}> {
  try {
    const { data, error } = await supabase
      .from('idempotency_keys')
      .select('job_id, expires_at')
      .eq('key', key)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return { valid: false, expired: false }
      }
      console.error('Error validating idempotency key:', error)
      return { valid: false, expired: false }
    }
    
    const expired = new Date(data.expires_at) < new Date()
    
    return {
      valid: !expired,
      job_id: data.job_id,
      expired
    }
    
  } catch (error) {
    console.error('Error in validateIdempotencyKey:', error)
    return { valid: false, expired: false }
  }
}

/**
 * Marks a job as processed to prevent duplicate processing
 */
export async function markJobAsProcessed(
  jobId: string,
  wordpressPostId?: number,
  contentFingerprint?: ContentFingerprint
): Promise<void> {
  try {
    const updateData: any = {
      status: 'completed',
      updated_at: new Date().toISOString()
    }
    
    if (wordpressPostId) {
      updateData.wordpress_post_id = wordpressPostId
    }
    
    if (contentFingerprint) {
      updateData.content_fingerprint = contentFingerprint
    }
    
    const { error } = await supabase
      .from('content_jobs')
      .update(updateData)
      .eq('id', jobId)
    
    if (error) {
      console.error('Error marking job as processed:', error)
      throw new Error(`Failed to mark job as processed: ${error.message}`)
    }
    
    console.log(`Marked job ${jobId} as processed`)
    
  } catch (error) {
    console.error('Error in markJobAsProcessed:', error)
    throw error
  }
}

/**
 * Gets duplicate statistics for monitoring
 */
export async function getDuplicateStatistics(): Promise<{
  total_jobs: number
  duplicate_checks: number
  duplicates_found: number
  duplicate_rate: number
  topic_duplicates: number
  content_duplicates: number
  wordpress_duplicates: number
}> {
  try {
    // Get total jobs
    const { data: totalJobs, error: totalError } = await supabase
      .from('content_jobs')
      .select('id', { count: 'exact' })
    
    if (totalError) {
      console.error('Error getting total jobs:', totalError)
    }
    
    // Get duplicate statistics (this would need to be implemented based on your logging)
    // For now, return placeholder data
    const total = totalJobs?.length || 0
    const duplicates = 0 // This would be calculated from actual duplicate detection logs
    
    return {
      total_jobs: total,
      duplicate_checks: total,
      duplicates_found: duplicates,
      duplicate_rate: total > 0 ? (duplicates / total) * 100 : 0,
      topic_duplicates: 0,
      content_duplicates: 0,
      wordpress_duplicates: 0
    }
    
  } catch (error) {
    console.error('Error getting duplicate statistics:', error)
    throw error
  }
}

/**
 * Cleans up expired idempotency keys
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('idempotency_keys')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')
    
    if (error) {
      console.error('Error cleaning up expired idempotency keys:', error)
      throw new Error(`Failed to cleanup expired keys: ${error.message}`)
    }
    
    const deletedCount = data?.length || 0
    console.log(`Cleaned up ${deletedCount} expired idempotency keys`)
    
    return deletedCount
    
  } catch (error) {
    console.error('Error in cleanupExpiredIdempotencyKeys:', error)
    throw error
  }
}
