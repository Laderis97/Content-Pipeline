-- Fix Function Search Path Security Issues
-- This script sets the search_path parameter on all functions to prevent security vulnerabilities
-- Generated on: 2025-09-09T18:38:11.705Z

-- Set search_path for all functions to prevent search path manipulation attacks
ALTER FUNCTION public.get_admin_retry_statistics SET search_path = 'public';
ALTER FUNCTION public.get_job_retry_history SET search_path = 'public';
ALTER FUNCTION public.log_admin_retry_action SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column SET search_path = 'public';
ALTER FUNCTION public.get_job_stats SET search_path = 'public';
ALTER FUNCTION public.validate_job_integrity SET search_path = 'public';
ALTER FUNCTION public.get_job_run_stats SET search_path = 'public';
ALTER FUNCTION public.get_recent_job_runs SET search_path = 'public';
ALTER FUNCTION public.claim_next_job SET search_path = 'public';
ALTER FUNCTION public.release_job SET search_path = 'public';
ALTER FUNCTION public.complete_job SET search_path = 'public';
ALTER FUNCTION public.fail_job SET search_path = 'public';
ALTER FUNCTION public.update_completed_at SET search_path = 'public';
ALTER FUNCTION public.analyze_index_usage SET search_path = 'public';
ALTER FUNCTION public.get_slow_query_candidates SET search_path = 'public';
ALTER FUNCTION public.validate_job_status_consistency SET search_path = 'public';
ALTER FUNCTION public.validate_all_jobs_integrity SET search_path = 'public';
ALTER FUNCTION public.validate_content_jobs_data SET search_path = 'public';
ALTER FUNCTION public.validate_job_runs_data SET search_path = 'public';
ALTER FUNCTION public.update_job_status SET search_path = 'public';
ALTER FUNCTION public.retry_failed_job SET search_path = 'public';
ALTER FUNCTION public.bulk_update_job_status SET search_path = 'public';
ALTER FUNCTION public.get_jobs_by_status SET search_path = 'public';
ALTER FUNCTION public.get_job_status_history SET search_path = 'public';
ALTER FUNCTION public.check_topic_duplicates SET search_path = 'public';
ALTER FUNCTION public.check_wordpress_post_duplicates SET search_path = 'public';
ALTER FUNCTION public.get_duplicate_statistics SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_idempotency_keys SET search_path = 'public';
ALTER FUNCTION public.validate_admin_retry_permissions SET search_path = 'public';
ALTER FUNCTION public.get_manual_retry_count SET search_path = 'public';
ALTER FUNCTION public.get_recent_retry_count SET search_path = 'public';
ALTER FUNCTION public.check_retry_eligibility SET search_path = 'public';
ALTER FUNCTION public.cleanup_old_admin_retry_audit_logs SET search_path = 'public';
ALTER FUNCTION public.cleanup_old_sweeper_logs SET search_path = 'public';
ALTER FUNCTION public.trigger_cleanup_old_sweeper_logs SET search_path = 'public';
ALTER FUNCTION public.get_sweeper_statistics SET search_path = 'public';
ALTER FUNCTION public.get_sweeper_performance_metrics SET search_path = 'public';
ALTER FUNCTION public.cleanup_old_alerts SET search_path = 'public';
ALTER FUNCTION public.trigger_cleanup_old_alerts SET search_path = 'public';
ALTER FUNCTION public.get_sweeper_health_status SET search_path = 'public';
ALTER FUNCTION public.get_sweeper_alerts SET search_path = 'public';
ALTER FUNCTION public.get_active_alerts SET search_path = 'public';
ALTER FUNCTION public.get_alert_statistics SET search_path = 'public';
ALTER FUNCTION public.create_failure_rate_alert SET search_path = 'public';
ALTER FUNCTION public.resolve_alert SET search_path = 'public';
ALTER FUNCTION public.escalate_alert SET search_path = 'public';
ALTER FUNCTION public.get_alert_trends SET search_path = 'public';
ALTER FUNCTION public.get_monitoring_dashboard SET search_path = 'public';
ALTER FUNCTION public.get_notification_delivery_status SET search_path = 'public';
ALTER FUNCTION public.cleanup_old_notification_logs SET search_path = 'public';
ALTER FUNCTION public.trigger_cleanup_old_notification_logs SET search_path = 'public';
ALTER FUNCTION public.get_notification_statistics SET search_path = 'public';
ALTER FUNCTION public.retry_failed_notifications SET search_path = 'public';
ALTER FUNCTION public.get_notification_trends SET search_path = 'public';
ALTER FUNCTION public.get_alert_notification_summary SET search_path = 'public';
ALTER FUNCTION public.get_cleanup_performance_metrics SET search_path = 'public';
ALTER FUNCTION public.cleanup_old_cleanup_logs SET search_path = 'public';
ALTER FUNCTION public.trigger_cleanup_old_cleanup_logs SET search_path = 'public';
ALTER FUNCTION public.get_cleanup_statistics SET search_path = 'public';
ALTER FUNCTION public.get_table_cleanup_statistics SET search_path = 'public';
ALTER FUNCTION public.get_cleanup_recommendations SET search_path = 'public';
ALTER FUNCTION public.schedule_cleanup SET search_path = 'public';
ALTER FUNCTION public.get_current_system_status SET search_path = 'public';
ALTER FUNCTION public.cleanup_old_health_checks SET search_path = 'public';
ALTER FUNCTION public.trigger_cleanup_old_health_checks SET search_path = 'public';
ALTER FUNCTION public.get_health_check_statistics SET search_path = 'public';
ALTER FUNCTION public.get_health_check_trends SET search_path = 'public';
ALTER FUNCTION public.get_health_check_alerts SET search_path = 'public';
ALTER FUNCTION public.get_system_health_metrics SET search_path = 'public';
ALTER FUNCTION public.get_health_check_recommendations SET search_path = 'public';
ALTER FUNCTION public.trigger_cleanup_old_metrics SET search_path = 'public';
ALTER FUNCTION public.get_performance_metrics_summary SET search_path = 'public';
ALTER FUNCTION public.get_system_metrics_summary SET search_path = 'public';
ALTER FUNCTION public.get_metrics_trends SET search_path = 'public';
ALTER FUNCTION public.get_metrics_by_type SET search_path = 'public';
ALTER FUNCTION public.get_metrics_alerts SET search_path = 'public';
ALTER FUNCTION public.get_metrics_dashboard SET search_path = 'public';
ALTER FUNCTION public.cleanup_old_metrics SET search_path = 'public';
ALTER FUNCTION public.update_vault_secrets_updated_at SET search_path = 'public';
ALTER FUNCTION public.upsert_vault_secret SET search_path = 'public';
ALTER FUNCTION public.get_vault_secret SET search_path = 'public';
ALTER FUNCTION public.get_vault_secrets_by_category SET search_path = 'public';
ALTER FUNCTION public.get_required_vault_secrets SET search_path = 'public';
ALTER FUNCTION public.validate_vault_secrets SET search_path = 'public';
ALTER FUNCTION public.get_vault_secrets_status SET search_path = 'public';
ALTER FUNCTION public.audit_vault_secret_access SET search_path = 'public';
ALTER FUNCTION public.rotate_vault_secret SET search_path = 'public';
ALTER FUNCTION public.trigger_content_automation SET search_path = 'public';
ALTER FUNCTION public.trigger_sweeper SET search_path = 'public';
ALTER FUNCTION public.trigger_monitoring SET search_path = 'public';
ALTER FUNCTION public.trigger_metrics_collection SET search_path = 'public';
ALTER FUNCTION public.trigger_health_checks SET search_path = 'public';
ALTER FUNCTION public.trigger_cleanup SET search_path = 'public';
ALTER FUNCTION public.manage_cron_jobs SET search_path = 'public';
ALTER FUNCTION public.get_cron_job_status SET search_path = 'public';
ALTER FUNCTION public.toggle_cron_job SET search_path = 'public';
ALTER FUNCTION public.initialize_scheduler SET search_path = 'public';
ALTER FUNCTION public.update_monitoring_updated_at_column SET search_path = 'public';
ALTER FUNCTION public.get_monitoring_config SET search_path = 'public';
ALTER FUNCTION public.set_monitoring_config SET search_path = 'public';
ALTER FUNCTION public.get_monitoring_active_alerts SET search_path = 'public';
ALTER FUNCTION public.resolve_monitoring_alert SET search_path = 'public';
ALTER FUNCTION public.get_system_health_summary SET search_path = 'public';
ALTER FUNCTION public.get_monitoring_system_metrics_summary SET search_path = 'public';
ALTER FUNCTION public.get_monitoring_alert_statistics SET search_path = 'public';
ALTER FUNCTION public.cleanup_monitoring_data SET search_path = 'public';
ALTER FUNCTION public.get_monitoring_dashboard_data SET search_path = 'public';
ALTER FUNCTION public.update_backup_updated_at_column SET search_path = 'public';
ALTER FUNCTION public.get_backup_config SET search_path = 'public';
ALTER FUNCTION public.set_backup_config SET search_path = 'public';
ALTER FUNCTION public.get_backup_jobs SET search_path = 'public';
ALTER FUNCTION public.get_restore_jobs SET search_path = 'public';
ALTER FUNCTION public.get_disaster_recovery_plans SET search_path = 'public';
ALTER FUNCTION public.get_disaster_recovery_executions SET search_path = 'public';
ALTER FUNCTION public.get_backup_statistics SET search_path = 'public';
ALTER FUNCTION public.get_restore_statistics SET search_path = 'public';
ALTER FUNCTION public.cleanup_backup_data SET search_path = 'public';
ALTER FUNCTION public.get_backup_dashboard SET search_path = 'public';

-- Verify that search_path is set on all functions
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.proconfig as configuration
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'  -- functions only
    AND p.proconfig IS NOT NULL
    AND 'search_path' = ANY(p.proconfig)
ORDER BY p.proname;

-- Count functions with search_path set
SELECT 
    COUNT(*) as functions_with_search_path_set
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.proconfig IS NOT NULL
    AND 'search_path' = ANY(p.proconfig);
