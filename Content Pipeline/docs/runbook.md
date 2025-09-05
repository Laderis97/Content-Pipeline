# Technical Runbook - Content Pipeline Operations

This runbook provides detailed procedures for operating, troubleshooting, and maintaining the Content Pipeline system.

## 🚨 Emergency Procedures

### System Down - All Jobs Failing

**Symptoms:**
- All jobs showing "error" status
- High failure rate alerts (>20%)
- No successful job completions

**Immediate Actions:**
1. Check system health:
   ```bash
   curl -X GET https://your-project.supabase.co/functions/v1/health
   ```

2. Verify database connectivity:
   ```sql
   SELECT COUNT(*) FROM content_jobs WHERE status = 'error';
   ```

3. Check recent error logs:
   ```sql
   SELECT job_id, last_error, retry_count, created_at 
   FROM content_jobs 
   WHERE status = 'error' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

4. If database is accessible, run sweeper to reset stale jobs:
   ```bash
   supabase functions invoke sweeper
   ```

5. Test external API connectivity:
   ```bash
   # Test OpenAI
   supabase functions invoke openai-failure-test
   
   # Test WordPress
   supabase functions invoke wordpress-test
   ```

### High Failure Rate Alert

**Symptoms:**
- Daily failure rate >20%
- Alert notifications received

**Investigation Steps:**
1. Check monitoring dashboard:
   ```bash
   curl -X GET https://your-project.supabase.co/functions/v1/monitoring
   ```

2. Analyze failure patterns:
   ```sql
   SELECT 
     DATE(execution_time) as date,
     status,
     COUNT(*) as count
   FROM job_runs 
   WHERE execution_time >= NOW() - INTERVAL '7 days'
   GROUP BY DATE(execution_time), status
   ORDER BY date DESC;
   ```

3. Identify common error types:
   ```sql
   SELECT 
     last_error,
     COUNT(*) as frequency
   FROM content_jobs 
   WHERE status = 'error' 
   AND created_at >= NOW() - INTERVAL '24 hours'
   GROUP BY last_error
   ORDER BY frequency DESC;
   ```

**Resolution Actions:**
- If OpenAI errors: Check API key validity and rate limits
- If WordPress errors: Verify site accessibility and credentials
- If database errors: Check connection limits and performance
- If timeout errors: Review function performance and optimize

## 🔧 Routine Maintenance

### Daily Health Checks

**Automated Checks:**
- System health monitoring runs every hour
- Failure rate calculation runs daily at midnight
- Alerting triggers if failure rate >20%

**Manual Verification:**
```bash
# Check system status
curl -X GET https://your-project.supabase.co/functions/v1/health

# Review recent job performance
curl -X GET https://your-project.supabase.co/functions/v1/metrics

# Check for stuck jobs
curl -X GET https://your-project.supabase.co/functions/v1/sweeper
```

### Weekly Maintenance

**Job Run Cleanup:**
```sql
-- Check job_runs table size
SELECT COUNT(*) as total_runs, 
       COUNT(*) FILTER (WHERE execution_time < NOW() - INTERVAL '30 days') as old_runs
FROM job_runs;

-- Archive old job runs (if needed)
DELETE FROM job_runs 
WHERE execution_time < NOW() - INTERVAL '90 days';
```

**Performance Review:**
```sql
-- Check average processing times
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_seconds,
  MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) as max_seconds
FROM job_runs 
WHERE status = 'completed' 
AND execution_time >= NOW() - INTERVAL '7 days';
```

### Monthly Maintenance

**Secret Rotation:**
- Review API key expiration dates
- Rotate OpenAI API keys if needed
- Update WordPress app passwords
- Verify all secrets are properly stored in Supabase Vault

**Database Optimization:**
```sql
-- Analyze table statistics
ANALYZE content_jobs;
ANALYZE job_runs;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## 🐛 Troubleshooting Guide

### Common Error Scenarios

#### 1. OpenAI API Errors

**Error: "Insufficient quota"**
```bash
# Check API usage
curl -X GET https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```
**Resolution:** Upgrade OpenAI plan or wait for quota reset

**Error: "Rate limit exceeded"**
**Resolution:** 
- Check rate limiter configuration
- Implement exponential backoff
- Reduce concurrent job processing

**Error: "Invalid API key"**
**Resolution:**
```bash
# Update API key in Supabase Vault
supabase secrets set OPENAI_API_KEY=new_api_key_here
```

#### 2. WordPress Integration Errors

**Error: "Authentication failed"**
```bash
# Test WordPress credentials
supabase functions invoke wordpress-test
```
**Resolution:**
- Verify WordPress username and app password
- Check if app password is still valid
- Ensure content-bot user has proper permissions

**Error: "Site not accessible"**
**Resolution:**
- Check WordPress site status
- Verify URL is correct
- Test REST API endpoint manually

