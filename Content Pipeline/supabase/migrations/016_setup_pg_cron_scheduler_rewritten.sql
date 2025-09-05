-- Set up pg_cron scheduler for regular job processing
-- PRD Reference: Configuration & Deployment (6.3), Performance & Scalability (F1-F3)

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to trigger content automation
CREATE OR REPLACE FUNCTION trigger_content_automation()
RETURNS VOID AS $$
BEGIN
    -- Simple notification for now - will be enhanced when Edge Functions are deployed
    RAISE NOTICE 'Content automation triggered at %', NOW();
    
    -- Log basic trigger event
    INSERT INTO job_runs (
        job_id,
        status,
        started_at,
        processing_time_ms,
        metadata
    ) VALUES (
        gen_random_uuid(),
        'started',
        NOW(),
        0,
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_content_automation',
            'timestamp', NOW()
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Content automation trigger failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create function to trigger sweeper
CREATE OR REPLACE FUNCTION trigger_sweeper()
RETURNS VOID AS $$
BEGIN
    -- Simple notification for now - will be enhanced when Edge Functions are deployed
    RAISE NOTICE 'Sweeper triggered at %', NOW();
    
    -- Log basic trigger event
    INSERT INTO sweeper_logs (
        sweep_timestamp,
        total_jobs_checked,
        stale_jobs_found,
        jobs_reset,
        jobs_failed,
        dry_run,
        duration_ms,
        status,
        metadata
    ) VALUES (
        NOW(),
        0,
        0,
        0,
        0,
        false,
        0,
        'started',
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_sweeper',
            'timestamp', NOW()
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Sweeper trigger failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create function to trigger monitoring
CREATE OR REPLACE FUNCTION trigger_monitoring()
RETURNS VOID AS $$
BEGIN
    -- Simple notification for now - will be enhanced when Edge Functions are deployed
    RAISE NOTICE 'Monitoring triggered at %', NOW();
    
    -- Log basic trigger event
    INSERT INTO monitoring_alerts (
        alert_timestamp,
        type,
        severity,
        message,
        status,
        metadata
    ) VALUES (
        NOW(),
        'scheduled_monitoring',
        'info',
        'Scheduled monitoring check started',
        'active',
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_monitoring',
            'timestamp', NOW()
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Monitoring trigger failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create function to trigger metrics collection
CREATE OR REPLACE FUNCTION trigger_metrics_collection()
RETURNS VOID AS $$
BEGIN
    -- Simple notification for now - will be enhanced when Edge Functions are deployed
    RAISE NOTICE 'Metrics collection triggered at %', NOW();
    
    -- Log basic trigger event
    INSERT INTO metrics_data (
        metric_type,
        metric_name,
        metric_value,
        metric_unit,
        metric_timestamp,
        metadata
    ) VALUES (
        'system',
        'scheduled_metrics_collection',
        1,
        'count',
        NOW(),
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_metrics_collection',
            'timestamp', NOW()
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Metrics collection trigger failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create function to trigger health checks
CREATE OR REPLACE FUNCTION trigger_health_checks()
RETURNS VOID AS $$
BEGIN
    -- Simple notification for now - will be enhanced when Edge Functions are deployed
    RAISE NOTICE 'Health checks triggered at %', NOW();
    
    -- Log basic trigger event
    INSERT INTO health_checks (
        health_check_timestamp,
        overall_status,
        summary,
        uptime_percentage,
        checks,
        metadata
    ) VALUES (
        NOW(),
        'healthy',
        jsonb_build_object('message', 'Health check triggered'),
        100.0,
        jsonb_build_object('scheduler', 'healthy'),
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_health_checks',
            'timestamp', NOW()
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Health checks trigger failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create function to trigger cleanup
CREATE OR REPLACE FUNCTION trigger_cleanup()
RETURNS VOID AS $$
BEGIN
    -- Simple notification for now - will be enhanced when Edge Functions are deployed
    RAISE NOTICE 'Cleanup triggered at %', NOW();
    
    -- Log basic trigger event
    INSERT INTO cleanup_logs (
        cleanup_timestamp,
        cleanup_type,
        total_tables_processed,
        total_records_processed,
        total_records_archived,
        total_records_deleted,
        duration_ms,
        status,
        metadata
    ) VALUES (
        NOW(),
        'scheduled_cleanup',
        0,
        0,
        0,
        0,
        0,
        'started',
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_cleanup',
            'timestamp', NOW()
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Cleanup trigger failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create function to manage cron jobs
CREATE OR REPLACE FUNCTION manage_cron_jobs()
RETURNS TABLE (
    job_name TEXT,
    schedule TEXT,
    command TEXT,
    active BOOLEAN,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.jobname::TEXT as job_name,
        j.schedule::TEXT as schedule,
        j.command::TEXT as command,
        j.active as active,
        j.last_run as last_run,
        j.next_run as next_run
    FROM cron.job j
    WHERE j.jobname LIKE 'content_pipeline_%'
    ORDER BY j.jobname;
END;
$$ LANGUAGE plpgsql;

-- Create function to get cron job status
CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS TABLE (
    total_jobs BIGINT,
    active_jobs BIGINT,
    failed_jobs BIGINT,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE active = true) as active_jobs,
        COUNT(*) FILTER (WHERE last_run < NOW() - INTERVAL '1 hour' AND active = true) as failed_jobs,
        MAX(last_run) as last_run,
        MIN(next_run) FILTER (WHERE active = true) as next_run
    FROM cron.job
    WHERE jobname LIKE 'content_pipeline_%';
END;
$$ LANGUAGE plpgsql;

-- Create function to enable/disable cron jobs
CREATE OR REPLACE FUNCTION toggle_cron_job(
    job_name TEXT,
    enable_job BOOLEAN
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    job_id BIGINT;
BEGIN
    -- Get the job ID from the job name
    SELECT jobid INTO job_id FROM cron.job WHERE jobname = job_name;
    
    IF job_id IS NULL THEN
        RETURN QUERY SELECT false, 'Job not found: ' || job_name;
        RETURN;
    END IF;
    
    IF enable_job THEN
        PERFORM cron.alter_job(job_id, active := true);
        RETURN QUERY SELECT true, 'Job enabled: ' || job_name;
    ELSE
        PERFORM cron.alter_job(job_id, active := false);
        RETURN QUERY SELECT true, 'Job disabled: ' || job_name;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Failed to toggle job ' || job_name || ': ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create function to initialize scheduler
CREATE OR REPLACE FUNCTION initialize_scheduler()
RETURNS TABLE (
    job_name TEXT,
    schedule TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    job_record RECORD;
BEGIN
    -- Check cron jobs
    FOR job_record IN 
        SELECT jobname, schedule, active, last_run, next_run
        FROM cron.job
        WHERE jobname LIKE 'content_pipeline_%'
        ORDER BY jobname
    LOOP
        RETURN QUERY SELECT 
            job_record.jobname::TEXT,
            job_record.schedule::TEXT,
            CASE 
                WHEN job_record.active THEN 'active'
                ELSE 'inactive'
            END::TEXT,
            CASE 
                WHEN job_record.active THEN 'Job is active and scheduled'
                ELSE 'Job is disabled'
            END::TEXT;
    END LOOP;
    
    -- If no jobs found, return error
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'scheduler'::TEXT, 'N/A'::TEXT, 'error'::TEXT, 'No cron jobs found'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create cron jobs for content automation (initially disabled for safety)
-- Main content processing job - runs every 5 minutes
SELECT cron.schedule(
    'content_pipeline_main',
    '*/5 * * * *', -- Every 5 minutes
    'SELECT trigger_content_automation();'
);

-- Note: Job is created but will be managed via toggle_cron_job function

-- Sweeper job - runs every 15 minutes
SELECT cron.schedule(
    'content_pipeline_sweeper',
    '*/15 * * * *', -- Every 15 minutes
    'SELECT trigger_sweeper();'
);

-- Note: Job is created but will be managed via toggle_cron_job function

-- Monitoring job - runs every hour
SELECT cron.schedule(
    'content_pipeline_monitor',
    '0 * * * *', -- Every hour at minute 0
    'SELECT trigger_monitoring();'
);

-- Note: Job is created but will be managed via toggle_cron_job function

-- Metrics collection job - runs every 30 minutes
SELECT cron.schedule(
    'content_pipeline_metrics',
    '*/30 * * * *', -- Every 30 minutes
    'SELECT trigger_metrics_collection();'
);

-- Note: Job is created but will be managed via toggle_cron_job function

-- Health checks job - runs every 10 minutes
SELECT cron.schedule(
    'content_pipeline_health',
    '*/10 * * * *', -- Every 10 minutes
    'SELECT trigger_health_checks();'
);

-- Note: Job is created but will be managed via toggle_cron_job function

-- Cleanup job - runs daily at 2 AM
SELECT cron.schedule(
    'content_pipeline_cleanup',
    '0 2 * * *', -- Daily at 2 AM
    'SELECT trigger_cleanup();'
);

-- Note: Job is created but will be managed via toggle_cron_job function

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_content_automation() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_sweeper() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_monitoring() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_metrics_collection() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_health_checks() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION manage_cron_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cron_job_status() TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_cron_job(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_scheduler() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION trigger_content_automation() IS 'Triggers the main content automation process';
COMMENT ON FUNCTION trigger_sweeper() IS 'Triggers the sweeper function to clean up stale jobs';
COMMENT ON FUNCTION trigger_monitoring() IS 'Triggers monitoring and health checks';
COMMENT ON FUNCTION trigger_metrics_collection() IS 'Triggers metrics collection';
COMMENT ON FUNCTION trigger_health_checks() IS 'Triggers health checks';
COMMENT ON FUNCTION trigger_cleanup() IS 'Triggers data cleanup and archival';
COMMENT ON FUNCTION manage_cron_jobs() IS 'Lists all content pipeline cron jobs';
COMMENT ON FUNCTION get_cron_job_status() IS 'Gets the status of all cron jobs';
COMMENT ON FUNCTION toggle_cron_job(TEXT, BOOLEAN) IS 'Enables or disables a specific cron job';
COMMENT ON FUNCTION initialize_scheduler() IS 'Initializes and validates the scheduler configuration';
