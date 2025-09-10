-- Migration: Fix claim_next_job RPC function ambiguous column reference
-- Purpose: Fix the ambiguous column reference issue in the claim_next_job function

-- Drop and recreate the claim_next_job function with explicit table references
DROP FUNCTION IF EXISTS claim_next_job();

CREATE OR REPLACE FUNCTION claim_next_job()
RETURNS TABLE (
    job_id UUID,
    topic TEXT,
    status TEXT,
    prompt_template TEXT,
    model TEXT,
    retry_count INTEGER,
    tags TEXT[],
    categories TEXT[]
) AS $$
DECLARE
    claimed_job RECORD;
BEGIN
    -- Use FOR UPDATE SKIP LOCKED to atomically claim a job
    -- This prevents race conditions when multiple functions try to claim jobs simultaneously
    SELECT 
        content_jobs.id,
        content_jobs.topic,
        content_jobs.status,
        content_jobs.prompt_template,
        content_jobs.model,
        content_jobs.retry_count,
        content_jobs.tags,
        content_jobs.categories
    INTO claimed_job
    FROM content_jobs
    WHERE content_jobs.status = 'pending' 
        AND content_jobs.retry_count < 3
    ORDER BY content_jobs.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    -- If no job was found, return empty result
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Update the job status to 'processing' and set claimed_at timestamp
    UPDATE content_jobs 
    SET 
        status = 'processing',
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = claimed_job.id;
    
    -- Return the claimed job details
    RETURN QUERY
    SELECT 
        claimed_job.id,
        claimed_job.topic,
        'processing'::TEXT as status,
        claimed_job.prompt_template,
        claimed_job.model,
        claimed_job.retry_count,
        claimed_job.tags,
        claimed_job.categories;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION claim_next_job() IS 'Atomically claims the next pending job for processing using FOR UPDATE SKIP LOCKED - Fixed ambiguous column reference';
