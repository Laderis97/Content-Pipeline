-- Migration: Add database constraints and validation rules for data integrity
-- Purpose: Comprehensive data integrity constraints and validation rules
-- PRD Reference: Functional Requirements 1-24, Data Management, Security & Configuration

-- Add additional constraints to content_jobs table
-- Ensure topic is not empty and has reasonable length
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_topic_not_empty 
CHECK (LENGTH(TRIM(topic)) > 0 AND LENGTH(topic) <= 500);

-- Ensure retry_count is within valid range
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_retry_count_range 
CHECK (retry_count >= 0 AND retry_count <= 3);

-- Ensure status transitions are valid
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_status_valid 
CHECK (status IN ('pending', 'processing', 'completed', 'error'));

-- Ensure claimed_at is only set when status is processing
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_claimed_at_processing 
CHECK (
    (status = 'processing' AND claimed_at IS NOT NULL) OR 
    (status != 'processing' AND claimed_at IS NULL)
);

-- Ensure completed jobs have generated content
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_completed_has_content 
CHECK (
    (status != 'completed') OR 
    (status = 'completed' AND generated_title IS NOT NULL AND generated_content IS NOT NULL)
);

-- Ensure completed jobs have WordPress post ID
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_completed_has_wordpress_id 
CHECK (
    (status != 'completed') OR 
    (status = 'completed' AND wordpress_post_id IS NOT NULL)
);

-- Ensure error jobs have error message
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_error_has_message 
CHECK (
    (status != 'error') OR 
    (status = 'error' AND last_error IS NOT NULL AND LENGTH(TRIM(last_error)) > 0)
);

-- Ensure model field is valid OpenAI model
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_model_valid 
CHECK (
    model IS NULL OR 
    model IN ('gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k')
);

-- Ensure prompt_template is reasonable length if provided
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_prompt_template_length 
CHECK (
    prompt_template IS NULL OR 
    (LENGTH(TRIM(prompt_template)) > 0 AND LENGTH(prompt_template) <= 10000)
);

-- Ensure generated content is reasonable length if provided
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_generated_content_length 
CHECK (
    generated_content IS NULL OR 
    (LENGTH(TRIM(generated_content)) > 0 AND LENGTH(generated_content) <= 100000)
);

-- Ensure generated title is reasonable length if provided
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_generated_title_length 
CHECK (
    generated_title IS NULL OR 
    (LENGTH(TRIM(generated_title)) > 0 AND LENGTH(generated_title) <= 200)
);

-- Ensure WordPress post ID is positive if provided
ALTER TABLE content_jobs 
ADD CONSTRAINT chk_content_jobs_wordpress_post_id_positive 
CHECK (wordpress_post_id IS NULL OR wordpress_post_id > 0);

-- Add constraints to job_runs table
-- Ensure status is valid
ALTER TABLE job_runs 
ADD CONSTRAINT chk_job_runs_status_valid 
CHECK (status IN ('started', 'completed', 'failed', 'retrying'));

-- Ensure duration fields are positive if provided
ALTER TABLE job_runs 
ADD CONSTRAINT chk_job_runs_duration_positive 
CHECK (
    (function_duration_ms IS NULL OR function_duration_ms >= 0) AND
    (openai_duration_ms IS NULL OR openai_duration_ms >= 0) AND
    (wordpress_duration_ms IS NULL OR wordpress_duration_ms >= 0) AND
    (total_duration_ms IS NULL OR total_duration_ms >= 0)
);

-- Ensure retry_attempt is non-negative
ALTER TABLE job_runs 
ADD CONSTRAINT chk_job_runs_retry_attempt_non_negative 
CHECK (retry_attempt >= 0);

-- Ensure error_details is valid JSON if provided
ALTER TABLE job_runs 
ADD CONSTRAINT chk_job_runs_error_details_json 
CHECK (
    error_details IS NULL OR 
    jsonb_typeof(error_details) = 'object'
);

-- Ensure timings is valid JSON if provided
ALTER TABLE job_runs 
ADD CONSTRAINT chk_job_runs_timings_json 
CHECK (
    timings IS NULL OR 
    jsonb_typeof(timings) = 'object'
);

-- Create unique constraint to prevent duplicate WordPress posts
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_jobs_wordpress_post_id_unique 
ON content_jobs(wordpress_post_id) 
WHERE wordpress_post_id IS NOT NULL;

-- Create function to validate job data integrity
CREATE OR REPLACE FUNCTION validate_job_integrity(p_job_id UUID)
RETURNS TABLE (
    is_valid BOOLEAN,
    validation_errors TEXT[]
) AS $$
DECLARE
    job_record RECORD;
    errors TEXT[] := '{}';
    is_job_valid BOOLEAN := TRUE;
