-- Enable Row Level Security (RLS) on all public tables
-- This migration addresses security vulnerabilities identified by the database linter

-- Enable RLS on core content pipeline tables
ALTER TABLE public.content_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Enable RLS on monitoring and alerting tables
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_config ENABLE ROW LEVEL SECURITY;

-- Enable RLS on alerting tables
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on logging tables
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sweeper_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_retry_audit_log ENABLE ROW LEVEL SECURITY;

-- Enable RLS on backup and disaster recovery tables
ALTER TABLE public.backup_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_recovery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_recovery_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_retention ENABLE ROW LEVEL SECURITY;

-- Enable RLS on secrets management
ALTER TABLE public.vault_secrets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service role access
-- These policies allow the service role to access all tables for system operations

-- Content pipeline tables policies
CREATE POLICY "Service role can manage content_jobs" ON public.content_jobs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage job_runs" ON public.job_runs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage idempotency_keys" ON public.idempotency_keys
    FOR ALL USING (auth.role() = 'service_role');

-- Monitoring tables policies
CREATE POLICY "Service role can manage monitoring_alerts" ON public.monitoring_alerts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage health_checks" ON public.health_checks
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage metrics_data" ON public.metrics_data
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage system_metrics" ON public.system_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage monitoring_logs" ON public.monitoring_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage monitoring_config" ON public.monitoring_config
    FOR ALL USING (auth.role() = 'service_role');

-- Alerting tables policies
CREATE POLICY "Service role can manage alert_rules" ON public.alert_rules
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage alerts" ON public.alerts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage alert_notifications" ON public.alert_notifications
    FOR ALL USING (auth.role() = 'service_role');

-- Logging tables policies
CREATE POLICY "Service role can manage notification_logs" ON public.notification_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage cleanup_logs" ON public.cleanup_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage sweeper_logs" ON public.sweeper_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage admin_retry_audit_log" ON public.admin_retry_audit_log
    FOR ALL USING (auth.role() = 'service_role');

-- Backup and disaster recovery tables policies
CREATE POLICY "Service role can manage backup_config" ON public.backup_config
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage backup_jobs" ON public.backup_jobs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage restore_jobs" ON public.restore_jobs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage disaster_recovery_plans" ON public.disaster_recovery_plans
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage disaster_recovery_executions" ON public.disaster_recovery_executions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage backup_verifications" ON public.backup_verifications
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage backup_retention" ON public.backup_retention
    FOR ALL USING (auth.role() = 'service_role');

-- Secrets management policy
CREATE POLICY "Service role can manage vault_secrets" ON public.vault_secrets
    FOR ALL USING (auth.role() = 'service_role');

-- Create policies for authenticated users to read certain tables (optional)
-- These allow authenticated users to read monitoring data for dashboards

CREATE POLICY "Authenticated users can read health_checks" ON public.health_checks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read metrics_data" ON public.metrics_data
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read system_metrics" ON public.system_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON TABLE public.content_jobs IS 'Content generation jobs - RLS enabled for security';
COMMENT ON TABLE public.job_runs IS 'Job execution runs - RLS enabled for security';
COMMENT ON TABLE public.monitoring_alerts IS 'System monitoring alerts - RLS enabled for security';
COMMENT ON TABLE public.health_checks IS 'System health check results - RLS enabled for security';
COMMENT ON TABLE public.metrics_data IS 'System performance metrics - RLS enabled for security';
COMMENT ON TABLE public.vault_secrets IS 'Encrypted secrets storage - RLS enabled for security';

-- Verify RLS is enabled on all tables
DO $$
DECLARE
    table_name text;
    rls_enabled boolean;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'content_jobs', 'job_runs', 'idempotency_keys',
            'monitoring_alerts', 'health_checks', 'metrics_data', 'system_metrics', 'monitoring_logs', 'monitoring_config',
            'alert_rules', 'alerts', 'alert_notifications',
            'notification_logs', 'cleanup_logs', 'sweeper_logs', 'admin_retry_audit_log',
            'backup_config', 'backup_jobs', 'restore_jobs', 'disaster_recovery_plans', 'disaster_recovery_executions', 'backup_verifications', 'backup_retention',
            'vault_secrets'
        )
    LOOP
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class
        WHERE relname = table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
        
        IF NOT rls_enabled THEN
            RAISE WARNING 'RLS not enabled on table: %', table_name;
        ELSE
            RAISE NOTICE 'RLS enabled on table: %', table_name;
        END IF;
    END LOOP;
END $$;
