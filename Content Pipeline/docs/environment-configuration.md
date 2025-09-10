# Environment Configuration Guide

## Overview

This guide provides comprehensive documentation for configuring environment variables and service role authentication for the Content Pipeline system.

**Current Status**: Environment configuration completed ✅
- ✅ Supabase project linked and configured
- ✅ Environment variables set up
- ✅ Database migrations 001-005 applied

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Service Role Authentication](#service-role-authentication)
3. [Configuration Management](#configuration-management)
4. [Security Best Practices](#security-best-practices)
5. [Environment-Specific Settings](#environment-specific-settings)
6. [Validation and Testing](#validation-and-testing)
7. [Troubleshooting](#troubleshooting)

## Environment Variables

### Required Environment Variables

#### Supabase Configuration
```bash
# Supabase project URL
SUPABASE_URL=https://zjqsfdqhhvhbwqmgdfzn.supabase.co

# Supabase service role key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA

# Supabase anonymous key (for client-side operations)
SUPABASE_ANON_KEY=

```

#### OpenAI Configuration
```bash
# OpenAI API key
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_PROJECT_ID=proj_JAjwigD_DLFPpgn3deUcKb425Gw3f_fb1Lm4zuQCd
# OpenAI model (optional, defaults to gpt-4)
OPENAI_MODEL=gpt-4

# OpenAI max tokens (optional, defaults to 2000)
OPENAI_MAX_TOKENS=2000

# OpenAI temperature (optional, defaults to 0.7)
OPENAI_TEMPERATURE=0.7
```

#### WordPress Configuration
```bash
# WordPress site URL
WORDPRESS_URL=http://automated-content-pipeline-local-test-site.local

# WordPress username
WORDPRESS_USERNAME=content-bot

# WordPress password (application password)
WORDPRESS_PASSWORD=inB4 Er6i Koi4 J7Ls JKkN n3Hu

# WordPress API path (optional, defaults to /wp-json/wp/v2)
WORDPRESS_API_PATH=/wp-json/wp/v2
```

### Optional Environment Variables

#### Content Configuration
```bash
# Default word count for generated content
DEFAULT_WORD_COUNT=700

# Minimum word count
MIN_WORD_COUNT=600

# Maximum word count
MAX_WORD_COUNT=800

# Default AI model
DEFAULT_MODEL=gpt-4
```

#### System Configuration
```bash
# Environment (development, staging, production)
ENVIRONMENT=development

# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Enable metrics collection
ENABLE_METRICS=true

# Enable health checks
ENABLE_HEALTH_CHECKS=true
```

#### Rate Limiting Configuration
```bash
# OpenAI rate limit (requests per minute)
OPENAI_RATE_LIMIT=60

# WordPress rate limit (requests per minute)
WORDPRESS_RATE_LIMIT=100

# API rate limit (requests per minute)
API_RATE_LIMIT=1000
```

#### Retry Configuration
```bash
# Maximum number of retries
MAX_RETRIES=3

# Initial retry delay in milliseconds
RETRY_DELAY_MS=1000

# Retry backoff multiplier
RETRY_BACKOFF_MULTIPLIER=2
```

#### Timeout Configuration
```bash
# OpenAI API timeout in milliseconds
OPENAI_TIMEOUT_MS=30000

# WordPress API timeout in milliseconds
WORDPRESS_TIMEOUT_MS=10000

# Function timeout in milliseconds
FUNCTION_TIMEOUT_MS=300000
```

#### Security Configuration
```bash
# Enable CORS
ENABLE_CORS=true

# Allowed origins (comma-separated)
ALLOWED_ORIGINS=*

# Enable rate limiting
ENABLE_RATE_LIMITING=true

# Enable authentication
ENABLE_AUTH=true
```

## Service Role Authentication

### Understanding Service Role vs Anonymous Key

#### Service Role Key
- **Purpose**: Server-side operations with full database access
- **Usage**: Edge Functions, database migrations, admin operations
- **Permissions**: Full access to all tables and functions
- **Security**: Must be kept secret, never exposed to clients

#### Anonymous Key
- **Purpose**: Client-side operations with limited access
- **Usage**: Public API calls, user authentication
- **Permissions**: Limited by Row Level Security (RLS) policies
- **Security**: Can be exposed to clients safely

### Service Role Key Format

Service role keys are JWT tokens that start with `eyJ`:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2NDA5OTg0MDAsImV4cCI6MTk1NjM1ODQwMH0.signature
```

### Getting Your Service Role Key

1. **From Supabase Dashboard**:
   - Go to your project dashboard
   - Navigate to Settings > API
   - Copy the "service_role" key (not the "anon" key)

2. **From Supabase CLI**:
   ```bash
   supabase status
   ```

3. **From Environment Variables**:
   ```bash
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

### Service Role Key Validation

The system automatically validates service role keys:

```typescript
// Check if key is valid JWT format
if (!serviceRoleKey.startsWith('eyJ')) {
  throw new Error('Invalid service role key format')
}

// Verify with Supabase
const { data, error } = await supabase.auth.getUser(serviceRoleKey)
if (error) {
  throw new Error('Invalid service role key')
}
```

## Configuration Management

### Configuration Initialization

The system automatically initializes configuration from environment variables:

```typescript
import { initializeConfig } from '../_shared/env-config.ts'

// Initialize with default values
const config = initializeConfig()

// Initialize with custom overrides
const config = initializeConfig({
  logLevel: 'debug',
  enableMetrics: true
})
```

### Configuration Access

Access configuration throughout the application:

```typescript
import { getConfig, getServiceConfig } from '../_shared/env-config.ts'

// Get full configuration
const config = getConfig()

// Get service-specific configuration
const openaiConfig = getServiceConfig('openai')
const wordpressConfig = getServiceConfig('wordpress')
const supabaseConfig = getServiceConfig('supabase')
```

### Feature Flags

Check if features are enabled:

```typescript
import { isFeatureEnabled } from '../_shared/env-config.ts'

if (isFeatureEnabled('metrics')) {
  // Collect metrics
}

if (isFeatureEnabled('healthChecks')) {
  // Run health checks
}

if (isFeatureEnabled('cors')) {
  // Enable CORS
}
```

### Runtime Configuration Updates

Update configuration at runtime:

```typescript
import { updateConfig } from '../_shared/env-config.ts'

// Update specific settings
const updatedConfig = updateConfig({
  logLevel: 'debug',
  enableMetrics: false
})
```

## Security Best Practices

### Environment Variable Security

1. **Never commit secrets to version control**:
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use environment-specific files**:
   ```bash
   .env.development
   .env.staging
   .env.production
   ```

3. **Rotate keys regularly**:
   - Generate new service role keys monthly
   - Update OpenAI API keys quarterly
   - Rotate WordPress passwords regularly

4. **Use least privilege principle**:
   - Service role key only for server operations
   - Anonymous key for client operations
   - Separate keys for different environments

### Service Role Key Security

1. **Store securely**:
   ```bash
   # Use secure environment variable storage
   export SUPABASE_SERVICE_ROLE_KEY="your-key-here"
   
   # Or use secrets management
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-key-here"
   ```

2. **Monitor usage**:
   - Log all service role key usage
   - Monitor for unusual access patterns
   - Set up alerts for key exposure

3. **Limit access**:
   - Only use service role key in Edge Functions
   - Never expose to client-side code
   - Use anonymous key for public operations

### API Key Security

1. **OpenAI API Key**:
   ```bash
   # Validate format
   if (!apiKey.startsWith('sk-')) {
     throw new Error('Invalid OpenAI API key format')
   }
   
   # Monitor usage
   # Set up billing alerts
   # Use rate limiting
   ```

2. **WordPress Credentials**:
   ```bash
   # Use application passwords
   # Enable two-factor authentication
   # Monitor login attempts
   # Use strong passwords
   ```

## Environment-Specific Settings

### Development Environment

```bash
# .env.development
ENVIRONMENT=development
LOG_LEVEL=debug
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
OPENAI_RATE_LIMIT=30
WORDPRESS_RATE_LIMIT=50
API_RATE_LIMIT=500
```

### Staging Environment

```bash
# .env.staging
ENVIRONMENT=staging
LOG_LEVEL=info
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
OPENAI_RATE_LIMIT=45
WORDPRESS_RATE_LIMIT=75
API_RATE_LIMIT=750
```

### Production Environment

```bash
# .env.production
ENVIRONMENT=production
LOG_LEVEL=warn
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
OPENAI_RATE_LIMIT=60
WORDPRESS_RATE_LIMIT=100
API_RATE_LIMIT=1000
```

## Validation and Testing

### Configuration Validation

The system automatically validates configuration:

```typescript
import { validateConfig } from '../_shared/env-config.ts'

const validation = validateConfig(config)
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors)
}
```

### Environment Variable Testing

Test environment variables:

```bash
# Test configuration
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager?action=test"

# Test environment variables
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager-test?action=env-test"

# Test authentication
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager-test?action=auth-test"
```

### Service Configuration Testing

Test service configurations:

```bash
# Test service configs
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager-test?action=service-test"

# Test features
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager-test?action=feature-test"

# Test validation
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager-test?action=validation-test"
```

### Integration Testing

Test configuration integration:

```bash
# Test integration
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager-test?action=integration-test"

# Test performance
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager-test?action=performance-test"
```

## Troubleshooting

### Common Issues

#### 1. Missing Environment Variables

**Error**: `Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY`

**Solution**:
```bash
# Check if variables are set
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Set variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

#### 2. Invalid Service Role Key

**Error**: `Invalid service role key format`

**Solution**:
```bash
# Check key format
echo $SUPABASE_SERVICE_ROLE_KEY | head -c 10
# Should start with "eyJ"

# Get new key from Supabase dashboard
# Settings > API > service_role key
```

#### 3. Configuration Validation Failed

**Error**: `Configuration validation failed: Invalid SUPABASE_URL format`

**Solution**:
```bash
# Check URL format
echo $SUPABASE_URL
# Should be: https://your-project.supabase.co

# Fix URL
export SUPABASE_URL="https://your-project.supabase.co"
```

#### 4. Authentication Failed

**Error**: `Authentication required`

**Solution**:
```bash
# Check if service role key is valid
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager?action=status" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Verify key permissions
# Check Supabase dashboard > Settings > API
```

### Debugging Configuration

#### 1. Check Configuration Status

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager?action=status" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### 2. Validate Configuration

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager?action=validate" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### 3. Test External Services

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager?action=external" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### 4. Run Full Test Suite

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/config-manager-test?action=test" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Configuration Logs

Check configuration logs:

```bash
# Check Edge Function logs
supabase functions logs config-manager

# Check configuration initialization logs
grep "Configuration initialized" supabase/functions/logs/

# Check validation logs
grep "Configuration validation" supabase/functions/logs/
```

### Environment Variable Debugging

Debug environment variables:

```bash
# List all environment variables
env | grep -E "(SUPABASE|OPENAI|WORDPRESS)"

# Check specific variables
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:10}..."
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
echo "WORDPRESS_URL: $WORDPRESS_URL"
```

## Conclusion

Proper environment configuration and service role authentication are critical for the secure and reliable operation of the Content Pipeline system. Follow this guide to ensure your environment is properly configured and secure.

For additional support or questions, please refer to the troubleshooting section or contact the development team.
