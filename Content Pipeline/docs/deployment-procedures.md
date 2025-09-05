# Deployment & Rollback Procedures

This document provides comprehensive procedures for deploying and rolling back the Content Pipeline system, including environment management, deployment strategies, and rollback procedures.

## 🚀 Deployment Overview

The Content Pipeline uses a serverless architecture with Supabase Edge Functions, requiring careful deployment procedures to ensure zero-downtime updates and reliable rollback capabilities.

### Deployment Environments

- **Development**: Local development and testing
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

### Deployment Components

1. **Database Migrations**: Schema changes and data updates
2. **Edge Functions**: Serverless function deployments
3. **Configuration**: Environment variables and secrets
4. **Monitoring**: Alerting and monitoring setup
5. **Documentation**: Updated documentation and procedures

## 📋 Pre-Deployment Checklist

### 1. Code Review & Testing

**Code Quality Checks:**
- [ ] All code reviewed and approved
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Security scan completed
- [ ] Performance tests completed
- [ ] Documentation updated

**Testing Requirements:**
```bash
# Run test suite
npm test

# Run integration tests
npm run test:integration

# Run security scan
npm audit

# Run performance tests
npm run test:performance
```

### 2. Environment Preparation

**Environment Validation:**
- [ ] Target environment accessible
- [ ] Database connection verified
- [ ] External API access confirmed
- [ ] Secrets properly configured
- [ ] Monitoring systems operational

**Environment Verification:**
```bash
# Check environment connectivity
supabase status

# Verify database connection
supabase db ping

# Test external API access
curl -X GET https://your-project.supabase.co/functions/v1/health
```

### 3. Backup & Safety Measures

**Pre-Deployment Backup:**
- [ ] Database backup created
- [ ] Current configuration backed up
- [ ] Secrets backup verified
- [ ] Rollback plan prepared
- [ ] Team notified of deployment

**Backup Commands:**
```bash
# Create database backup
supabase db dump --file backup-$(date +%Y%m%d-%H%M%S).sql

# Backup current configuration
cp supabase/config.toml supabase/config.toml.backup

# Backup secrets (document current values)
supabase secrets list > secrets-backup-$(date +%Y%m%d-%H%M%S).txt
```

## 🔄 Deployment Procedures

### 1. Database Migration Deployment

#### Pre-Migration Checks

**Migration Validation:**
```bash
# Check migration status
supabase migration list

# Validate migration files
supabase db lint

# Check for migration conflicts
supabase db diff
```

#### Migration Deployment

**Current Status**: Migrations 001-005 have been successfully applied ✅

**Step 1: Review Migrations**
```bash
# List pending migrations
supabase migration list --status pending

# Review migration content
cat supabase/migrations/019_new_migration.sql
```

**Applied Migrations:**
- ✅ 001: Content jobs table created
- ✅ 002: Job runs table created  
- ✅ 003: Job claiming RPC functions created
- ✅ 004: Performance indexes added
- ✅ 005: Status update functions created

**Step 2: Apply Migrations**
```bash
# Apply migrations to staging first
supabase db push --environment staging

# Verify migration success
supabase db status

# Test migration results
supabase db test
```

**Step 3: Production Migration**
```bash
# Apply migrations to production
supabase db push --environment production

# Verify production migration
supabase db status --environment production

# Run post-migration tests
supabase db test --environment production
```

#### Post-Migration Verification

**Database Health Check:**
```sql
-- Verify table structure
\d content_jobs
\d job_runs

-- Check data integrity
SELECT COUNT(*) FROM content_jobs;
SELECT COUNT(*) FROM job_runs;

-- Verify indexes
\di
```

### 2. Edge Function Deployment

#### Function Deployment Process

**Step 1: Build Functions**
```bash
# Build all functions
npm run build

# Verify build success
ls -la supabase/functions/*/index.js
```

**Step 2: Deploy to Staging**
```bash
# Deploy to staging environment
supabase functions deploy --environment staging

# Verify deployment
supabase functions list --environment staging
```

**Step 3: Test Staging Deployment**
```bash
# Test each function
curl -X GET https://staging-project.supabase.co/functions/v1/health
curl -X GET https://staging-project.supabase.co/functions/v1/metrics
curl -X POST https://staging-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer STAGING_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Test deployment"}'
```

