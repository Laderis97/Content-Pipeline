# Administrator Guide

This guide is designed for system administrators who will be managing and maintaining the Content Pipeline system.

## Table of Contents

1. [System Overview](#system-overview)
2. [Administrative Access](#administrative-access)
3. [System Monitoring](#system-monitoring)
4. [User Management](#user-management)
5. [System Configuration](#system-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Emergency Procedures](#emergency-procedures)

## System Overview

The Content Pipeline is a serverless content generation system built on:
- **Supabase**: Database and authentication
- **Edge Functions**: Content processing and automation
- **OpenAI API**: AI content generation
- **WordPress REST API**: Content publishing
- **pg_cron**: Scheduled job processing

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Content       │    │   Supabase      │    │   WordPress     │
│   Manager       │───▶│   Database      │───▶│   REST API      │
│   Interface     │    │   & Functions   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   OpenAI API    │
                       │   (Content Gen) │
                       └─────────────────┘
```

## Administrative Access

### Accessing Admin Functions

1. **Supabase Dashboard**
   - URL: `https://supabase.com/dashboard/project/zjqsfdqhhvhbwqmgdfzn`
   - Login with admin credentials
   - Access to database, functions, and settings

2. **Admin API Endpoints**
   - Health monitoring: `/functions/v1/health`
   - Performance metrics: `/functions/v1/performance-monitor`
   - System monitoring: `/functions/v1/monitoring`
   - Metrics collection: `/functions/v1/metrics`

### Admin Permissions

Your admin account has access to:
- ✅ System configuration and settings
- ✅ User management and permissions
- ✅ Database administration
- ✅ Function deployment and management
- ✅ Monitoring and alerting configuration
- ✅ Backup and recovery operations
- ✅ Performance optimization
- ✅ Security management

## System Monitoring

### Real-time Monitoring Dashboard

#### 1. System Health Overview
- **Database Status**: Connection and performance
- **Edge Functions**: Availability and response times
- **External APIs**: OpenAI and WordPress connectivity
- **Job Processing**: Active jobs and queue status

#### 2. Performance Metrics
- **Response Times**: Average and peak response times
- **Throughput**: Jobs processed per hour
- **Error Rates**: Success/failure ratios
- **Resource Usage**: Memory and CPU utilization

#### 3. Alert Management
- **Active Alerts**: Current system issues
- **Alert History**: Past alerts and resolutions
- **Alert Configuration**: Threshold settings
- **Notification Channels**: Email and Slack alerts

### Monitoring Tools

#### Supabase Dashboard
- Database performance metrics
- Function execution logs
- User activity monitoring
- System resource usage

#### Custom Monitoring Scripts
- `scripts/setup-health-monitoring.ps1`: Health check validation
- `scripts/setup-monitoring-alerting.ps1`: Alert configuration
- `scripts/simple-production-test.ps1`: System testing

## User Management

### User Roles and Permissions

#### Content Manager Role
- Create and manage content jobs
- View job status and progress
- Approve or reject generated content
- Access WordPress integration

#### Administrator Role
- Full system access
- User management
- System configuration
- Monitoring and maintenance

### Managing Users

#### Adding New Users
1. Access Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User"
4. Set appropriate role and permissions
5. Send login credentials securely

#### Modifying User Permissions
1. Select user from user list
2. Edit role and permissions
3. Update database policies if needed
4. Notify user of changes

#### Removing Users
1. Disable user account
2. Revoke all permissions
3. Archive user data if required
4. Update system access lists

## System Configuration

### Environment Variables

#### Required Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL=https://zjqsfdqhhvhbwqmgdfzn.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# WordPress Configuration
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=content-bot
WORDPRESS_PASSWORD=your_app_password

# System Configuration
MAX_CONCURRENT_JOBS=5
JOB_TIMEOUT_MINUTES=30
RETRY_ATTEMPTS=3
```

#### Setting Environment Variables
1. Access Supabase Dashboard
2. Navigate to Settings > Environment Variables
3. Add or modify variables
4. Restart affected functions

### Database Configuration

#### Connection Settings
- **Max Connections**: 100
- **Connection Timeout**: 30 seconds
- **Query Timeout**: 60 seconds
- **Pool Size**: 20 connections

#### Performance Optimization
- **Indexes**: Optimized for common queries
- **Query Caching**: Enabled for frequently accessed data
- **Connection Pooling**: Configured for optimal performance

### Function Configuration

#### Edge Function Settings
- **Timeout**: 30 seconds per function
- **Memory**: 256MB per function
- **Concurrency**: 5 concurrent executions
- **Retry Policy**: 3 attempts with exponential backoff

#### Function Deployment
1. Update function code
2. Test locally if possible
3. Deploy to Supabase
4. Verify deployment success
5. Monitor function performance

## Troubleshooting

### Common System Issues

#### 1. High Error Rates

**Symptoms:**
- Job failure rate > 20%
- Multiple error alerts
- User complaints about failures

**Diagnosis Steps:**
1. Check system health dashboard
2. Review error logs in Supabase
3. Test external API connectivity
4. Check function execution logs

**Solutions:**
- Restart affected functions
- Check API rate limits
- Verify environment variables
- Scale up resources if needed

#### 2. Slow Response Times

**Symptoms:**
- Average response time > 5 seconds
- User complaints about delays
- Timeout errors

**Diagnosis Steps:**
1. Check performance metrics
2. Review database query performance
3. Monitor external API response times
4. Check system resource usage

**Solutions:**
- Optimize database queries
- Increase function memory allocation
- Check for resource bottlenecks
- Implement caching if appropriate

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

**Solutions:**
- Restart database connections
- Adjust connection pool settings
- Check for long-running queries
- Scale database resources

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

**Solutions:**
- Wait for API rate limits to reset
- Check API key validity
- Implement retry logic
- Contact API support if needed

### Diagnostic Tools

#### Health Check Scripts
```powershell
# Run comprehensive health check
.\scripts\setup-health-monitoring.ps1

# Test production system
.\scripts\simple-production-test.ps1

# Validate system components
.\scripts\validate-production-system.ps1
```

#### Database Queries
```sql
-- Check job processing status
SELECT status, COUNT(*) FROM content_jobs GROUP BY status;

-- Monitor system performance
SELECT * FROM metrics_data ORDER BY created_at DESC LIMIT 10;

-- Check for failed jobs
SELECT * FROM content_jobs WHERE status = 'failed' ORDER BY created_at DESC;
```

## Maintenance Procedures

### Daily Maintenance

#### 1. System Health Check
- Review system status dashboard
- Check for active alerts
- Monitor job processing rates
- Verify external API connectivity

#### 2. Performance Review
- Review response time metrics
- Check error rates
- Monitor resource usage
- Identify performance trends

#### 3. Log Review
- Review error logs
- Check for unusual patterns
- Monitor security events
- Archive old logs

### Weekly Maintenance

#### 1. Database Maintenance
- Analyze query performance
- Update database statistics
- Clean up old data
- Review index usage

#### 2. Function Updates
- Review function performance
- Check for available updates
- Test new features
- Deploy improvements

#### 3. Security Review
- Review user access logs
- Check for security alerts
- Update security policies
- Review API key usage

### Monthly Maintenance

#### 1. System Optimization
- Review system performance
- Optimize database queries
- Update monitoring thresholds
- Plan capacity upgrades

#### 2. Backup Verification
- Test backup procedures
- Verify data integrity
- Update backup schedules
- Document recovery procedures

#### 3. Documentation Update
- Update system documentation
- Review operational procedures
- Update contact information
- Plan training sessions

## Emergency Procedures

### System Outage Response

#### 1. Immediate Response (0-15 minutes)
1. Assess the scope of the outage
2. Check system status dashboard
3. Notify stakeholders
4. Begin initial diagnosis

#### 2. Diagnosis and Resolution (15-60 minutes)
1. Identify root cause
2. Implement immediate fixes
3. Monitor system recovery
4. Update stakeholders

#### 3. Post-Outage (1-24 hours)
1. Document incident details
2. Implement preventive measures
3. Review monitoring systems
4. Conduct post-mortem analysis

### Data Recovery Procedures

#### 1. Database Recovery
1. Access Supabase backup system
2. Select appropriate backup point
3. Restore database to backup state
4. Verify data integrity
5. Update application connections

#### 2. Function Recovery
1. Access function deployment history
2. Deploy previous working version
3. Verify function functionality
4. Monitor system stability
5. Update to latest version when stable

### Communication Procedures

#### 1. Internal Communication
- **Immediate**: Notify technical team
- **15 minutes**: Update management
- **30 minutes**: Notify all stakeholders
- **Resolution**: Send status update

#### 2. External Communication
- **User Notification**: System status page
- **Customer Support**: Email notifications
- **Public Communication**: Social media updates

## Security Management

### Access Control

#### 1. User Authentication
- Multi-factor authentication required
- Regular password updates
- Account lockout policies
- Session timeout management

#### 2. API Security
- Secure API key storage
- Regular key rotation
- Rate limiting implementation
- Request validation

#### 3. Data Protection
- Encryption at rest and in transit
- Regular security audits
- Access logging and monitoring
- Data backup encryption

### Security Monitoring

#### 1. Threat Detection
- Monitor for suspicious activity
- Review access logs regularly
- Check for unauthorized access
- Monitor API usage patterns

#### 2. Incident Response
- Document security incidents
- Implement immediate containment
- Notify appropriate authorities
- Conduct security review

## Performance Optimization

### Database Optimization

#### 1. Query Optimization
- Analyze slow queries
- Add appropriate indexes
- Optimize query structure
- Implement query caching

#### 2. Connection Management
- Monitor connection usage
- Optimize connection pooling
- Implement connection timeouts
- Scale connection limits

### Function Optimization

#### 1. Performance Tuning
- Monitor function execution times
- Optimize code efficiency
- Implement caching strategies
- Scale function resources

#### 2. Error Handling
- Implement comprehensive error handling
- Add retry logic
- Improve error messages
- Monitor error rates

## Backup and Recovery

### Backup Procedures

#### 1. Database Backups
- **Frequency**: Daily automated backups
- **Retention**: 30 days
- **Location**: Supabase managed backups
- **Verification**: Weekly restore tests

#### 2. Configuration Backups
- **Frequency**: Weekly
- **Content**: Environment variables, settings
- **Location**: Secure cloud storage
- **Access**: Admin only

### Recovery Testing

#### 1. Monthly Recovery Tests
- Test database restore procedures
- Verify function deployment
- Test configuration restoration
- Document recovery times

#### 2. Disaster Recovery Planning
- Document recovery procedures
- Identify critical dependencies
- Plan alternative systems
- Test recovery scenarios

## Conclusion

This administrator guide provides comprehensive information for managing and maintaining the Content Pipeline system. Regular review and updates of these procedures will ensure optimal system performance and reliability.

For additional support or questions not covered in this guide, please contact the technical support team or refer to the system documentation.