**Error: "Category not found"**
**Resolution:**
- Check if default categories exist in WordPress
- Update category configuration
- Use fallback categories

#### 3. Database Errors

**Error: "Connection limit exceeded"**
**Resolution:**
- Check Supabase connection limits
- Optimize database queries
- Implement connection pooling

**Error: "Deadlock detected"**
**Resolution:**
- Review concurrent job processing logic
- Check FOR UPDATE SKIP LOCKED implementation
- Reduce concurrent job count

**Error: "Timeout on query"**
**Resolution:**
- Add database indexes
- Optimize slow queries
- Increase query timeout limits

#### 4. Job Processing Issues

**Jobs Stuck in "Processing" Status**
```bash
# Reset stale processing jobs
supabase functions invoke sweeper
```
**Resolution:**
- Run sweeper function
- Check for function timeouts
- Review job claiming logic

**Duplicate Content Generation**
**Resolution:**
- Check idempotency key implementation
- Verify duplicate detection logic
- Review job creation process

**Slow Job Processing**
**Resolution:**
- Check function performance metrics
- Optimize database queries
- Review external API response times
- Consider increasing concurrent job limits

### Performance Optimization

#### Database Performance

**Slow Queries:**
```sql
-- Identify slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Index Optimization:**
```sql
-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
AND tablename IN ('content_jobs', 'job_runs')
ORDER BY n_distinct DESC;
```

#### Function Performance

**Response Time Issues:**
```bash
# Check function metrics
curl -X GET https://your-project.supabase.co/functions/v1/performance-monitor
```

**Optimization Strategies:**
- Implement caching for frequently accessed data
- Optimize database queries
- Use connection pooling
- Implement request batching

## 📊 Monitoring & Alerting

### Key Metrics to Monitor

1. **Job Success Rate**: Should be >80%
2. **Average Processing Time**: Should be <2 seconds
3. **Concurrent Job Count**: Should not exceed limits
4. **Database Connection Count**: Monitor for limits
5. **External API Response Times**: OpenAI and WordPress

### Alert Thresholds

- **Critical**: Daily failure rate >20%
- **Warning**: Daily failure rate >10%
- **Info**: Individual job failures (logged)

### Monitoring Queries

**Daily Success Rate:**
```sql
SELECT 
  DATE(execution_time) as date,
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
FROM job_runs
WHERE execution_time >= NOW() - INTERVAL '7 days'
GROUP BY DATE(execution_time)
ORDER BY date DESC;
```

**Performance Trends:**
```sql
SELECT 
  DATE(execution_time) as date,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time
FROM job_runs
WHERE status = 'completed'
AND execution_time >= NOW() - INTERVAL '30 days'
GROUP BY DATE(execution_time)
ORDER BY date DESC;
```

## 🔐 Security Procedures

### Incident Response

**Suspected Security Breach:**
1. Immediately rotate all API keys
2. Review access logs
3. Check for unauthorized job creation
4. Verify all admin actions
5. Update security documentation

**API Key Compromise:**
```bash
# Rotate OpenAI key
supabase secrets set OPENAI_API_KEY=new_secure_key

# Rotate WordPress credentials
supabase secrets set WORDPRESS_APP_PASSWORD=new_app_password

# Verify all functions are using new credentials
supabase functions invoke content-automation --data '{"action": "test_credentials"}'
```

### Access Control

**Admin User Management:**
- Review admin user list regularly
- Implement principle of least privilege
- Monitor admin actions through audit logs
- Use strong authentication for admin operations

## 📋 Operational Checklists

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Database migrations reviewed
- [ ] Environment variables configured
- [ ] Secrets properly stored
- [ ] Monitoring configured
- [ ] Backup procedures tested

### Post-Deployment Checklist

- [ ] Health checks passing
- [ ] First job processed successfully
- [ ] Monitoring alerts configured
- [ ] Performance metrics within limits
- [ ] Documentation updated

### Monthly Review Checklist

- [ ] Review system performance metrics
- [ ] Check security logs
- [ ] Verify backup integrity
- [ ] Update dependencies
- [ ] Review and rotate secrets
- [ ] Update documentation

## 🆘 Escalation Procedures

### Level 1 - System Administrator
- Routine maintenance tasks
- Basic troubleshooting
- Performance monitoring
- Documentation updates

### Level 2 - Senior Developer
- Complex error resolution
- Performance optimization
- Security incident response
- System architecture changes

### Level 3 - Technical Lead
- Critical system failures
- Security breaches
- Major architectural decisions
- Vendor escalation

## 📞 Contact Information

**Emergency Contacts:**
- System Administrator: [Contact Info]
- Senior Developer: [Contact Info]
- Technical Lead: [Contact Info]

**Vendor Support:**
- Supabase Support: [Support Portal]
- OpenAI Support: [Support Portal]
- WordPress Support: [Support Portal]

---

**Last Updated:** [Current Date]
**Version:** 1.0
**Next Review:** [Next Review Date]
