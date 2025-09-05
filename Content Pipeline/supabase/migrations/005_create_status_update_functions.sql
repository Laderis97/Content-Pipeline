-- Migration: Create job status update RPC functions for atomic status transitions
-- Purpose: Enhanced atomic status transition functions with validation and logging
-- PRD Reference: Functional Requirements 7, 8, 42, 65, 66, 68

-- Enhanced function to update job status with validation and atomic transitions
CREATE OR REPLACE FUNCTION update_job_status(
    p_job_id UUID,
    p_new_status TEXT,
    p_error_message TEXT DEFAULT NULL,
    p_generated_title TEXT DEFAULT NULL,
    p_generated_content TEXT DEFAULT NULL,
    p_wordpress_post_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    old_status TEXT,
    new_status TEXT,
    message TEXT
) AS $$
DECLARE
    current_job RECORD;
    valid_transition BOOLEAN := FALSE;
    result_message TEXT;
BEGIN
    -- Get current job details
    SELECT id, status, retry_count, claimed_at
    INTO current_job
    FROM content_jobs
    WHERE id = p_job_id;
    
    -- Check if job exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, p_new_status, 'Job not found'::TEXT;
        RETURN;
    END IF;
    
    -- Validate status transition
    valid_transition := CASE 
        WHEN current_job.status = 'pending' AND p_new_status = 'processing' THEN TRUE
        WHEN current_job.status = 'processing' AND p_new_status IN ('completed', 'error', 'pending') THEN TRUE
        WHEN current_job.status = 'error' AND p_new_status = 'pending' THEN TRUE
        ELSE FALSE
    END;
    
    IF NOT valid_transition THEN
        RETURN QUERY SELECT FALSE, current_job.status, p_new_status, 
            'Invalid status transition from ' || current_job.status || ' to ' || p_new_status;
        RETURN;
    END IF;
    
    -- Perform atomic status update with appropriate field updates
    UPDATE content_jobs 
    SET 
        status = p_new_status,
        last_error = CASE 
            WHEN p_new_status = 'error' THEN p_error_message
            WHEN p_new_status = 'completed' THEN NULL
            ELSE last_error
        END,
        generated_title = CASE 
            WHEN p_new_status = 'completed' AND p_generated_title IS NOT NULL THEN p_generated_title
            ELSE generated_title
        END,
        generated_content = CASE 
            WHEN p_new_status = 'completed' AND p_generated_content IS NOT NULL THEN p_generated_content
            ELSE generated_content
        END,
        wordpress_post_id = CASE 
            WHEN p_new_status = 'completed' AND p_wordpress_post_id IS NOT NULL THEN p_wordpress_post_id
            ELSE wordpress_post_id
        END,
        claimed_at = CASE 
            WHEN p_new_status = 'processing' THEN NOW()
            WHEN p_new_status IN ('completed', 'error') THEN NULL
            ELSE claimed_at
        END,
        retry_count = CASE 
            WHEN p_new_status = 'pending' AND current_job.status = 'processing' AND p_error_message IS NOT NULL 
                THEN retry_count + 1
            ELSE retry_count
        END,
        updated_at = NOW()
    WHERE id = p_job_id;
    
    result_message := 'Status updated successfully from ' || current_job.status || ' to ' || p_new_status;
    
    RETURN QUERY SELECT TRUE, current_job.status, p_new_status, result_message;
END;
$$ LANGUAGE plpgsql;

-- Function to retry a failed job (manual override for admins)
CREATE OR REPLACE FUNCTION retry_failed_job(
    p_job_id UUID,
    p_admin_user_id TEXT DEFAULT 'system'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    new_retry_count INTEGER
) AS $$
DECLARE
    current_job RECORD;
BEGIN
    -- Get current job details
    SELECT id, status, retry_count, last_error
    INTO current_job
    FROM content_jobs
    WHERE id = p_job_id;
    
    -- Check if job exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Job not found'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Check if job is in error status
    IF current_job.status != 'error' THEN
        RETURN QUERY SELECT FALSE, 
            'Job is not in error status (current: ' || current_job.status || ')'::TEXT, 
            current_job.retry_count;
        RETURN;
    END IF;
    
    -- Check if retry count would exceed maximum
    IF current_job.retry_count >= 3 THEN
        RETURN QUERY SELECT FALSE, 
            'Maximum retry count (3) already reached'::TEXT, 
            current_job.retry_count;
        RETURN;
    END IF;
    
    -- Reset job to pending status for retry
    UPDATE content_jobs 
    SET 
        status = 'pending',
        last_error = NULL,
        claimed_at = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;
    
    RETURN QUERY SELECT TRUE, 
        'Job reset to pending for retry by admin: ' || p_admin_user_id, 
        current_job.retry_count;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk update job statuses (for maintenance operations)
