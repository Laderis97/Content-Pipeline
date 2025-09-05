-- Migration: Create idempotency_keys table for duplicate prevention
-- Purpose: Prevent duplicate content generation and WordPress posts
-- PRD Reference: Success Metrics (<1% duplicate posts), Functional Requirements 6, 51

-- Create idempotency_keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    job_id UUID NOT NULL REFERENCES content_jobs(id) ON DELETE CASCADE,
    topic_hash TEXT NOT NULL,
    content_hash TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE idempotency_keys IS 'Idempotency keys for preventing duplicate content generation';
COMMENT ON COLUMN idempotency_keys.key IS 'Unique idempotency key for the operation';
COMMENT ON COLUMN idempotency_keys.job_id IS 'Reference to the content job';
COMMENT ON COLUMN idempotency_keys.topic_hash IS 'Hash of the topic for duplicate detection';
COMMENT ON COLUMN idempotency_keys.content_hash IS 'Hash of the generated content for duplicate detection';
COMMENT ON COLUMN idempotency_keys.expires_at IS 'When the idempotency key expires';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_job_id ON idempotency_keys(job_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_topic_hash ON idempotency_keys(topic_hash);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_content_hash ON idempotency_keys(content_hash);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

-- Create composite index for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_duplicate_detection 
ON idempotency_keys(topic_hash, content_hash, expires_at);

-- Add content_fingerprint column to content_jobs for enhanced duplicate detection
ALTER TABLE content_jobs 
ADD COLUMN IF NOT EXISTS content_fingerprint JSONB;

-- Create index for content fingerprint queries
CREATE INDEX IF NOT EXISTS idx_content_jobs_content_fingerprint 
ON content_jobs USING GIN (content_fingerprint);

-- Create function to check for topic duplicates
CREATE OR REPLACE FUNCTION check_topic_duplicates(
    p_topic TEXT,
    p_exclude_job_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    duplicate_job_id UUID,
    duplicate_wordpress_post_id INTEGER,
    similarity_score NUMERIC
) AS $$
DECLARE
    topic_words TEXT[];
    job_record RECORD;
    max_similarity NUMERIC := 0;
    best_match_job_id UUID;
    best_match_wordpress_post_id INTEGER;
BEGIN
    -- Split topic into words for similarity comparison
    topic_words := string_to_array(lower(trim(p_topic)), ' ');
    
    -- Look for similar topics in completed jobs from the last 7 days
    FOR job_record IN 
        SELECT id, topic, wordpress_post_id
        FROM content_jobs 
        WHERE status = 'completed'
            AND (p_exclude_job_id IS NULL OR id != p_exclude_job_id)
            AND created_at >= NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 50
    LOOP
        -- Calculate similarity (simple word overlap)
        DECLARE
            job_words TEXT[];
            intersection_count INTEGER := 0;
            union_count INTEGER := 0;
            similarity NUMERIC;
        BEGIN
            job_words := string_to_array(lower(trim(job_record.topic)), ' ');
            
            -- Count intersection
            FOR i IN 1..array_length(topic_words, 1) LOOP
                IF job_words @> ARRAY[topic_words[i]] THEN
                    intersection_count := intersection_count + 1;
                END IF;
            END LOOP;
            
            -- Count union
            union_count := array_length(topic_words, 1) + array_length(job_words, 1) - intersection_count;
            
            -- Calculate similarity
            IF union_count > 0 THEN
                similarity := intersection_count::NUMERIC / union_count::NUMERIC;
                
                IF similarity > max_similarity THEN
                    max_similarity := similarity;
                    best_match_job_id := job_record.id;
                    best_match_wordpress_post_id := job_record.wordpress_post_id;
                END IF;
            END IF;
        END;
    END LOOP;
    
    -- Return result if similarity is above threshold (80%)
    IF max_similarity > 0.8 THEN
        RETURN QUERY SELECT TRUE, best_match_job_id, best_match_wordpress_post_id, max_similarity;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::INTEGER, 0::NUMERIC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to check for WordPress post ID duplicates
CREATE OR REPLACE FUNCTION check_wordpress_post_duplicates(
    p_wordpress_post_id INTEGER,
    p_exclude_job_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    duplicate_job_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as is_duplicate,
        cj.id as duplicate_job_id
    FROM content_jobs cj
    WHERE cj.wordpress_post_id = p_wordpress_post_id
        AND (p_exclude_job_id IS NULL OR cj.id != p_exclude_job_id)
    LIMIT 1;
    
    -- If no duplicates found, return false
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get duplicate statistics
CREATE OR REPLACE FUNCTION get_duplicate_statistics()
RETURNS TABLE (
    total_jobs BIGINT,
    completed_jobs BIGINT,
    potential_duplicates BIGINT,
    duplicate_rate NUMERIC,
    topic_duplicates BIGINT,
    wordpress_duplicates BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE content_fingerprint IS NOT NULL) as potential_duplicates,
        ROUND(
            (COUNT(*) FILTER (WHERE content_fingerprint IS NOT NULL)::NUMERIC / 
             NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0)) * 100, 
            2
        ) as duplicate_rate,
        COUNT(*) FILTER (WHERE content_fingerprint->>'topic_hash' IS NOT NULL) as topic_duplicates,
        COUNT(*) FILTER (WHERE wordpress_post_id IS NOT NULL) as wordpress_duplicates
    FROM content_jobs;
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup expired idempotency keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM idempotency_keys 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for functions
COMMENT ON FUNCTION check_topic_duplicates(TEXT, UUID) IS 'Checks for duplicate topics with similarity scoring';
COMMENT ON FUNCTION check_wordpress_post_duplicates(INTEGER, UUID) IS 'Checks for duplicate WordPress post IDs';
COMMENT ON FUNCTION get_duplicate_statistics() IS 'Returns duplicate detection statistics';
COMMENT ON FUNCTION cleanup_expired_idempotency_keys() IS 'Cleans up expired idempotency keys and returns count';
