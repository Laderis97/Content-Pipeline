#!/usr/bin/env node

/**
 * Fix Function Search Path Security Issues
 * 
 * This script generates SQL commands to fix the "Function Search Path Mutable" 
 * security warnings by setting the search_path parameter on all functions.
 */

const fs = require('fs');
const path = require('path');

// List of functions that need search_path fixed (from the linter output)
const functionsToFix = [
  'get_admin_retry_statistics',
  'get_job_retry_history',
  'log_admin_retry_action',
  'update_updated_at_column',
  'get_job_stats',
  'validate_job_integrity',
  'get_job_run_stats',
  'get_recent_job_runs',
  'claim_next_job',
  'release_job',
  'complete_job',
  'fail_job',
  'update_completed_at',
  'analyze_index_usage',
  'get_slow_query_candidates',
  'validate_job_status_consistency',
  'validate_all_jobs_integrity',
  'validate_content_jobs_data',
  'validate_job_runs_data',
  'update_job_status',
  'retry_failed_job',
  'bulk_update_job_status',
  'get_jobs_by_status',
  'get_job_status_history',
  'check_topic_duplicates',
  'check_wordpress_post_duplicates',
  'get_duplicate_statistics',
  'cleanup_expired_idempotency_keys',
  'validate_admin_retry_permissions',
  'get_manual_retry_count',
  'get_recent_retry_count',
  'check_retry_eligibility',
  'cleanup_old_admin_retry_audit_logs',
  'cleanup_old_sweeper_logs',
  'trigger_cleanup_old_sweeper_logs',
  'get_sweeper_statistics',
  'get_sweeper_performance_metrics',
  'cleanup_old_alerts',
  'trigger_cleanup_old_alerts',
  'get_sweeper_health_status',
  'get_sweeper_alerts',
  'get_active_alerts',
  'get_alert_statistics',
  'create_failure_rate_alert',
  'resolve_alert',
  'escalate_alert',
  'get_alert_trends',
  'get_monitoring_dashboard',
  'get_notification_delivery_status',
  'cleanup_old_notification_logs',
  'trigger_cleanup_old_notification_logs',
  'get_notification_statistics',
  'retry_failed_notifications',
  'get_notification_trends',
  'get_alert_notification_summary',
  'get_cleanup_performance_metrics',
  'cleanup_old_cleanup_logs',
  'trigger_cleanup_old_cleanup_logs',
  'get_cleanup_statistics',
  'get_table_cleanup_statistics',
  'get_cleanup_recommendations',
  'schedule_cleanup',
  'get_current_system_status',
  'cleanup_old_health_checks',
  'trigger_cleanup_old_health_checks',
  'get_health_check_statistics',
  'get_health_check_trends',
  'get_health_check_alerts',
  'get_system_health_metrics',
  'get_health_check_recommendations',
  'trigger_cleanup_old_metrics',
  'get_performance_metrics_summary',
  'get_system_metrics_summary',
  'get_metrics_trends',
  'get_metrics_by_type',
  'get_metrics_alerts',
  'get_metrics_dashboard',
  'cleanup_old_metrics',
  'update_vault_secrets_updated_at',
  'upsert_vault_secret',
  'get_vault_secret',
  'get_vault_secrets_by_category',
  'get_required_vault_secrets',
  'validate_vault_secrets',
  'get_vault_secrets_status',
  'audit_vault_secret_access',
  'rotate_vault_secret',
  'trigger_content_automation',
  'trigger_sweeper',
  'trigger_monitoring',
  'trigger_metrics_collection',
  'trigger_health_checks',
  'trigger_cleanup',
  'manage_cron_jobs',
  'get_cron_job_status',
  'toggle_cron_job',
  'initialize_scheduler',
  'update_monitoring_updated_at_column',
  'get_monitoring_config',
  'set_monitoring_config',
  'get_monitoring_active_alerts',
  'resolve_monitoring_alert',
  'get_system_health_summary',
  'get_monitoring_system_metrics_summary',
  'get_monitoring_alert_statistics',
  'cleanup_monitoring_data',
  'get_monitoring_dashboard_data',
  'update_backup_updated_at_column',
  'get_backup_config',
  'set_backup_config',
  'get_backup_jobs',
  'get_restore_jobs',
  'get_disaster_recovery_plans',
  'get_disaster_recovery_executions',
  'get_backup_statistics',
  'get_restore_statistics',
  'cleanup_backup_data',
  'get_backup_dashboard'
];

function generateFunctionSearchPathFix() {
  console.log('🔧 Generating Function Search Path Security Fix...\n');
  
  let sql = `-- Fix Function Search Path Security Issues
-- This script sets the search_path parameter on all functions to prevent security vulnerabilities
-- Generated on: ${new Date().toISOString()}

-- Set search_path for all functions to prevent search path manipulation attacks
`;

  // Generate ALTER FUNCTION statements for each function
  functionsToFix.forEach(funcName => {
    sql += `ALTER FUNCTION public.${funcName} SET search_path = 'public';\n`;
  });

  sql += `
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
`;

  return sql;
}

function main() {
  try {
    const sql = generateFunctionSearchPathFix();
    
    // Write to file
    const outputPath = path.join(__dirname, '..', 'supabase', 'fix-function-search-path.sql');
    fs.writeFileSync(outputPath, sql);
    
    console.log('✅ Function Search Path Fix Generated Successfully!');
    console.log(`📁 File: ${outputPath}`);
    console.log(`📊 Functions to fix: ${functionsToFix.length}`);
    console.log('\n📋 Next Steps:');
    console.log('1. Copy the SQL from the generated file');
    console.log('2. Paste it into the Supabase SQL Editor');
    console.log('3. Execute the SQL to fix all function search path issues');
    console.log('4. Re-run the database linter to verify fixes');
    
    console.log('\n🔍 Generated SQL Preview:');
    console.log('─'.repeat(60));
    console.log(sql.substring(0, 500) + '...');
    console.log('─'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error generating function search path fix:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateFunctionSearchPathFix, functionsToFix };
