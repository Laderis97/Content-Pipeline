-- Set up pg_cron scheduler for regular job processing
-- PRD Reference: Configuration & Deployment (6.3), Performance & Scalability (F1-F3)

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to trigger content automation
CREATE OR REPLACE FUNCTION trigger_content_automation()
RETURNS VOID AS $$
BEGIN
    -- Call the content automation Edge Function
    PERFORM net.http_post(
        url := current_setting('app.content_automation_url', true),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := jsonb_build_object(
            'action', 'process_jobs',
            'max_jobs', 5,
            'timeout_ms', 300000
        )
    );
    
    -- Log the trigger
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
    -- Log any errors
    INSERT INTO job_runs (
        job_id,
        status,
        started_at,
        completed_at,
        processing_time_ms,
        error_message,
        metadata
    ) VALUES (
        gen_random_uuid(),
        'failed',
        NOW(),
        NOW(),
        0,
        SQLERRM,
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_content_automation',
            'error', SQLERRM,
            'timestamp', NOW()
        )
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create function to trigger sweeper
CREATE OR REPLACE FUNCTION trigger_sweeper()
RETURNS VOID AS $$
BEGIN
    -- Call the sweeper Edge Function
    PERFORM net.http_post(
        url := current_setting('app.sweeper_url', true),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := jsonb_build_object(
            'action', 'sweep',
            'timeout_minutes', 30,
            'batch_size', 100
        )
    );
    
    -- Log the trigger
    INSERT INTO sweeper_logs (
        timestamp,
        action,
        status,
        records_processed,
        duration_ms,
        metadata
    ) VALUES (
        NOW(),
        'scheduled_sweep',
        'started',
        0,
        0,
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_sweeper',
            'timestamp', NOW()
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO sweeper_logs (
        timestamp,
        action,
        status,
        records_processed,
        duration_ms,
        error_details,
        metadata
    ) VALUES (
        NOW(),
        'scheduled_sweep',
        'failed',
        0,
        0,
        jsonb_build_object('error', SQLERRM),
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_sweeper',
            'error', SQLERRM,
            'timestamp', NOW()
        )
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create function to trigger monitoring
CREATE OR REPLACE FUNCTION trigger_monitoring()
RETURNS VOID AS $$
BEGIN
    -- Call the monitoring Edge Function
    PERFORM net.http_post(
        url := current_setting('app.monitor_url', true),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := jsonb_build_object(
            'action', 'monitor',
            'time_period', 'daily',
            'check_alerts', true
        )
    );
    
    -- Log the trigger
    INSERT INTO monitoring_alerts (
        timestamp,
        alert_type,
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
    -- Log any errors
    INSERT INTO monitoring_alerts (
        timestamp,
        alert_type,
        severity,
        message,
        status,
        metadata
    ) VALUES (
        NOW(),
        'scheduled_monitoring',
        'critical',
        'Scheduled monitoring check failed: ' || SQLERRM,
        'active',
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_monitoring',
            'error', SQLERRM,
            'timestamp', NOW()
        )
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create function to trigger metrics collection
CREATE OR REPLACE FUNCTION trigger_metrics_collection()
RETURNS VOID AS $$
BEGIN
    -- Call the metrics Edge Function
    PERFORM net.http_post(
        url := current_setting('app.metrics_url', true),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := jsonb_build_object(
            'action', 'collect',
            'time_period', 'hourly'
        )
    );
    
    -- Log the trigger
    INSERT INTO metrics_data (
        metric_type,
        metric_name,
        metric_value,
        metric_unit,
        timestamp,
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
    -- Log any errors
    INSERT INTO metrics_data (
        metric_type,
        metric_name,
        metric_value,
        metric_unit,
        timestamp,
        metadata
    ) VALUES (
        'system',
        'scheduled_metrics_collection_error',
        1,
        'count',
        NOW(),
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_metrics_collection',
            'error', SQLERRM,
            'timestamp', NOW()
        )
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create function to trigger health checks
CREATE OR REPLACE FUNCTION trigger_health_checks()
RETURNS VOID AS $$
BEGIN
    -- Call the health Edge Function
    PERFORM net.http_post(
        url := current_setting('app.health_url', true),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := jsonb_build_object(
            'action', 'check',
            'components', jsonb_build_array('database', 'openai', 'wordpress', 'system')
        )
    );
    
    -- Log the trigger
    INSERT INTO health_checks (
        timestamp,
        component,
        status,
        response_time_ms,
        details,
        metadata
    ) VALUES (
        NOW(),
        'scheduler',
        'healthy',
        0,
        jsonb_build_object('message', 'Health check triggered'),
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_health_checks',
            'timestamp', NOW()
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO health_checks (
        timestamp,
        component,
        status,
        response_time_ms,
        details,
        metadata
    ) VALUES (
        NOW(),
        'scheduler',
        'critical',
        0,
        jsonb_build_object('error', SQLERRM),
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_health_checks',
            'error', SQLERRM,
            'timestamp', NOW()
        )
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create function to trigger cleanup
CREATE OR REPLACE FUNCTION trigger_cleanup()
RETURNS VOID AS $$
BEGIN
    -- Call the cleanup Edge Function
    PERFORM net.http_post(
        url := current_setting('app.cleanup_url', true),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := jsonb_build_object(
            'action', 'cleanup',
            'retention_days', 30,
            'dry_run', false
        )
    );
    
    -- Log the trigger
    INSERT INTO cleanup_logs (
        timestamp,
        operation_type,
        table_name,
        records_processed,
        records_archived,
        records_deleted,
        duration_ms,
        status,
        metadata
    ) VALUES (
        NOW(),
        'scheduled_cleanup',
        'all_tables',
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
    -- Log any errors
    INSERT INTO cleanup_logs (
        timestamp,
        operation_type,
        table_name,
        records_processed,
        records_archived,
        records_deleted,
        duration_ms,
        status,
        error_details,
        metadata
    ) VALUES (
        NOW(),
        'scheduled_cleanup',
        'all_tables',
        0,
        0,
        0,
        0,
        'failed',
        jsonb_build_object('error', SQLERRM),
        jsonb_build_object(
            'trigger_type', 'scheduled',
            'function', 'trigger_cleanup',
            'error', SQLERRM,
            'timestamp', NOW()
        )
    );
    
    RAISE;
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
BEGIN
    IF enable_job THEN
        PERFORM cron.alter_job(job_name, active := true);
        RETURN QUERY SELECT true, 'Job enabled: ' || job_name;
    ELSE
        PERFORM cron.alter_job(job_name, active := false);
        RETURN QUERY SELECT true, 'Job disabled: ' || job_name;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Failed to toggle job ' || job_name || ': ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Set up application settings (these should be configured in production)
-- Note: These are placeholder values and should be replaced with actual URLs
ALTER SYSTEM SET app.content_automation_url = 'https://your-project.supabase.co/functions/v1/content-automation';
ALTER SYSTEM SET app.sweeper_url = 'https://your-project.supabase.co/functions/v1/sweeper';
ALTER SYSTEM SET app.monitor_url = 'https://your-project.supabase.co/functions/v1/monitor';
ALTER SYSTEM SET app.metrics_url = 'https://your-project.supabase.co/functions/v1/metrics';
ALTER SYSTEM SET app.health_url = 'https://your-project.supabase.co/functions/v1/health';
ALTER SYSTEM SET app.cleanup_url = 'https://your-project.supabase.co/functions/v1/cleanup';
ALTER SYSTEM SET app.service_role_key = 'your-service-role-key-here';

-- Create cron jobs for content automation
-- Main content processing job - runs every 5 minutes
SELECT cron.schedule(
    'content_pipeline_main',
    '*/5 * * * *', -- Every 5 minutes
    'SELECT trigger_content_automation();'
);

-- Sweeper job - runs every 15 minutes
SELECT cron.schedule(
    'content_pipeline_sweeper',
    '*/15 * * * *', -- Every 15 minutes
    'SELECT trigger_sweeper();'
);

-- Monitoring job - runs every hour
SELECT cron.schedule(
    'content_pipeline_monitor',
    '0 * * * *', -- Every hour at minute 0
    'SELECT trigger_monitoring();'
);

-- Metrics collection job - runs every 30 minutes
SELECT cron.schedule(
    'content_pipeline_metrics',
    '*/30 * * * *', -- Every 30 minutes
    'SELECT trigger_metrics_collection();'
);

-- Health checks job - runs every 10 minutes
SELECT cron.schedule(
    'content_pipeline_health',
    '*/10 * * * *', -- Every 10 minutes
    'SELECT trigger_health_checks();'
);

-- Cleanup job - runs daily at 2 AM
SELECT cron.schedule(
    'content_pipeline_cleanup',
    '0 2 * * *', -- Daily at 2 AM
    'SELECT trigger_cleanup();'
);

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
    -- Check if all required settings are configured
    IF current_setting('app.content_automation_url', true) = '' THEN
        RETURN QUERY SELECT 'configuration'::TEXT, 'N/A'::TEXT, 'error'::TEXT, 'Content automation URL not configured'::TEXT;
        RETURN;
    END IF;
    
    IF current_setting('app.service_role_key', true) = '' THEN
        RETURN QUERY SELECT 'configuration'::TEXT, 'N/A'::TEXT, 'error'::TEXT, 'Service role key not configured'::TEXT;
        RETURN;
    END IF;
    
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

-- Create function to get scheduler health
CREATE OR REPLACE FUNCTION get_scheduler_health()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    error_count BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH job_stats AS (
        SELECT 
            j.jobname,
            j.active,
            j.last_run,
            j.next_run,
            COUNT(jr.id) FILTER (WHERE jr.status = 'failed') as error_count,
            COUNT(jr.id) as total_runs,
            CASE 
                WHEN COUNT(jr.id) > 0 THEN 
                    (COUNT(jr.id) FILTER (WHERE jr.status = 'completed')::NUMERIC / COUNT(jr.id)::NUMERIC) * 100
                ELSE 0
            END as success_rate
        FROM cron.job j
        LEFT JOIN job_runs jr ON jr.metadata->>'function' = j.jobname
        WHERE j.jobname LIKE 'content_pipeline_%'
        GROUP BY j.jobname, j.active, j.last_run, j.next_run
    )
    SELECT 
        js.jobname::TEXT as component,
        CASE 
            WHEN js.active THEN 'healthy'
            ELSE 'inactive'
        END::TEXT as status,
        js.last_run,
        js.next_run,
        COALESCE(js.error_count, 0) as error_count,
        COALESCE(js.success_rate, 0) as success_rate
    FROM job_stats js
    ORDER BY js.jobname;
END;
$$ LANGUAGE plpgsql;

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
GRANT EXECUTE ON FUNCTION get_scheduler_health() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION trigger_content_automation() IS 'Triggers the main content automation Edge Function';
COMMENT ON FUNCTION trigger_sweeper() IS 'Triggers the sweeper Edge Function to clean up stale jobs';
COMMENT ON FUNCTION trigger_monitoring() IS 'Triggers the monitoring Edge Function for system health checks';
COMMENT ON FUNCTION trigger_metrics_collection() IS 'Triggers the metrics collection Edge Function';
COMMENT ON FUNCTION trigger_health_checks() IS 'Triggers the health checks Edge Function';
COMMENT ON FUNCTION trigger_cleanup() IS 'Triggers the cleanup Edge Function for data archival';
COMMENT ON FUNCTION manage_cron_jobs() IS 'Lists all content pipeline cron jobs';
COMMENT ON FUNCTION get_cron_job_status() IS 'Gets the status of all cron jobs';
COMMENT ON FUNCTION toggle_cron_job(TEXT, BOOLEAN) IS 'Enables or disables a specific cron job';
COMMENT ON FUNCTION initialize_scheduler() IS 'Initializes and validates the scheduler configuration';
COMMENT ON FUNCTION get_scheduler_health() IS 'Gets the health status of the scheduler system';
