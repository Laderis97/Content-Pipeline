-- Create admin retry audit log table for manual retry overrides
-- PRD Reference: Edge Cases (G3), Error Handling & Monitoring (D1-D3), Data & Security (E1)

-- Create admin_retry_audit_log table
CREATE TABLE IF NOT EXISTS admin_retry_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES content_jobs(id) ON DELETE CASCADE,
    admin_user_id TEXT NOT NULL,
    admin_role TEXT NOT NULL CHECK (admin_role IN ('admin', 'super_admin', 'content_manager')),
    retry_type TEXT NOT NULL CHECK (retry_type IN ('manual_retry', 'force_retry', 'reset_retry_count', 'override_max_retries', 'emergency_retry')),
    reason TEXT NOT NULL CHECK (length(reason) >= 10 AND length(reason) <= 500),
    previous_status TEXT NOT NULL CHECK (previous_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    new_status TEXT NOT NULL CHECK (new_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    previous_retry_count INTEGER NOT NULL CHECK (previous_retry_count >= 0),
    new_retry_count INTEGER NOT NULL CHECK (new_retry_count >= 0),
    force_override BOOLEAN NOT NULL DEFAULT FALSE,
    reset_retry_count BOOLEAN NOT NULL DEFAULT FALSE,
    custom_delay INTEGER CHECK (custom_delay >= 0 AND custom_delay <= 3600000), -- Max 1 hour in milliseconds
    metadata JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_retry_audit_log_job_id ON admin_retry_audit_log(job_id);
CREATE INDEX IF NOT EXISTS idx_admin_retry_audit_log_admin_user_id ON admin_retry_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_retry_audit_log_timestamp ON admin_retry_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_retry_audit_log_retry_type ON admin_retry_audit_log(retry_type);
CREATE INDEX IF NOT EXISTS idx_admin_retry_audit_log_admin_role ON admin_retry_audit_log(admin_role);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_admin_retry_audit_log_job_timestamp ON admin_retry_audit_log(job_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_retry_audit_log_admin_timestamp ON admin_retry_audit_log(admin_user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_retry_audit_log_type_timestamp ON admin_retry_audit_log(retry_type, timestamp DESC);

-- Create partial indexes for specific use cases
CREATE INDEX IF NOT EXISTS idx_admin_retry_audit_log_force_override ON admin_retry_audit_log(force_override) WHERE force_override = TRUE;
CREATE INDEX IF NOT EXISTS idx_admin_retry_audit_log_emergency_retry ON admin_retry_audit_log(retry_type) WHERE retry_type = 'emergency_retry';

-- Create function to get admin retry statistics
CREATE OR REPLACE FUNCTION get_admin_retry_statistics(
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_manual_retries BIGINT,
    retries_by_type JSONB,
    retries_by_admin JSONB,
    success_rate NUMERIC,
    most_common_reasons JSONB,
    recent_retries JSONB
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    WITH retry_stats AS (
        SELECT 
            COUNT(*) as total_retries,
            jsonb_object_agg(retry_type, type_count) as retries_by_type,
            jsonb_object_agg(admin_user_id, admin_count) as retries_by_admin,
            jsonb_object_agg(reason, reason_count) as all_reasons
        FROM (
            SELECT 
                retry_type,
                COUNT(*) as type_count
            FROM admin_retry_audit_log 
            WHERE timestamp >= start_date
            GROUP BY retry_type
        ) type_stats
        CROSS JOIN (
            SELECT 
                admin_user_id,
                COUNT(*) as admin_count
            FROM admin_retry_audit_log 
            WHERE timestamp >= start_date
            GROUP BY admin_user_id
        ) admin_stats
        CROSS JOIN (
            SELECT 
                reason,
                COUNT(*) as reason_count
            FROM admin_retry_audit_log 
            WHERE timestamp >= start_date
            GROUP BY reason
        ) reason_stats
    ),
    success_stats AS (
        SELECT 
            COUNT(*) as successful_retries
        FROM admin_retry_audit_log 
        WHERE timestamp >= start_date
        AND previous_status = 'failed' 
        AND new_status = 'pending'
    ),
    recent_retries AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id,
                'job_id', job_id,
                'admin_user_id', admin_user_id,
                'retry_type', retry_type,
                'reason', reason,
                'timestamp', timestamp
            )
        ) as recent_data
        FROM (
            SELECT id, job_id, admin_user_id, retry_type, reason, timestamp
            FROM admin_retry_audit_log 
            WHERE timestamp >= start_date
            ORDER BY timestamp DESC 
            LIMIT 20
        ) recent
    )
    SELECT 
        rs.total_retries,
        rs.retries_by_type,
        rs.retries_by_admin,
        CASE 
            WHEN rs.total_retries > 0 THEN (ss.successful_retries::NUMERIC / rs.total_retries::NUMERIC) * 100
            ELSE 0
        END as success_rate,
        (
            SELECT jsonb_object_agg(reason, count)
            FROM (
                SELECT reason, COUNT(*) as count
                FROM admin_retry_audit_log 
                WHERE timestamp >= start_date
                GROUP BY reason
                ORDER BY count DESC
                LIMIT 10
            ) top_reasons
        ) as most_common_reasons,
        rr.recent_data as recent_retries
    FROM retry_stats rs
    CROSS JOIN success_stats ss
    CROSS JOIN recent_retries rr;
END;
$$ LANGUAGE plpgsql;

-- Create function to get job retry history
CREATE OR REPLACE FUNCTION get_job_retry_history(job_uuid UUID)
RETURNS TABLE (
    id UUID,
    admin_user_id TEXT,
    admin_role TEXT,
    retry_type TEXT,
    reason TEXT,
    previous_status TEXT,
    new_status TEXT,
    previous_retry_count INTEGER,
    new_retry_count INTEGER,
    force_override BOOLEAN,
    reset_retry_count BOOLEAN,
    custom_delay INTEGER,
    metadata JSONB,
    timestamp TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aral.id,
        aral.admin_user_id,
        aral.admin_role,
        aral.retry_type,
        aral.reason,
        aral.previous_status,
        aral.new_status,
        aral.previous_retry_count,
        aral.new_retry_count,
        aral.force_override,
        aral.reset_retry_count,
        aral.custom_delay,
        aral.metadata,
        aral.timestamp,
        aral.ip_address,
        aral.user_agent
    FROM admin_retry_audit_log aral
    WHERE aral.job_id = job_uuid
    ORDER BY aral.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate admin retry permissions
CREATE OR REPLACE FUNCTION validate_admin_retry_permissions(
    user_role TEXT,
    retry_type TEXT,
    force_override BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has admin role
    IF user_role NOT IN ('admin', 'super_admin', 'content_manager') THEN
        RETURN FALSE;
    END IF;
    
    -- Check for force override permissions
    IF force_override AND user_role NOT IN ('super_admin', 'admin') THEN
        RETURN FALSE;
    END IF;
    
    -- Check for emergency retry permissions
    IF retry_type = 'emergency_retry' AND user_role != 'super_admin' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get manual retry count for a job
CREATE OR REPLACE FUNCTION get_manual_retry_count(job_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    retry_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO retry_count
    FROM admin_retry_audit_log
    WHERE job_id = job_uuid
    AND retry_type IN ('manual_retry', 'force_retry');
    
    RETURN COALESCE(retry_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to get recent retry count for a job
CREATE OR REPLACE FUNCTION get_recent_retry_count(
    job_uuid UUID,
    hours_back INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
    retry_count INTEGER;
    cutoff_time TIMESTAMPTZ;
BEGIN
    cutoff_time := NOW() - (hours_back || ' hours')::INTERVAL;
    
    SELECT COUNT(*) INTO retry_count
    FROM admin_retry_audit_log
    WHERE job_id = job_uuid
    AND timestamp >= cutoff_time;
    
    RETURN COALESCE(retry_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to check retry eligibility
CREATE OR REPLACE FUNCTION check_retry_eligibility(
    job_uuid UUID,
    user_role TEXT,
    retry_type TEXT,
    force_override BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    eligible BOOLEAN,
    error_message TEXT,
    warnings TEXT[]
) AS $$
DECLARE
    job_status TEXT;
    job_retry_count INTEGER;
    manual_retry_count INTEGER;
    recent_retry_count INTEGER;
    warning_list TEXT[] := '{}';
BEGIN
    -- Get job status and retry count
    SELECT status, retry_count INTO job_status, job_retry_count
    FROM content_jobs
    WHERE id = job_uuid;
    
    -- Check if job exists
    IF job_status IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Job not found', '{}';
        RETURN;
    END IF;
    
    -- Check if job is in a retryable state
    IF job_status NOT IN ('failed', 'pending') THEN
        RETURN QUERY SELECT FALSE, 'Job is in ' || job_status || ' status and cannot be retried', '{}';
        RETURN;
    END IF;
    
    -- Get manual retry count
    SELECT get_manual_retry_count(job_uuid) INTO manual_retry_count;
    
    -- Get recent retry count
    SELECT get_recent_retry_count(job_uuid, 1) INTO recent_retry_count;
    
    -- Check retry count limits
    IF job_retry_count >= 10 AND NOT force_override THEN
        RETURN QUERY SELECT FALSE, 'Job has exceeded maximum retry count (10). Use force_override to bypass this limit.', '{}';
        RETURN;
    END IF;
    
    -- Check manual retry limits
    IF manual_retry_count >= 5 AND NOT force_override THEN
        RETURN QUERY SELECT FALSE, 'Job has exceeded maximum manual retry count (5). Use force_override to bypass this limit.', '{}';
        RETURN;
    END IF;
    
    -- Add warnings for high retry counts
    IF job_retry_count >= 5 THEN
        warning_list := array_append(warning_list, 'Job has been retried ' || job_retry_count || ' times, which is unusually high');
    END IF;
    
    IF manual_retry_count >= 3 THEN
        warning_list := array_append(warning_list, 'Job has been manually retried ' || manual_retry_count || ' times');
    END IF;
    
    IF recent_retry_count > 0 THEN
        warning_list := array_append(warning_list, 'Job was retried ' || recent_retry_count || ' time(s) in the last hour');
    END IF;
    
    RETURN QUERY SELECT TRUE, NULL, warning_list;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_admin_retry_audit_logs()
RETURNS VOID AS $$
BEGIN
    DELETE FROM admin_retry_audit_log
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log admin retry actions
CREATE OR REPLACE FUNCTION log_admin_retry_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the retry action to job_runs table for additional tracking
    INSERT INTO job_runs (
        job_id,
        status,
        retry_attempt,
        execution_time,
        error_details,
        timings
    ) VALUES (
        NEW.job_id,
        'retrying',
        NEW.new_retry_count,
        0,
        jsonb_build_object(
            'admin_retry', true,
            'admin_user_id', NEW.admin_user_id,
            'admin_role', NEW.admin_role,
            'retry_type', NEW.retry_type,
            'reason', NEW.reason,
            'force_override', NEW.force_override
        ),
        jsonb_build_object(
            'admin_retry_timestamp', NEW.timestamp
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_log_admin_retry_action
    AFTER INSERT ON admin_retry_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION log_admin_retry_action();

-- Add comments for documentation
COMMENT ON TABLE admin_retry_audit_log IS 'Audit log for manual retry overrides by admin users';
COMMENT ON COLUMN admin_retry_audit_log.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN admin_retry_audit_log.job_id IS 'Reference to the job being retried';
COMMENT ON COLUMN admin_retry_audit_log.admin_user_id IS 'ID of the admin user performing the retry';
COMMENT ON COLUMN admin_retry_audit_log.admin_role IS 'Role of the admin user (admin, super_admin, content_manager)';
COMMENT ON COLUMN admin_retry_audit_log.retry_type IS 'Type of retry operation performed';
COMMENT ON COLUMN admin_retry_audit_log.reason IS 'Reason provided by admin for the retry';
COMMENT ON COLUMN admin_retry_audit_log.previous_status IS 'Job status before the retry';
COMMENT ON COLUMN admin_retry_audit_log.new_status IS 'Job status after the retry';
COMMENT ON COLUMN admin_retry_audit_log.previous_retry_count IS 'Retry count before the retry';
COMMENT ON COLUMN admin_retry_audit_log.new_retry_count IS 'Retry count after the retry';
COMMENT ON COLUMN admin_retry_audit_log.force_override IS 'Whether force override was used';
COMMENT ON COLUMN admin_retry_audit_log.reset_retry_count IS 'Whether retry count was reset';
COMMENT ON COLUMN admin_retry_audit_log.custom_delay IS 'Custom delay in milliseconds (if any)';
COMMENT ON COLUMN admin_retry_audit_log.metadata IS 'Additional metadata for the retry operation';
COMMENT ON COLUMN admin_retry_audit_log.timestamp IS 'When the retry was performed';
COMMENT ON COLUMN admin_retry_audit_log.ip_address IS 'IP address of the admin user';
COMMENT ON COLUMN admin_retry_audit_log.user_agent IS 'User agent of the admin user';

-- Grant permissions
GRANT SELECT, INSERT ON admin_retry_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_retry_statistics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_retry_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_admin_retry_permissions(TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_manual_retry_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_retry_count(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_retry_eligibility(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_admin_retry_audit_logs() TO authenticated;
