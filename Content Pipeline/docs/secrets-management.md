# Secrets Management Guide

## Overview

This document provides comprehensive guidance on managing secrets in the Content Pipeline system using Supabase Vault.

## Table of Contents

1. [Secrets Overview](#secrets-overview)
2. [Setting Up Secrets](#setting-up-secrets)
3. [Secret Categories](#secret-categories)
4. [Secret Validation](#secret-validation)
5. [Using Secrets in Code](#using-secrets-in-code)
6. [Secret Rotation](#secret-rotation)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

## Secrets Overview

The Content Pipeline system uses Supabase Vault to securely store and manage sensitive information such as API keys, passwords, and configuration data. All secrets are encrypted at rest and accessed through a secure API.

### Key Features

- **Encrypted Storage**: All secrets are encrypted using Supabase's built-in encryption
- **Access Control**: Secrets are only accessible to authorized Edge Functions
- **Validation**: Built-in validation ensures secrets meet required formats
- **Caching**: Intelligent caching improves performance while maintaining security
- **Audit Trail**: All secret access is logged for security monitoring

## Setting Up Secrets

### 1. Access Supabase Vault

```bash
# Navigate to your Supabase project
cd supabase

# Start the local development environment
supabase start

# Access the Supabase Studio
# Open http://localhost:54323 in your browser
```

### 2. Insert Secrets into Vault

You can insert secrets using SQL or the Supabase Studio interface:

#### Using SQL (Recommended for Development)

```sql
-- Insert OpenAI API key
SELECT upsert_vault_secret(
    'openai_api_key',
    'sk-your-actual-openai-api-key-here',
    'OpenAI API key for content generation',
    'api_keys',
    true,
    'admin'
);

-- Insert WordPress configuration
SELECT upsert_vault_secret(
    'wordpress_url',
    'https://your-wordpress-site.com',
    'WordPress site URL',
    'external_services',
    true,
    'admin'
);

SELECT upsert_vault_secret(
    'wordpress_username',
    'content-bot',
    'WordPress username for content posting',
    'external_services',
    true,
    'admin'
);

SELECT upsert_vault_secret(
    'wordpress_password',
    'your-wordpress-app-password',
    'WordPress application password',
    'external_services',
    true,
    'admin'
);

-- Insert optional notification secrets
SELECT upsert_vault_secret(
    'slack_webhook_url',
    'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
    'Slack webhook URL for notifications',
    'notifications',
    false,
    'admin'
);
```

#### Using Supabase Studio

1. Navigate to the **Vault** section in Supabase Studio
2. Click **Create Secret**
3. Fill in the secret details:
   - **Name**: The secret identifier (e.g., `openai_api_key`)
   - **Value**: The actual secret value
   - **Description**: Human-readable description
   - **Category**: Choose appropriate category
   - **Required**: Mark if this secret is required

### 3. Verify Secrets

```sql
-- Check all secrets
SELECT * FROM vault.secrets;

-- Validate all secrets
SELECT * FROM validate_vault_secrets();

-- Get secrets status
SELECT * FROM get_vault_secrets_status();
```

## Secret Categories

Secrets are organized into categories for better management:

### API Keys (`api_keys`)
- `openai_api_key`: OpenAI API key for content generation
- `openai_organization`: OpenAI organization ID (optional)

### External Services (`external_services`)
- `wordpress_url`: WordPress site URL
- `wordpress_username`: WordPress username
- `wordpress_password`: WordPress application password

### Notifications (`notifications`)
- `slack_webhook_url`: Slack webhook URL (optional)
- `alert_webhook_url`: Alert webhook URL (optional)

### Security (`security`)
- `encryption_key`: Encryption key for sensitive data (optional)

## Secret Validation

All secrets are validated against predefined rules:

### OpenAI API Key
- **Format**: Must start with `sk-` and be at least 20 characters
- **Example**: `sk-123456789012345678901234567890`

### OpenAI Organization
- **Format**: Must start with `org-` and be at least 20 characters
- **Example**: `org-123456789012345678901234567890`

### WordPress URL
- **Format**: Must include protocol (`http://` or `https://`)
- **Example**: `https://your-wordpress-site.com`

### WordPress Username
- **Format**: At least 3 characters, alphanumeric, underscore, or dash
- **Example**: `content-bot`

### WordPress Password
- **Format**: At least 8 characters
- **Example**: `your-secure-password`

### Slack Webhook URL
- **Format**: Must be a valid Slack webhook URL
- **Example**: `https://hooks.slack.com/services/123/456/789`

## Using Secrets in Code

### Basic Usage

```typescript
import { getSecret, getSecrets } from '../_shared/secrets.ts'

// Get a single secret
const openaiKey = await getSecret('openai_api_key')

// Get multiple secrets
const secrets = await getSecrets(['openai_api_key', 'wordpress_url'])

// Get secrets by category
const apiKeys = await getSecretsByCategory('api_keys')
```

### Configuration Helpers

```typescript
import { getOpenAIConfig, getWordPressConfig } from '../_shared/secrets.ts'

// Get OpenAI configuration
const openaiConfig = await getOpenAIConfig()
// Returns: { apiKey: string, organization?: string }

// Get WordPress configuration
const wordpressConfig = await getWordPressConfig()
// Returns: { url: string, username: string, password: string }
```

### Error Handling

```typescript
import { getSecret } from '../_shared/secrets.ts'

try {
  const secret = await getSecret('openai_api_key')
  // Use the secret
} catch (error) {
  console.error('Failed to get secret:', error.message)
  // Handle the error appropriately
}
```

## Secret Rotation

### Manual Rotation

```sql
-- Rotate a secret
SELECT rotate_vault_secret(
    'openai_api_key',
    'sk-new-openai-api-key-here',
    'admin'
);
```

### Automated Rotation

For production environments, implement automated secret rotation:

1. **Set up monitoring** for secret expiration
2. **Create rotation scripts** that update secrets in the vault
3. **Test rotation** in a staging environment first
4. **Update dependent services** after rotation

### Rotation Best Practices

- **Rotate regularly**: Rotate secrets at least every 90 days
- **Test after rotation**: Verify all services work with new secrets
- **Keep old secrets**: Maintain old secrets briefly for rollback
- **Monitor for issues**: Watch for authentication failures after rotation

## Security Best Practices

### 1. Access Control

- **Use service role**: Only use the service role key for accessing secrets
- **Limit access**: Only grant access to necessary Edge Functions
- **Monitor access**: Regularly review secret access logs

### 2. Secret Management

- **Use strong secrets**: Generate strong, random secrets
- **Rotate regularly**: Implement regular secret rotation
- **Never log secrets**: Ensure secrets are never logged or exposed
- **Use environment-specific secrets**: Use different secrets for different environments

### 3. Development vs Production

- **Separate environments**: Use different Supabase projects for dev/staging/prod
- **Different secrets**: Use different API keys for different environments
- **Access restrictions**: Limit production secret access to production functions only

### 4. Monitoring and Alerting

- **Monitor access**: Set up alerts for unusual secret access patterns
- **Track failures**: Monitor for authentication failures
- **Audit regularly**: Regularly review secret access logs

## Troubleshooting

### Common Issues

#### 1. Secret Not Found

**Error**: `Secret not found in vault`

**Solution**:
```sql
-- Check if secret exists
SELECT * FROM vault.secrets WHERE name = 'secret_name';

-- Insert missing secret
SELECT upsert_vault_secret('secret_name', 'secret_value', 'description', 'category', true, 'admin');
```

#### 2. Invalid Secret Format

**Error**: `Secret format is invalid`

**Solution**:
- Check the secret format against validation rules
- Ensure the secret meets the required criteria
- Update the secret with the correct format

#### 3. Cache Issues

**Error**: `Secret not found in cache`

**Solution**:
```typescript
// Clear and refresh cache
import { clearSecretsCache, refreshSecretsCache } from '../_shared/secrets.ts'

clearSecretsCache()
await refreshSecretsCache()
```

#### 4. Permission Denied

**Error**: `Permission denied`

**Solution**:
- Ensure you're using the service role key
- Check that the Edge Function has proper permissions
- Verify the Supabase project configuration

### Debugging

#### 1. Check Secret Status

```typescript
import { getSecretsStatus } from '../_shared/secrets.ts'

const status = await getSecretsStatus()
console.log('Secrets status:', status)
```

#### 2. Validate All Secrets

```typescript
import { validateAllSecrets } from '../_shared/secrets.ts'

const validation = await validateAllSecrets()
console.log('Validation results:', validation)
```

#### 3. Test Secret Access

```typescript
import { getSecret } from '../_shared/secrets.ts'

try {
  const secret = await getSecret('openai_api_key')
  console.log('Secret retrieved successfully')
} catch (error) {
  console.error('Failed to retrieve secret:', error.message)
}
```

### Getting Help

If you encounter issues not covered in this guide:

1. **Check the logs**: Review Edge Function logs for detailed error messages
2. **Validate configuration**: Ensure all required secrets are properly configured
3. **Test in isolation**: Test secret access in a simple Edge Function
4. **Contact support**: Reach out to the development team for assistance

## API Reference

### Functions

#### `getSecret(secretName: string): Promise<string>`
Retrieves a single secret from the vault.

#### `getSecrets(secretNames: string[]): Promise<Record<string, string>>`
Retrieves multiple secrets from the vault.

#### `getSecretsByCategory(category: string): Promise<Record<string, string>>`
Retrieves all secrets for a specific category.

#### `getRequiredSecrets(): Promise<Record<string, string>>`
Retrieves all required secrets.

#### `validateAllSecrets(): Promise<ValidationResult>`
Validates all secrets against their rules.

#### `getSecretsStatus(): Promise<SecretsStatus>`
Gets the current status of all secrets.

### Database Functions

#### `upsert_vault_secret(name, value, description, category, required, user)`
Inserts or updates a secret in the vault.

#### `get_vault_secret(name)`
Retrieves a secret from the vault.

#### `validate_vault_secrets()`
Validates all secrets in the vault.

#### `rotate_vault_secret(name, new_value, user)`
Rotates a secret in the vault.

## Conclusion

Proper secrets management is crucial for the security and reliability of the Content Pipeline system. By following this guide, you can ensure that sensitive information is stored securely and accessed appropriately throughout the system.

For additional support or questions, please refer to the Supabase Vault documentation or contact the development team.