CREATE OR REPLACE FUNCTION bulk_update_job_status(
    p_job_ids UUID[],
    p_new_status TEXT,
    p_reason TEXT DEFAULT 'bulk_update'
)
RETURNS TABLE (
    updated_count INTEGER,
    failed_count INTEGER,
    message TEXT
) AS $$
DECLARE
    update_result INTEGER;
    total_jobs INTEGER;
BEGIN
    total_jobs := array_length(p_job_ids, 1);
    
    -- Validate status
    IF p_new_status NOT IN ('pending', 'processing', 'completed', 'error') THEN
        RETURN QUERY SELECT 0, total_jobs, 'Invalid status: ' || p_new_status;
        RETURN;
    END IF;
    
    -- Perform bulk update
    UPDATE content_jobs 
    SET 
        status = p_new_status,
        last_error = CASE 
            WHEN p_new_status = 'error' THEN p_reason
            ELSE last_error
        END,
        claimed_at = CASE 
            WHEN p_new_status = 'processing' THEN NOW()
            WHEN p_new_status IN ('completed', 'error') THEN NULL
            ELSE claimed_at
        END,
        updated_at = NOW()
    WHERE id = ANY(p_job_ids);
    
    GET DIAGNOSTICS update_result = ROW_COUNT;
    
    RETURN QUERY SELECT update_result, 
        (total_jobs - update_result), 
        'Bulk update completed: ' || update_result || ' updated, ' || (total_jobs - update_result) || ' failed';
END;
$$ LANGUAGE plpgsql;

-- Function to get jobs by status with pagination
CREATE OR REPLACE FUNCTION get_jobs_by_status(
    p_status TEXT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    topic TEXT,
    status TEXT,
    retry_count INTEGER,
    created_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    last_error TEXT,
    wordpress_post_id INTEGER
) AS $$
BEGIN
    -- Validate status
    IF p_status NOT IN ('pending', 'processing', 'completed', 'error') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;
    
    RETURN QUERY
    SELECT 
        cj.id,
        cj.topic,
        cj.status,
        cj.retry_count,
        cj.created_at,
        cj.claimed_at,
        cj.last_error,
        cj.wordpress_post_id
    FROM content_jobs cj
    WHERE cj.status = p_status
    ORDER BY cj.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get job status history (for auditing)
CREATE OR REPLACE FUNCTION get_job_status_history(
    p_job_id UUID
)
RETURNS TABLE (
    status TEXT,
    changed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cj.status,
        cj.updated_at as changed_at,
        cj.last_error as error_message,
        cj.retry_count
    FROM content_jobs cj
    WHERE cj.id = p_job_id
    ORDER BY cj.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to validate job status consistency (for maintenance)
CREATE OR REPLACE FUNCTION validate_job_status_consistency()
RETURNS TABLE (
    issue_type TEXT,
    job_id UUID,
    current_status TEXT,
    issue_description TEXT
) AS $$
BEGIN
    -- Find jobs stuck in processing status for too long (>1 hour)
    RETURN QUERY
    SELECT 
        'stale_processing'::TEXT as issue_type,
        cj.id as job_id,
        cj.status as current_status,
        'Job stuck in processing for ' || EXTRACT(EPOCH FROM (NOW() - cj.claimed_at))/60 || ' minutes' as issue_description
    FROM content_jobs cj
    WHERE cj.status = 'processing' 
        AND cj.claimed_at < NOW() - INTERVAL '1 hour';
    
    -- Find jobs with invalid retry counts
    RETURN QUERY
    SELECT 
        'invalid_retry_count'::TEXT as issue_type,
        cj.id as job_id,
        cj.status as current_status,
        'Retry count ' || cj.retry_count || ' is invalid for status ' || cj.status as issue_description
    FROM content_jobs cj
    WHERE (cj.status = 'pending' AND cj.retry_count > 0 AND cj.retry_count < 3)
        OR (cj.status = 'error' AND cj.retry_count != 3)
        OR (cj.status = 'completed' AND cj.retry_count > 0);
    
    -- Find jobs with missing WordPress post IDs when completed
    RETURN QUERY
    SELECT 
        'missing_wordpress_id'::TEXT as issue_type,
        cj.id as job_id,
        cj.status as current_status,
        'Completed job missing WordPress post ID' as issue_description
    FROM content_jobs cj
    WHERE cj.status = 'completed' AND cj.wordpress_post_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION update_job_status(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER) IS 'Enhanced atomic job status update with validation and proper field handling';
COMMENT ON FUNCTION retry_failed_job(UUID, TEXT) IS 'Manual retry function for failed jobs (admin override)';
COMMENT ON FUNCTION bulk_update_job_status(UUID[], TEXT, TEXT) IS 'Bulk job status update for maintenance operations';
COMMENT ON FUNCTION get_jobs_by_status(TEXT, INTEGER, INTEGER) IS 'Get jobs by status with pagination support';
COMMENT ON FUNCTION get_job_status_history(UUID) IS 'Get job status history for auditing purposes';
COMMENT ON FUNCTION validate_job_status_consistency() IS 'Validate job status consistency and identify issues';