**Step 4: Production Deployment**
```bash
# Deploy to production
supabase functions deploy --environment production

# Verify production deployment
supabase functions list --environment production
```

#### Function-Specific Deployment

**Deploy Individual Functions:**
```bash
# Deploy specific function
supabase functions deploy content-automation --environment production

# Deploy multiple functions
supabase functions deploy content-automation scheduler monitoring --environment production
```

**Verify Function Deployment:**
```bash
# Check function status
curl -X GET https://your-project.supabase.co/functions/v1/health

# Test function functionality
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "test_deployment"}'
```

### 3. Configuration Deployment

#### Environment Variables

**Update Environment Variables:**
```bash
# Set new environment variables
supabase secrets set NEW_CONFIG_VALUE=value --environment production

# Verify configuration
supabase secrets list --environment production
```

**Configuration Validation:**
```bash
# Test configuration
curl -X GET https://your-project.supabase.co/functions/v1/config-manager \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

#### Secrets Management

**Deploy New Secrets:**
```bash
# Update API keys
supabase secrets set OPENAI_API_KEY=new_key --environment production

# Update WordPress credentials
supabase secrets set WORDPRESS_APP_PASSWORD=new_password --environment production

# Verify secrets
supabase secrets list --environment production
```

### 4. Monitoring Deployment

#### Monitoring Setup

**Deploy Monitoring Configuration:**
```bash
# Update monitoring thresholds
curl -X POST https://your-project.supabase.co/functions/v1/monitoring \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_alert_thresholds",
    "thresholds": {
      "failure_rate_warning": 10,
      "failure_rate_critical": 20
    }
  }'
```

**Verify Monitoring:**
```bash
# Check monitoring status
curl -X GET https://your-project.supabase.co/functions/v1/monitoring \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Test alerting
curl -X POST https://your-project.supabase.co/functions/v1/alerting-test \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "test_alert"}'
```

## 🔄 Rollback Procedures

### 1. Rollback Decision Matrix

#### When to Rollback

**Immediate Rollback Required:**
- System completely down
- Data corruption detected
- Security vulnerability exposed
- Critical functionality broken
- Performance severely degraded

**Consider Rollback:**
- High error rates (>20%)
- Performance issues
- Minor functionality issues
- User complaints
- Monitoring alerts

#### Rollback Decision Process

1. **Assess Impact**: Determine severity and scope
2. **Notify Team**: Alert relevant stakeholders
3. **Document Issue**: Record problem details
4. **Execute Rollback**: Follow rollback procedures
5. **Verify Recovery**: Confirm system stability
6. **Post-Incident Review**: Analyze and document lessons

### 2. Database Rollback

#### Migration Rollback

**Step 1: Identify Rollback Target**
```bash
# Check migration history
supabase migration list

# Identify target migration
supabase migration list --status applied
```

**Step 2: Create Rollback Migration**
```bash
# Generate rollback migration
supabase db diff --file rollback-$(date +%Y%m%d-%H%M%S).sql

# Review rollback migration
cat supabase/migrations/rollback-*.sql
```

**Step 3: Execute Rollback**
```bash
# Apply rollback migration
supabase db push --file supabase/migrations/rollback-*.sql

# Verify rollback success
supabase db status
```

#### Data Rollback

**Restore from Backup:**
```bash
# Restore database from backup
supabase db reset --file backup-20240115-103000.sql

# Verify data restoration
supabase db test
```

### 3. Function Rollback

#### Function Version Rollback

**Step 1: Identify Previous Version**
```bash
# Check function deployment history
supabase functions list --environment production

# Identify previous version
git log --oneline supabase/functions/content-automation/
```

**Step 2: Deploy Previous Version**
```bash
# Checkout previous version
git checkout previous-commit-hash

# Deploy previous version
supabase functions deploy content-automation --environment production

# Verify rollback
curl -X GET https://your-project.supabase.co/functions/v1/health
```

#### Function Configuration Rollback

**Rollback Configuration:**
```bash
# Restore previous configuration
supabase secrets set CONFIG_VALUE=previous_value --environment production

