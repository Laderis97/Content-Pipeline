-- Migration: Create atomic job claim RPC function
-- Purpose: Atomic job claiming with FOR UPDATE SKIP LOCKED for concurrent safety
-- PRD Reference: Functional Requirements 1, 24, 32, 46, 63

-- Create RPC function for atomic job claiming
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

-- Create RPC function to release a claimed job (for error handling)
CREATE OR REPLACE FUNCTION release_job(
    p_job_id UUID,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    job_exists BOOLEAN;
BEGIN
    -- Check if job exists and is in processing status
    SELECT EXISTS(
        SELECT 1 FROM content_jobs 
        WHERE id = p_job_id AND status = 'processing'
    ) INTO job_exists;
    
    IF NOT job_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update job status back to pending and clear claimed_at
    -- Increment retry_count if there was an error
    UPDATE content_jobs 
    SET 
        status = 'pending',
        claimed_at = NULL,
        retry_count = CASE 
            WHEN p_error_message IS NOT NULL THEN retry_count + 1
            ELSE retry_count
        END,
        last_error = p_error_message,
        updated_at = NOW()
    WHERE id = p_job_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to complete a job successfully
CREATE OR REPLACE FUNCTION complete_job(
    p_job_id UUID,
    p_generated_title TEXT,
    p_generated_content TEXT,
    p_wordpress_post_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    job_exists BOOLEAN;
BEGIN
    -- Check if job exists and is in processing status
    SELECT EXISTS(
        SELECT 1 FROM content_jobs 
        WHERE id = p_job_id AND status = 'processing'
    ) INTO job_exists;
    
    IF NOT job_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update job status to completed with generated content
    UPDATE content_jobs 
    SET 
        status = 'completed',
        generated_title = p_generated_title,
        generated_content = p_generated_content,
        wordpress_post_id = p_wordpress_post_id,
        claimed_at = NULL,
        last_error = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to mark a job as failed after max retries
CREATE OR REPLACE FUNCTION fail_job(
    p_job_id UUID,
    p_error_message TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    job_exists BOOLEAN;
BEGIN
    -- Check if job exists and is in processing status
    SELECT EXISTS(
        SELECT 1 FROM content_jobs 
        WHERE id = p_job_id AND status = 'processing'
    ) INTO job_exists;
    
    IF NOT job_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update job status to error with error message
    UPDATE content_jobs 
    SET 
        status = 'error',
        last_error = p_error_message,
        claimed_at = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to get job statistics for monitoring
CREATE OR REPLACE FUNCTION get_job_stats()
RETURNS TABLE (
    total_jobs BIGINT,
    pending_jobs BIGINT,
    processing_jobs BIGINT,
    completed_jobs BIGINT,
    error_jobs BIGINT,
    avg_retry_count NUMERIC,
    oldest_pending_job TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'error') as error_jobs,
        ROUND(AVG(retry_count), 2) as avg_retry_count,
        MIN(created_at) FILTER (WHERE status = 'pending') as oldest_pending_job
    FROM content_jobs;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION claim_next_job() IS 'Atomically claims the next pending job for processing using FOR UPDATE SKIP LOCKED';
COMMENT ON FUNCTION release_job(UUID, TEXT) IS 'Releases a claimed job back to pending status, optionally incrementing retry count';
COMMENT ON FUNCTION complete_job(UUID, TEXT, TEXT, INTEGER) IS 'Marks a job as completed with generated content and WordPress post ID';
COMMENT ON FUNCTION fail_job(UUID, TEXT) IS 'Marks a job as failed with error message after max retries';
COMMENT ON FUNCTION get_job_stats() IS 'Returns job statistics for monitoring and alerting';