BEGIN
    -- Get job record
    SELECT * INTO job_record FROM content_jobs WHERE id = p_job_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, ARRAY['Job not found'];
        RETURN;
    END IF;
    
    -- Validate topic
    IF LENGTH(TRIM(job_record.topic)) = 0 THEN
        errors := array_append(errors, 'Topic cannot be empty');
        is_job_valid := FALSE;
    END IF;
    
    -- Validate status-specific constraints
    IF job_record.status = 'processing' AND job_record.claimed_at IS NULL THEN
        errors := array_append(errors, 'Processing jobs must have claimed_at timestamp');
        is_job_valid := FALSE;
    END IF;
    
    IF job_record.status = 'completed' THEN
        IF job_record.generated_title IS NULL THEN
            errors := array_append(errors, 'Completed jobs must have generated_title');
            is_job_valid := FALSE;
        END IF;
        IF job_record.generated_content IS NULL THEN
            errors := array_append(errors, 'Completed jobs must have generated_content');
            is_job_valid := FALSE;
        END IF;
        IF job_record.wordpress_post_id IS NULL THEN
            errors := array_append(errors, 'Completed jobs must have wordpress_post_id');
            is_job_valid := FALSE;
        END IF;
    END IF;
    
    IF job_record.status = 'error' AND (job_record.last_error IS NULL OR LENGTH(TRIM(job_record.last_error)) = 0) THEN
        errors := array_append(errors, 'Error jobs must have last_error message');
        is_job_valid := FALSE;
    END IF;
    
    -- Validate retry count
    IF job_record.retry_count < 0 OR job_record.retry_count > 3 THEN
        errors := array_append(errors, 'Retry count must be between 0 and 3');
        is_job_valid := FALSE;
    END IF;
    
    RETURN QUERY SELECT is_job_valid, errors;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate all jobs integrity
CREATE OR REPLACE FUNCTION validate_all_jobs_integrity()
RETURNS TABLE (
    total_jobs BIGINT,
    valid_jobs BIGINT,
    invalid_jobs BIGINT,
    integrity_issues TEXT[]
) AS $$
DECLARE
    job_record RECORD;
    issues TEXT[] := '{}';
    valid_count BIGINT := 0;
    invalid_count BIGINT := 0;
    total_count BIGINT := 0;
BEGIN
    FOR job_record IN SELECT * FROM content_jobs LOOP
        total_count := total_count + 1;
        
        -- Check basic constraints
        IF LENGTH(TRIM(job_record.topic)) = 0 THEN
            issues := array_append(issues, 'Job ' || job_record.id || ': Empty topic');
            invalid_count := invalid_count + 1;
        ELSIF job_record.status = 'processing' AND job_record.claimed_at IS NULL THEN
            issues := array_append(issues, 'Job ' || job_record.id || ': Processing without claimed_at');
            invalid_count := invalid_count + 1;
        ELSIF job_record.status = 'completed' AND (job_record.generated_title IS NULL OR job_record.wordpress_post_id IS NULL) THEN
            issues := array_append(issues, 'Job ' || job_record.id || ': Completed without required fields');
            invalid_count := invalid_count + 1;
        ELSIF job_record.status = 'error' AND (job_record.last_error IS NULL OR LENGTH(TRIM(job_record.last_error)) = 0) THEN
            issues := array_append(issues, 'Job ' || job_record.id || ': Error without error message');
            invalid_count := invalid_count + 1;
        ELSE
            valid_count := valid_count + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT total_count, valid_count, invalid_count, issues;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to validate data before insert/update
CREATE OR REPLACE FUNCTION validate_content_jobs_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate topic
    IF LENGTH(TRIM(NEW.topic)) = 0 THEN
        RAISE EXCEPTION 'Topic cannot be empty';
    END IF;
    
    -- Validate status-specific constraints
    IF NEW.status = 'processing' AND NEW.claimed_at IS NULL THEN
        RAISE EXCEPTION 'Processing jobs must have claimed_at timestamp';
    END IF;
    
    IF NEW.status = 'completed' THEN
        IF NEW.generated_title IS NULL OR NEW.generated_content IS NULL OR NEW.wordpress_post_id IS NULL THEN
            RAISE EXCEPTION 'Completed jobs must have generated_title, generated_content, and wordpress_post_id';
        END IF;
    END IF;
    
    IF NEW.status = 'error' AND (NEW.last_error IS NULL OR LENGTH(TRIM(NEW.last_error)) = 0) THEN
        RAISE EXCEPTION 'Error jobs must have last_error message';
    END IF;
    
    -- Validate retry count
    IF NEW.retry_count < 0 OR NEW.retry_count > 3 THEN
        RAISE EXCEPTION 'Retry count must be between 0 and 3';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for content_jobs validation