# Verify configuration rollback
supabase secrets list --environment production
```

### 4. Complete System Rollback

#### Full System Rollback

**Step 1: Stop Processing**
```bash
# Pause scheduler
curl -X POST https://your-project.supabase.co/functions/v1/scheduler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "pause_scheduler"}'
```

**Step 2: Rollback Components**
```bash
# Rollback functions
git checkout previous-commit-hash
supabase functions deploy --environment production

# Rollback database
supabase db reset --file backup-*.sql

# Rollback configuration
supabase secrets set --file secrets-backup-*.txt
```

**Step 3: Verify Rollback**
```bash
# Check system health
curl -X GET https://your-project.supabase.co/functions/v1/health

# Test functionality
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "test_rollback"}'
```

**Step 4: Resume Processing**
```bash
# Resume scheduler
curl -X POST https://your-project.supabase.co/functions/v1/scheduler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "resume_scheduler"}'
```

## 🚨 Emergency Procedures

### 1. Emergency Rollback

#### Critical System Failure

**Immediate Actions:**
1. **Stop All Processing**
   ```bash
   # Pause scheduler immediately
   curl -X POST https://your-project.supabase.co/functions/v1/scheduler \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"action": "pause_scheduler"}'
   ```

2. **Notify Team**
   ```bash
   # Send emergency notification
   curl -X POST https://your-project.supabase.co/functions/v1/alerting-test \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"action": "emergency_alert", "message": "Critical system failure - initiating rollback"}'
   ```

3. **Execute Emergency Rollback**
   ```bash
   # Restore from latest backup
   supabase db reset --file backup-$(date +%Y%m%d)*.sql
   
   # Deploy last known good version
   git checkout last-known-good-commit
   supabase functions deploy --environment production
   ```

### 2. Data Recovery

#### Data Corruption Recovery

**Step 1: Assess Data Damage**
```sql
-- Check for data corruption
SELECT COUNT(*) FROM content_jobs WHERE status IS NULL;
SELECT COUNT(*) FROM job_runs WHERE execution_time IS NULL;

-- Check data integrity
SELECT COUNT(*) FROM content_jobs c 
LEFT JOIN job_runs j ON c.id = j.job_id 
WHERE j.job_id IS NULL;
```

**Step 2: Restore Data**
```bash
# Restore from backup
supabase db reset --file backup-*.sql

# Verify data restoration
supabase db test
```

### 3. Security Incident Response

#### Security Breach Rollback

**Immediate Actions:**
1. **Rotate All Secrets**
   ```bash
   # Rotate API keys immediately
   supabase secrets set OPENAI_API_KEY=new_emergency_key
   supabase secrets set WORDPRESS_APP_PASSWORD=new_emergency_password
   ```

2. **Audit System Access**
   ```sql
   -- Check for suspicious activity
   SELECT * FROM admin_retry_audit_log 
   WHERE created_at >= NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

3. **Rollback to Secure Version**
   ```bash
   # Deploy last known secure version
   git checkout secure-commit-hash
   supabase functions deploy --environment production
   ```

## 📊 Deployment Monitoring

### 1. Deployment Health Checks

#### Post-Deployment Verification

**System Health Check:**
```bash
# Check overall system health
curl -X GET https://your-project.supabase.co/functions/v1/health

# Verify all components
curl -X GET https://your-project.supabase.co/functions/v1/monitoring
```

**Function-Specific Checks:**
```bash
# Test content automation
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "test_deployment"}'

# Test scheduler
curl -X GET https://your-project.supabase.co/functions/v1/scheduler

# Test monitoring
curl -X GET https://your-project.supabase.co/functions/v1/metrics
```

### 2. Performance Monitoring

#### Deployment Performance Metrics

**Monitor Key Metrics:**
```sql
-- Check deployment impact on performance
SELECT 
  DATE(execution_time) as date,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_response_time,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'error') as failed_jobs
FROM job_runs
WHERE execution_time >= NOW() - INTERVAL '24 hours'
GROUP BY DATE(execution_time)
ORDER BY date DESC;
```

**Performance Thresholds:**
- **Response Time**: Should not increase by >50%
- **Error Rate**: Should not exceed 10%
- **Throughput**: Should maintain or improve

### 3. Rollback Monitoring

#### Rollback Success Verification

