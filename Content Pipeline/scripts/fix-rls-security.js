const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fixRLSSecurity() {
  log('\n🔒 Supabase RLS Security Fix', 'bold');
  log('=' .repeat(50), 'blue');
  
  // Supabase configuration
  const supabaseUrl = 'https://zjqsfdqhhvhbwqmgdfzn.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.khzNhQMIVUKjBQiI';
  
  log(`\n📋 Supabase Configuration:`, 'bold');
  log(`   URL: ${supabaseUrl}`, 'blue');
  log(`   Project: zjqsfdqhhvhbwqmgdfzn`, 'blue');
  
  // Tables that need RLS enabled
  const tables = [
    'admin_retry_audit_log',
    'sweeper_logs',
    'monitoring_alerts',
    'job_runs',
    'content_jobs',
    'health_checks',
    'idempotency_keys',
    'notification_logs',
    'cleanup_logs',
    'metrics_data',
    'vault_secrets',
    'monitoring_config',
    'alert_rules',
    'alerts',
    'system_metrics',
    'alert_notifications',
    'monitoring_logs',
    'backup_config',
    'backup_jobs',
    'restore_jobs',
    'disaster_recovery_plans',
    'disaster_recovery_executions',
    'backup_verifications',
    'backup_retention'
  ];
  
  log(`\n🎯 Tables to fix: ${tables.length}`, 'yellow');
  
  // SQL commands to enable RLS
  const rlsCommands = tables.map(table => 
    `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`
  ).join('\n');
  
  const policyCommands = tables.map(table => 
    `CREATE POLICY "Service role can manage ${table}" ON public.${table} FOR ALL USING (auth.role() = 'service_role');`
  ).join('\n');
  
  const fullSQL = `
-- Enable RLS on all tables
${rlsCommands}

-- Create service role policies
${policyCommands}

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (${tables.map(t => `'${t}'`).join(', ')})
ORDER BY tablename;
  `;
  
  log('\n📝 SQL Commands Generated:', 'bold');
  log('   ✅ RLS Enable Commands', 'green');
  log('   ✅ Service Role Policies', 'green');
  log('   ✅ Verification Query', 'green');
  
  log('\n🔧 How to Apply the Fix:', 'bold');
  log('1. Go to your Supabase Dashboard', 'yellow');
  log('2. Navigate to: SQL Editor', 'yellow');
  log('3. Create a new query', 'yellow');
  log('4. Copy and paste the SQL below', 'yellow');
  log('5. Run the query', 'yellow');
  
  log('\n📋 SQL to Execute:', 'bold');
  log('─'.repeat(60), 'blue');
  log(fullSQL, 'cyan');
  log('─'.repeat(60), 'blue');
  
  log('\n🌐 Supabase Dashboard Links:', 'bold');
  log(`   SQL Editor: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql`, 'blue');
  log(`   Database: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/database`, 'blue');
  log(`   Linter: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/database/linter`, 'blue');
  
  log('\n✅ After running the SQL:', 'bold');
  log('   • All tables will have RLS enabled', 'green');
  log('   • Service role will have full access', 'green');
  log('   • Security vulnerabilities will be fixed', 'green');
  log('   • Database linter errors will be resolved', 'green');
  
  log('\n🎉 RLS Security Fix Ready!', 'green');
  log('Copy the SQL above and run it in your Supabase SQL Editor.', 'cyan');
}

// Run the RLS fix
fixRLSSecurity().catch(console.error);