DROP TRIGGER IF EXISTS trigger_validate_content_jobs ON content_jobs;
CREATE TRIGGER trigger_validate_content_jobs
    BEFORE INSERT OR UPDATE ON content_jobs
    FOR EACH ROW
    EXECUTE FUNCTION validate_content_jobs_data();

-- Create trigger function to validate job_runs data
CREATE OR REPLACE FUNCTION validate_job_runs_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate duration fields
    IF NEW.function_duration_ms IS NOT NULL AND NEW.function_duration_ms < 0 THEN
        RAISE EXCEPTION 'Function duration cannot be negative';
    END IF;
    
    IF NEW.openai_duration_ms IS NOT NULL AND NEW.openai_duration_ms < 0 THEN
        RAISE EXCEPTION 'OpenAI duration cannot be negative';
    END IF;
    
    IF NEW.wordpress_duration_ms IS NOT NULL AND NEW.wordpress_duration_ms < 0 THEN
        RAISE EXCEPTION 'WordPress duration cannot be negative';
    END IF;
    
    IF NEW.total_duration_ms IS NOT NULL AND NEW.total_duration_ms < 0 THEN
        RAISE EXCEPTION 'Total duration cannot be negative';
    END IF;
    
    -- Validate retry attempt
    IF NEW.retry_attempt < 0 THEN
        RAISE EXCEPTION 'Retry attempt cannot be negative';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for job_runs validation
DROP TRIGGER IF EXISTS trigger_validate_job_runs ON job_runs;
CREATE TRIGGER trigger_validate_job_runs
    BEFORE INSERT OR UPDATE ON job_runs
    FOR EACH ROW
    EXECUTE FUNCTION validate_job_runs_data();

-- Add comments for documentation
COMMENT ON CONSTRAINT chk_content_jobs_topic_not_empty ON content_jobs IS 'Ensures topic is not empty and has reasonable length';
COMMENT ON CONSTRAINT chk_content_jobs_retry_count_range ON content_jobs IS 'Ensures retry count is within valid range (0-3)';
COMMENT ON CONSTRAINT chk_content_jobs_status_valid ON content_jobs IS 'Ensures status is one of the valid values';
COMMENT ON CONSTRAINT chk_content_jobs_claimed_at_processing ON content_jobs IS 'Ensures claimed_at is only set when status is processing';
COMMENT ON CONSTRAINT chk_content_jobs_completed_has_content ON content_jobs IS 'Ensures completed jobs have generated content';
COMMENT ON CONSTRAINT chk_content_jobs_completed_has_wordpress_id ON content_jobs IS 'Ensures completed jobs have WordPress post ID';
COMMENT ON CONSTRAINT chk_content_jobs_error_has_message ON content_jobs IS 'Ensures error jobs have error message';
COMMENT ON CONSTRAINT chk_content_jobs_model_valid ON content_jobs IS 'Ensures model field is valid OpenAI model';
COMMENT ON CONSTRAINT chk_content_jobs_prompt_template_length ON content_jobs IS 'Ensures prompt template has reasonable length';
COMMENT ON CONSTRAINT chk_content_jobs_generated_content_length ON content_jobs IS 'Ensures generated content has reasonable length';
COMMENT ON CONSTRAINT chk_content_jobs_generated_title_length ON content_jobs IS 'Ensures generated title has reasonable length';
COMMENT ON CONSTRAINT chk_content_jobs_wordpress_post_id_positive ON content_jobs IS 'Ensures WordPress post ID is positive';
COMMENT ON CONSTRAINT chk_job_runs_status_valid ON job_runs IS 'Ensures job run status is valid';
COMMENT ON CONSTRAINT chk_job_runs_duration_positive ON job_runs IS 'Ensures duration fields are non-negative';
COMMENT ON CONSTRAINT chk_job_runs_retry_attempt_non_negative ON job_runs IS 'Ensures retry attempt is non-negative';
COMMENT ON CONSTRAINT chk_job_runs_error_details_json ON job_runs IS 'Ensures error details is valid JSON';
COMMENT ON CONSTRAINT chk_job_runs_timings_json ON job_runs IS 'Ensures timings is valid JSON';
COMMENT ON FUNCTION validate_job_integrity(UUID) IS 'Validates data integrity for a specific job';
COMMENT ON FUNCTION validate_all_jobs_integrity() IS 'Validates data integrity for all jobs';
COMMENT ON FUNCTION validate_content_jobs_data() IS 'Trigger function to validate content_jobs data';
COMMENT ON FUNCTION validate_job_runs_data() IS 'Trigger function to validate job_runs data';
