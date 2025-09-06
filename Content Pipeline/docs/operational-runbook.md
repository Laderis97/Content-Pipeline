# Operational Runbook

This runbook provides step-by-step procedures for daily operations, troubleshooting, and emergency response for the Content Pipeline system.

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [System Monitoring](#system-monitoring)
3. [Troubleshooting Procedures](#troubleshooting-procedures)
4. [Emergency Response](#emergency-response)
5. [Maintenance Tasks](#maintenance-tasks)
6. [Contact Information](#contact-information)

## Daily Operations

### Morning Checklist (9:00 AM)

#### 1. System Health Check
```powershell
# Run daily health check
.\scripts\setup-health-monitoring.ps1
```

**Check Items:**
- [ ] All Edge Functions responding
- [ ] Database connectivity normal
- [ ] External APIs accessible
- [ ] No critical alerts active
- [ ] Job processing queue normal

#### 2. Performance Review
- [ ] Review overnight job processing rates
- [ ] Check average response times
- [ ] Verify error rates are < 5%
- [ ] Monitor system resource usage

#### 3. Alert Review
- [ ] Check for any overnight alerts
- [ ] Review alert history
- [ ] Verify alert configurations
- [ ] Update alert thresholds if needed

### Midday Check (1:00 PM)

#### 1. Job Processing Status
```sql
-- Check current job status
SELECT status, COUNT(*) FROM content_jobs 
WHERE created_at >= CURRENT_DATE 
GROUP BY status;
```

#### 2. Performance Metrics
- [ ] Review peak usage times
- [ ] Check for any performance degradation
- [ ] Monitor external API response times
- [ ] Verify system capacity

### Evening Check (5:00 PM)

#### 1. End-of-Day Summary
- [ ] Review daily job statistics
- [ ] Check for any unresolved issues
- [ ] Verify all jobs processed successfully
- [ ] Update daily operations log

#### 2. Preparation for Next Day
- [ ] Review scheduled maintenance
- [ ] Check for planned updates
- [ ] Verify backup schedules
- [ ] Update on-call rotation

## System Monitoring

### Real-time Monitoring

#### 1. System Dashboard
- **URL**: `https://zjqsfdqhhvhbwqmgdfzn.supabase.co/dashboard`
- **Refresh Rate**: Every 5 minutes
- **Key Metrics**: Response time, error rate, throughput

#### 2. Alert Monitoring
- **Email Alerts**: Check every 15 minutes
- **Slack Alerts**: Monitor #content-pipeline-alerts
- **Critical Alerts**: Immediate response required

### Performance Thresholds

| Metric | Warning Threshold | Critical Threshold | Action Required |
|--------|------------------|-------------------|-----------------|
| Response Time | > 3 seconds | > 5 seconds | Investigate performance |
| Error Rate | > 5% | > 10% | Check system health |
| Job Queue | > 20 jobs | > 50 jobs | Scale resources |
| API Errors | > 3/hour | > 10/hour | Check external APIs |

### Monitoring Scripts

#### Health Check Script
```powershell
# Run comprehensive health check
.\scripts\setup-health-monitoring.ps1

# Expected output:
# - All endpoints responding
# - Database accessible
# - Functions operational
# - No critical errors
```

#### Production Test Script
```powershell
# Run production system test
.\scripts\simple-production-test.ps1

# Expected output:
# - Test score > 80%
# - All critical functions working
# - No system errors
```

## Troubleshooting Procedures

### Common Issues and Solutions

#### 1. High Error Rates

**Symptoms:**
- Error rate > 5%
- Multiple failed jobs
- User complaints

**Diagnosis Steps:**
1. Check system health dashboard
2. Review error logs in Supabase
3. Test external API connectivity
4. Check function execution logs

**Resolution Steps:**
1. **Immediate (0-15 minutes):**
   - Check system status
   - Review recent changes
   - Identify affected components

2. **Short-term (15-60 minutes):**
   - Restart affected functions
   - Check API rate limits
   - Verify environment variables
   - Implement temporary fixes

3. **Long-term (1-24 hours):**
   - Root cause analysis
   - Implement permanent fixes
   - Update monitoring thresholds
   - Document lessons learned

#### 2. Slow Response Times

**Symptoms:**
- Average response time > 3 seconds
- Timeout errors
- User complaints about delays

**Diagnosis Steps:**
1. Check performance metrics
2. Review database query performance
3. Monitor external API response times
4. Check system resource usage

**Resolution Steps:**
1. **Database Optimization:**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

2. **Function Optimization:**
   - Review function execution logs
   - Check memory usage
   - Optimize code efficiency
   - Scale function resources

3. **External API Issues:**
   - Check API status pages
   - Verify rate limits
   - Implement retry logic
   - Contact API support if needed

#### 3. Database Connection Issues

**Symptoms:**
- Database connection errors
- Query timeouts
- Data access failures

**Diagnosis Steps:**
1. Check database status in Supabase
2. Review connection pool metrics
3. Test database connectivity
4. Check for connection leaks

**Resolution Steps:**
1. **Immediate Response:**
   - Restart database connections
   - Check connection pool settings
   - Verify database status

2. **Investigation:**
   - Review connection logs
   - Check for long-running queries
   - Analyze connection usage patterns

3. **Resolution:**
   - Adjust connection pool settings
   - Optimize problematic queries
   - Scale database resources if needed

#### 4. External API Failures

**Symptoms:**
- OpenAI API errors
- WordPress connection failures
- Rate limit exceeded errors

**Diagnosis Steps:**
1. Check API status pages
2. Review API usage quotas
3. Test API connectivity
4. Check authentication credentials

**Resolution Steps:**
1. **Rate Limit Issues:**
   - Wait for rate limits to reset
   - Implement exponential backoff
   - Optimize API usage patterns

2. **Authentication Issues:**
   - Verify API keys
   - Check credential validity
   - Update authentication if needed

3. **Service Outages:**
   - Monitor API status pages
   - Implement fallback procedures
   - Contact API support if needed

### Diagnostic Commands

#### Database Diagnostics
```sql
-- Check job processing status
SELECT status, COUNT(*) FROM content_jobs 
WHERE created_at >= CURRENT_DATE 
GROUP BY status;

-- Monitor system performance
SELECT * FROM metrics_data 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for failed jobs
SELECT * FROM content_jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

#### Function Diagnostics
```powershell
# Test individual functions
Invoke-WebRequest -Uri "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/health" -Method GET
Invoke-WebRequest -Uri "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/performance-monitor" -Method GET
Invoke-WebRequest -Uri "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/metrics" -Method GET
```

## Emergency Response

### Critical System Outage

#### Immediate Response (0-15 minutes)
1. **Assess Situation:**
   - Determine scope of outage
   - Check system status dashboard
   - Identify affected components
   - Estimate impact on users

2. **Initial Communication:**
   - Notify technical team
   - Update system status page
   - Send user notifications
   - Escalate to management

3. **Initial Diagnosis:**
   - Check system health dashboard
   - Review recent changes
   - Test basic connectivity
   - Identify potential causes

#### Resolution Phase (15-60 minutes)
1. **Detailed Investigation:**
   - Review system logs
   - Check external dependencies
   - Test individual components
   - Identify root cause

2. **Implement Fixes:**
   - Apply immediate fixes
   - Restart affected services
   - Verify system recovery
   - Monitor system stability

3. **Communication:**
   - Update stakeholders
   - Provide status updates
   - Estimate resolution time
   - Document progress

#### Post-Resolution (1-24 hours)
1. **System Verification:**
   - Run comprehensive tests
   - Monitor system performance
   - Verify all functions working
   - Check data integrity

2. **Documentation:**
   - Document incident details
   - Record resolution steps
   - Identify lessons learned
   - Update procedures

3. **Follow-up:**
   - Conduct post-mortem analysis
   - Implement preventive measures
   - Update monitoring systems
   - Train team on new procedures

### Data Recovery Procedures

#### Database Recovery
1. **Access Backup System:**
   - Login to Supabase Dashboard
   - Navigate to Backups section
   - Select appropriate backup point
   - Verify backup integrity

2. **Restore Database:**
   - Initiate restore process
   - Monitor restore progress
   - Verify data integrity
   - Update application connections

3. **Verification:**
   - Run data integrity checks
   - Test application functionality
   - Verify user access
   - Monitor system performance

#### Function Recovery
1. **Access Deployment History:**
   - Review function versions
   - Identify last working version
   - Check deployment logs
   - Verify function integrity

2. **Deploy Previous Version:**
   - Deploy last working version
   - Verify function functionality
   - Test all endpoints
   - Monitor system stability

3. **Update to Latest:**
   - Test latest version
   - Deploy when stable
   - Verify all functions
   - Monitor performance

## Maintenance Tasks

### Daily Maintenance

#### Morning Tasks (9:00 AM)
- [ ] Run system health check
- [ ] Review overnight alerts
- [ ] Check job processing rates
- [ ] Verify system performance

#### Evening Tasks (5:00 PM)
- [ ] Review daily statistics
- [ ] Check for unresolved issues
- [ ] Update operations log
- [ ] Prepare for next day

### Weekly Maintenance

#### Monday Tasks
- [ ] Review weekend performance
- [ ] Check for any issues
- [ ] Update weekly statistics
- [ ] Plan week's activities

#### Wednesday Tasks
- [ ] Mid-week performance review
- [ ] Check system optimization
- [ ] Review alert thresholds
- [ ] Update documentation

#### Friday Tasks
- [ ] End-of-week summary
- [ ] Review system performance
- [ ] Plan weekend monitoring
- [ ] Update team on status

### Monthly Maintenance

#### First Week
- [ ] Monthly performance review
- [ ] Update monitoring thresholds
- [ ] Review system capacity
- [ ] Plan optimizations

#### Second Week
- [ ] Security review
- [ ] User access audit
- [ ] API key rotation
- [ ] Update security policies

#### Third Week
- [ ] Backup verification
- [ ] Disaster recovery testing
- [ ] Documentation update
- [ ] Training review

#### Fourth Week
- [ ] System optimization
- [ ] Performance tuning
- [ ] Capacity planning
- [ ] Next month planning

## Contact Information

### Internal Contacts

#### Technical Team
- **Primary On-Call**: (555) 123-4567
- **Secondary On-Call**: (555) 123-4568
- **Team Lead**: (555) 123-4569
- **Manager**: (555) 123-4570

#### Support Channels
- **Email**: support@contentpipeline.com
- **Slack**: #content-pipeline-support
- **Emergency**: (555) 911-HELP
- **Status Page**: https://status.contentpipeline.com

### External Contacts

#### Supabase Support
- **Email**: support@supabase.com
- **Documentation**: https://supabase.com/docs
- **Status**: https://status.supabase.com

#### OpenAI Support
- **Email**: support@openai.com
- **Documentation**: https://platform.openai.com/docs
- **Status**: https://status.openai.com

#### WordPress Support
- **Documentation**: https://developer.wordpress.org/rest-api/
- **Support**: https://wordpress.org/support/

### Escalation Procedures

#### Level 1: Technical Team
- Initial response
- Basic troubleshooting
- User communication
- Issue documentation

#### Level 2: Team Lead
- Complex issues
- System optimization
- Resource allocation
- Vendor coordination

#### Level 3: Management
- Critical outages
- Business impact
- Resource decisions
- External communication

#### Level 4: Executive
- Major incidents
- Business continuity
- Strategic decisions
- Public communication

## Emergency Procedures

### System Outage Response

#### Immediate Response (0-15 minutes)
1. **Assess Impact:**
   - Determine affected users
   - Estimate business impact
   - Identify critical functions
   - Set communication priorities

2. **Initial Actions:**
   - Notify technical team
   - Update status page
   - Send user notifications
   - Begin diagnosis

3. **Communication:**
   - Internal: Slack/Email alerts
   - External: Status page updates
   - Users: Email notifications
   - Management: Phone calls

#### Resolution Phase (15-60 minutes)
1. **Investigation:**
   - Review system logs
   - Check external dependencies
   - Test individual components
   - Identify root cause

2. **Fixes:**
   - Apply immediate fixes
   - Restart services
   - Verify recovery
   - Monitor stability

3. **Updates:**
   - Regular status updates
   - Progress reports
   - Time estimates
   - Resolution updates

#### Post-Resolution (1-24 hours)
1. **Verification:**
   - Comprehensive testing
   - Performance monitoring
   - User verification
   - Data integrity checks

2. **Documentation:**
   - Incident report
   - Resolution steps
   - Lessons learned
   - Process improvements

3. **Follow-up:**
   - Post-mortem analysis
   - Preventive measures
   - Team training
   - Procedure updates

### Communication Templates

#### User Notification (Outage)
```
Subject: Content Pipeline System Outage

We are currently experiencing technical difficulties with the Content Pipeline system. Our team is working to resolve the issue as quickly as possible.

Impact: [Describe impact]
Estimated Resolution: [Time estimate]
Updates: [Status page URL]

We apologize for any inconvenience and will provide updates as they become available.

Content Pipeline Team
```

#### Status Update (Resolution)
```
Subject: Content Pipeline System Restored

The Content Pipeline system has been restored and is now fully operational. All services are running normally.

Resolution Time: [Actual time]
Root Cause: [Brief description]
Preventive Measures: [Actions taken]

Thank you for your patience during this outage.

Content Pipeline Team
```

## Conclusion

This operational runbook provides comprehensive procedures for managing the Content Pipeline system. Regular review and updates of these procedures will ensure effective system operations and rapid response to issues.

For questions or updates to this runbook, please contact the technical team or refer to the system documentation.
