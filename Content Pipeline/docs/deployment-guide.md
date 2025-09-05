# Content Pipeline Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Content Pipeline system across different environments (development, staging, and production).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deployment Scripts](#deployment-scripts)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Environment-Specific Deployment](#environment-specific-deployment)
6. [Rollback Procedures](#rollback-procedures)
7. [Health Checks](#health-checks)
8. [Monitoring and Alerting](#monitoring-and-alerting)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Prerequisites

### System Requirements

- **Node.js**: Version 18 or later
- **npm**: Latest version
- **Deno**: Version 1.40.0 or later
- **Supabase CLI**: Latest version
- **Git**: Latest version
- **curl**: For API testing
- **jq**: For JSON processing (optional)

### Required Accounts and Services

- **Supabase Account**: With project created
- **OpenAI Account**: With API key
- **WordPress Site**: With admin access
- **GitHub Account**: For CI/CD (optional)

### Environment Variables

```bash
# Supabase Configuration
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_URL=https://your-project.supabase.co

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# WordPress Configuration
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=content-bot
WORDPRESS_PASSWORD=your-wordpress-password

# Environment
ENVIRONMENT=development
```

## Environment Setup

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd content-pipeline

# Run initial setup
make setup
# or
./scripts/setup.sh
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env .env.local

# Edit with your values
nano .env.local
```

### 3. Supabase Project Setup

```bash
# Link to your Supabase project
supabase link --project-ref $SUPABASE_PROJECT_ID

# Start local development
supabase start

# Apply migrations
supabase db push
```

## Deployment Scripts

### 1. Main Deployment Script

The `scripts/deploy.sh` script handles the complete deployment process:

```bash
# Deploy to development
./scripts/deploy.sh --environment development

# Deploy to staging
./scripts/deploy.sh --environment staging

# Deploy to production
./scripts/deploy.sh --environment production

# Dry run (no actual changes)
./scripts/deploy.sh --dry-run

# Skip specific components
./scripts/deploy.sh --skip-tests --skip-migrations
```

### 2. Rollback Script

The `scripts/rollback.sh` script handles rollback procedures:

```bash
# Interactive rollback
./scripts/rollback.sh

# Rollback to specific backup
./scripts/rollback.sh --backup-dir backups/20240101_120000

# Force rollback without confirmation
./scripts/rollback.sh --force
```

### 3. Health Check Script

The `scripts/health-check.sh` script monitors system health:

```bash
# Full health check
./scripts/health-check.sh

# Check specific components
./scripts/health-check.sh --type functions
./scripts/health-check.sh --type scheduler

# Generate health report
./scripts/health-check.sh --report
```

### 4. Setup Script

The `scripts/setup.sh` script handles initial project setup:

```bash
# Full setup
./scripts/setup.sh

# Skip specific components
./scripts/setup.sh --skip-deps --skip-supabase
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow

The `.github/workflows/deploy.yml` file defines the CI/CD pipeline:

```yaml
# Triggers
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'development'
        type: choice
        options:
          - development
          - staging
          - production
```

### 2. Pipeline Stages

1. **Validate and Test**: Code validation and testing
2. **Deploy to Development**: Automatic deployment on develop branch
3. **Deploy to Staging**: Automatic deployment on main branch
4. **Deploy to Production**: Manual deployment via workflow_dispatch
5. **Rollback**: Manual rollback capability

### 3. Required Secrets

Configure these secrets in your GitHub repository:

```
SUPABASE_PROJECT_ID_DEV
SUPABASE_SERVICE_ROLE_KEY_DEV
SUPABASE_PROJECT_ID_STAGING
SUPABASE_SERVICE_ROLE_KEY_STAGING
SUPABASE_PROJECT_ID_PROD
SUPABASE_SERVICE_ROLE_KEY_PROD
OPENAI_API_KEY
WORDPRESS_URL_DEV
WORDPRESS_URL_STAGING
WORDPRESS_URL_PROD
WORDPRESS_USERNAME
WORDPRESS_PASSWORD_DEV
WORDPRESS_PASSWORD_STAGING
WORDPRESS_PASSWORD_PROD
```

### 4. Manual Deployment

```bash
# Trigger manual deployment via GitHub Actions
gh workflow run deploy.yml -f environment=production

# Or use the GitHub web interface
# Go to Actions > Deploy Content Pipeline > Run workflow
```

## Environment-Specific Deployment

### 1. Development Environment

```bash
# Deploy to development
make deploy-dev
# or
./scripts/deploy.sh --environment development

# Start local development
make dev
# or
supabase start
```

### 2. Staging Environment

```bash
# Deploy to staging
make deploy-staging
# or
./scripts/deploy.sh --environment staging

# Test staging deployment
make health-functions
make health-scheduler
```

### 3. Production Environment

```bash
# Deploy to production
make deploy-prod
# or
./scripts/deploy.sh --environment production

# Verify production deployment
make health
make scheduler-status
```

## Rollback Procedures

### 1. Automatic Rollback

The system automatically creates backups before each deployment:

```bash
# List available backups
ls -la backups/

# Rollback to latest backup
./scripts/rollback.sh

# Rollback to specific backup
./scripts/rollback.sh --backup-dir backups/20240101_120000
```

### 2. Manual Rollback

```bash
# Stop scheduler
supabase db reset --linked

# Restore database
supabase db push --file backups/20240101_120000/schema.sql

# Restore Edge Functions
cp -r backups/20240101_120000/functions/* supabase/functions/
supabase functions deploy

# Restart scheduler
curl -X POST "https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/scheduler?action=initialize"
```

### 3. Emergency Rollback

```bash
# Force rollback without confirmation
./scripts/rollback.sh --force

# Or via GitHub Actions
gh workflow run deploy.yml -f environment=rollback
```

## Health Checks

### 1. System Health

```bash
# Full health check
make health
# or
./scripts/health-check.sh

# Check specific components
make health-functions
make health-scheduler
make health-verbose
```

### 2. Component Health

```bash
# Check Edge Functions
curl -X GET "https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/content-automation" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Check scheduler
curl -X GET "https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/scheduler?action=status" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Check secrets
curl -X GET "https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/secrets?action=status" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### 3. Health Monitoring

```bash
# Generate health report
make health-report
# or
./scripts/health-check.sh --report

# Monitor continuously
watch -n 60 './scripts/health-check.sh --type functions'
```

## Monitoring and Alerting

### 1. Scheduler Monitoring

```bash
# Check scheduler status
make scheduler-status

# List scheduler jobs
make scheduler-jobs

# Check scheduler health
make scheduler-health

# Test scheduler
make scheduler-test
```

### 2. System Monitoring

```bash
# Start monitoring
make monitor

# Check monitoring alerts
make monitor-alerts

# Collect metrics
make metrics-collect

# Get metrics summary
make metrics-summary
```

### 3. Log Monitoring

```bash
# Check Supabase logs
supabase logs

# Check Edge Function logs
supabase functions logs content-automation

# Check database logs
supabase db logs
```

## Troubleshooting

### 1. Common Issues

#### Deployment Failures

```bash
# Check deployment logs
./scripts/deploy.sh --dry-run

# Verify environment variables
./scripts/health-check.sh --type config

# Check Supabase connection
./scripts/health-check.sh --type connection
```

#### Edge Function Issues

```bash
# Test function syntax
deno check supabase/functions/content-automation/index.ts

# Deploy function individually
supabase functions deploy content-automation

# Check function logs
supabase functions logs content-automation
```

#### Database Issues

```bash
# Check database connection
./scripts/health-check.sh --type database

# Reset database
make db-reset

# Check migrations
make db-diff
```

#### Scheduler Issues

```bash
# Check scheduler status
make scheduler-status

# Test scheduler
make scheduler-test

# Restart scheduler
curl -X POST "https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/scheduler?action=initialize"
```

### 2. Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | Continue |
| 1 | Error | Check logs, consider rollback |
| 2 | Warning | Monitor, may need attention |

### 3. Log Analysis

```bash
# Check recent errors
grep -r "ERROR" supabase/functions/ | tail -20

# Check deployment logs
tail -f deployment.log

# Check health check logs
tail -f health-check.log
```

## Best Practices

### 1. Deployment Best Practices

- **Always test in development first**
- **Use dry-run mode for testing**
- **Create backups before deployment**
- **Deploy during low-traffic periods**
- **Monitor deployment progress**
- **Verify deployment success**

### 2. Environment Management

- **Use separate projects for each environment**
- **Keep environment variables secure**
- **Use different API keys for each environment**
- **Regularly rotate secrets**
- **Monitor environment health**

### 3. Rollback Best Practices

- **Test rollback procedures regularly**
- **Keep multiple backup versions**
- **Document rollback procedures**
- **Train team on rollback processes**
- **Monitor rollback success**

### 4. Monitoring Best Practices

- **Set up automated health checks**
- **Configure alerting thresholds**
- **Monitor key metrics**
- **Regular log analysis**
- **Performance monitoring**

### 5. Security Best Practices

- **Never commit secrets to repository**
- **Use environment variables for secrets**
- **Regular security audits**
- **Monitor for security issues**
- **Keep dependencies updated**

## Conclusion

This deployment guide provides comprehensive instructions for deploying and managing the Content Pipeline system. Follow these procedures to ensure reliable, secure, and efficient deployments across all environments.

For additional support or questions, please refer to the troubleshooting section or contact the development team.