**Verify Rollback Success:**
```bash
# Check system health after rollback
curl -X GET https://your-project.supabase.co/functions/v1/health

# Monitor error rates
curl -X GET https://your-project.supabase.co/functions/v1/monitoring

# Test functionality
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "test_rollback_success"}'
```

## 📋 Deployment Checklists

### 1. Pre-Deployment Checklist

- [ ] Code review completed and approved
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Performance tests completed
- [ ] Documentation updated
- [ ] Environment prepared
- [ ] Backup created
- [ ] Team notified
- [ ] Rollback plan prepared
- [ ] Monitoring configured

### 2. Deployment Checklist

- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Configuration updated
- [ ] Secrets updated
- [ ] Monitoring configured
- [ ] Health checks passing
- [ ] Function tests passing
- [ ] Performance verified
- [ ] Team notified of success
- [ ] Documentation updated

### 3. Post-Deployment Checklist

- [ ] System health verified
- [ ] Performance metrics checked
- [ ] Error rates monitored
- [ ] User feedback collected
- [ ] Monitoring alerts configured
- [ ] Team notified of completion
- [ ] Deployment documented
- [ ] Lessons learned recorded

### 4. Rollback Checklist

- [ ] Issue severity assessed
- [ ] Team notified
- [ ] Rollback decision made
- [ ] Processing paused
- [ ] Components rolled back
- [ ] System health verified
- [ ] Functionality tested
- [ ] Processing resumed
- [ ] Incident documented
- [ ] Post-incident review scheduled

## 🔧 Deployment Tools

### 1. Automated Deployment Scripts

**Deployment Script:**
```bash
#!/bin/bash
# deploy.sh - Automated deployment script

set -e

echo "Starting deployment process..."

# Pre-deployment checks
echo "Running pre-deployment checks..."
npm test
npm run test:integration

# Create backup
echo "Creating backup..."
supabase db dump --file backup-$(date +%Y%m%d-%H%M%S).sql

# Deploy database migrations
echo "Deploying database migrations..."
supabase db push

# Deploy functions
echo "Deploying Edge Functions..."
supabase functions deploy

# Verify deployment
echo "Verifying deployment..."
curl -X GET https://your-project.supabase.co/functions/v1/health

echo "Deployment completed successfully!"
```

**Rollback Script:**
```bash
#!/bin/bash
# rollback.sh - Automated rollback script

set -e

echo "Starting rollback process..."

# Pause processing
echo "Pausing scheduler..."
curl -X POST https://your-project.supabase.co/functions/v1/scheduler \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "pause_scheduler"}'

# Rollback functions
echo "Rolling back functions..."
git checkout $PREVIOUS_COMMIT
supabase functions deploy

# Rollback database
echo "Rolling back database..."
supabase db reset --file $BACKUP_FILE

# Verify rollback
echo "Verifying rollback..."
curl -X GET https://your-project.supabase.co/functions/v1/health

# Resume processing
echo "Resuming scheduler..."
curl -X POST https://your-project.supabase.co/functions/v1/scheduler \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "resume_scheduler"}'

echo "Rollback completed successfully!"
```

### 2. CI/CD Integration

**GitHub Actions Workflow:**
```yaml
name: Deploy Content Pipeline

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Run tests
        run: npm test
        
      - name: Deploy to Supabase
        run: |
          supabase functions deploy
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## 📚 Best Practices

### 1. Deployment Best Practices

- **Always test in staging first**
- **Use feature flags for gradual rollouts**
- **Monitor closely after deployment**
- **Have rollback plan ready**
- **Document all deployments**
- **Use automated deployment scripts**
- **Implement blue-green deployments when possible**

### 2. Rollback Best Practices

- **Act quickly on critical issues**
- **Communicate clearly with team**
- **Document rollback reasons**
- **Learn from rollback incidents**
- **Improve deployment processes**
- **Test rollback procedures regularly**

### 3. Monitoring Best Practices

- **Set up comprehensive monitoring**
- **Use multiple monitoring layers**
- **Implement alerting for critical metrics**
- **Regular monitoring review**
- **Automate monitoring where possible**

---

**Last Updated:** [Current Date]
**Version:** 1.0
**Next Review:** [Next Review Date]
**Approved By:** [System Administrator]
