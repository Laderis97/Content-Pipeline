-- Create vault secrets table for secure secrets management
-- PRD Reference: Configuration & Deployment (6.2), Data & Security (E1)

-- Enable the vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Create vault secrets table
CREATE TABLE IF NOT EXISTS vault.secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('api_keys', 'external_services', 'notifications', 'security')),
    required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vault_secrets_name ON vault.secrets(name);
CREATE INDEX IF NOT EXISTS idx_vault_secrets_category ON vault.secrets(category);
CREATE INDEX IF NOT EXISTS idx_vault_secrets_required ON vault.secrets(required);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vault_secrets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_vault_secrets_updated_at
    BEFORE UPDATE ON vault.secrets
    FOR EACH ROW
    EXECUTE FUNCTION update_vault_secrets_updated_at();

-- Create function to insert or update a secret
CREATE OR REPLACE FUNCTION upsert_vault_secret(
    secret_name TEXT,
    secret_value TEXT,
    secret_description TEXT DEFAULT NULL,
    secret_category TEXT DEFAULT 'api_keys',
    secret_required BOOLEAN DEFAULT false,
    user_name TEXT DEFAULT 'system'
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    category TEXT,
    required BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    secret_id UUID;
    secret_created_at TIMESTAMPTZ;
    secret_updated_at TIMESTAMPTZ;
BEGIN
    -- Validate category
    IF secret_category NOT IN ('api_keys', 'external_services', 'notifications', 'security') THEN
        RAISE EXCEPTION 'Invalid category: %', secret_category;
    END IF;
    
    -- Insert or update the secret
    INSERT INTO vault.secrets (name, value, description, category, required, created_by, updated_by)
    VALUES (secret_name, secret_value, secret_description, secret_category, secret_required, user_name, user_name)
    ON CONFLICT (name) DO UPDATE SET
        value = EXCLUDED.value,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        required = EXCLUDED.required,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    RETURNING vault.secrets.id, vault.secrets.name, vault.secrets.category, vault.secrets.required, vault.secrets.created_at, vault.secrets.updated_at
    INTO secret_id, secret_name, secret_category, secret_required, secret_created_at, secret_updated_at;
    
    RETURN QUERY SELECT secret_id, secret_name, secret_category, secret_required, secret_created_at, secret_updated_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to get a secret value
CREATE OR REPLACE FUNCTION get_vault_secret(secret_name TEXT)
RETURNS TABLE (
    value TEXT,
    category TEXT,
    required BOOLEAN,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.value, s.category, s.required, s.updated_at
    FROM vault.secrets s
    WHERE s.name = secret_name;
END;
$$ LANGUAGE plpgsql;

-- Create function to get secrets by category
CREATE OR REPLACE FUNCTION get_vault_secrets_by_category(secret_category TEXT)
RETURNS TABLE (
    name TEXT,
    value TEXT,
    description TEXT,
    required BOOLEAN,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.name, s.value, s.description, s.required, s.updated_at
    FROM vault.secrets s
    WHERE s.category = secret_category
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- Create function to get all required secrets
CREATE OR REPLACE FUNCTION get_required_vault_secrets()
RETURNS TABLE (
    name TEXT,
    value TEXT,
    description TEXT,
    category TEXT,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.name, s.value, s.description, s.category, s.updated_at
    FROM vault.secrets s
    WHERE s.required = true
    ORDER BY s.category, s.name;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate secrets
CREATE OR REPLACE FUNCTION validate_vault_secrets()
RETURNS TABLE (
    name TEXT,
    valid BOOLEAN,
    errors TEXT[],
    warnings TEXT[]
) AS $$
DECLARE
    secret_record RECORD;
    validation_errors TEXT[];
    validation_warnings TEXT[];
    is_valid BOOLEAN;
BEGIN
    FOR secret_record IN 
        SELECT name, value, required, category
        FROM vault.secrets
        ORDER BY name
    LOOP
        validation_errors := ARRAY[]::TEXT[];
        validation_warnings := ARRAY[]::TEXT[];
        is_valid := true;
        
        -- Check if required secret is present
        IF secret_record.required AND (secret_record.value IS NULL OR secret_record.value = '') THEN
            validation_errors := array_append(validation_errors, 'Required secret is empty');
            is_valid := false;
        END IF;
        
        -- Validate based on secret name patterns
        CASE secret_record.name
            WHEN 'openai_api_key' THEN
                IF secret_record.value IS NOT NULL AND secret_record.value != '' THEN
                    IF NOT secret_record.value ~ '^sk-[a-zA-Z0-9]{20,}$' THEN
                        validation_errors := array_append(validation_errors, 'OpenAI API key must start with sk- and be at least 20 characters');
                        is_valid := false;
                    END IF;
                END IF;
                
            WHEN 'openai_organization' THEN
                IF secret_record.value IS NOT NULL AND secret_record.value != '' THEN
                    IF NOT secret_record.value ~ '^org-[a-zA-Z0-9]{20,}$' THEN
                        validation_errors := array_append(validation_errors, 'OpenAI organization ID must start with org- and be at least 20 characters');
                        is_valid := false;
                    END IF;
                END IF;
                
            WHEN 'wordpress_url' THEN
                IF secret_record.value IS NOT NULL AND secret_record.value != '' THEN
                    IF NOT secret_record.value ~ '^https?://.+' THEN
                        validation_errors := array_append(validation_errors, 'WordPress URL must include protocol (http:// or https://)');
                        is_valid := false;
                    END IF;
                END IF;
                
            WHEN 'wordpress_username' THEN
                IF secret_record.value IS NOT NULL AND secret_record.value != '' THEN
                    IF NOT secret_record.value ~ '^[a-zA-Z0-9_-]{3,}$' THEN
                        validation_errors := array_append(validation_errors, 'WordPress username must be at least 3 characters (alphanumeric, underscore, dash)');
                        is_valid := false;
                    END IF;
                END IF;
                
            WHEN 'wordpress_password' THEN
                IF secret_record.value IS NOT NULL AND secret_record.value != '' THEN
                    IF length(secret_record.value) < 8 THEN
                        validation_errors := array_append(validation_errors, 'WordPress password must be at least 8 characters');
                        is_valid := false;
                    END IF;
                END IF;
                
            WHEN 'slack_webhook_url' THEN
                IF secret_record.value IS NOT NULL AND secret_record.value != '' THEN
                    IF NOT secret_record.value ~ '^https://hooks\.slack\.com/services/.+' THEN
                        validation_errors := array_append(validation_errors, 'Slack webhook URL must be a valid Slack webhook URL');
                        is_valid := false;
                    END IF;
                END IF;
                
            WHEN 'alert_webhook_url' THEN
                IF secret_record.value IS NOT NULL AND secret_record.value != '' THEN
                    IF NOT secret_record.value ~ '^https?://.+' THEN
                        validation_errors := array_append(validation_errors, 'Alert webhook URL must include protocol');
                        is_valid := false;
                    END IF;
                END IF;
                
            WHEN 'encryption_key' THEN
                IF secret_record.value IS NOT NULL AND secret_record.value != '' THEN
                    IF NOT secret_record.value ~ '^[a-zA-Z0-9+/]{32,}$' THEN
                        validation_errors := array_append(validation_errors, 'Encryption key must be base64 encoded and at least 32 characters');
                        is_valid := false;
                    END IF;
                END IF;
        END CASE;
        
        -- Add warnings for optional secrets that are empty
        IF NOT secret_record.required AND (secret_record.value IS NULL OR secret_record.value = '') THEN
            validation_warnings := array_append(validation_warnings, 'Optional secret is empty');
        END IF;
        
        RETURN QUERY SELECT secret_record.name, is_valid, validation_errors, validation_warnings;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to get secrets status
CREATE OR REPLACE FUNCTION get_vault_secrets_status()
RETURNS TABLE (
    total_secrets BIGINT,
    required_secrets BIGINT,
    optional_secrets BIGINT,
    valid_secrets BIGINT,
    invalid_secrets BIGINT,
    missing_required BIGINT,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH validation_results AS (
        SELECT name, valid, errors
        FROM validate_vault_secrets()
    ),
    secret_counts AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE required = true) as required_count,
            COUNT(*) FILTER (WHERE required = false) as optional_count
        FROM vault.secrets
    ),
    validation_counts AS (
        SELECT 
            COUNT(*) FILTER (WHERE valid = true) as valid_count,
            COUNT(*) FILTER (WHERE valid = false) as invalid_count,
            COUNT(*) FILTER (WHERE array_length(errors, 1) > 0 AND name IN (
                SELECT name FROM vault.secrets WHERE required = true
            )) as missing_required_count
        FROM validation_results
    )
    SELECT 
        sc.total,
        sc.required_count,
        sc.optional_count,
        vc.valid_count,
        vc.invalid_count,
        vc.missing_required_count,
        MAX(s.updated_at) as last_updated
    FROM secret_counts sc, validation_counts vc, vault.secrets s
    GROUP BY sc.total, sc.required_count, sc.optional_count, vc.valid_count, vc.invalid_count, vc.missing_required_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to audit secret access
CREATE OR REPLACE FUNCTION audit_vault_secret_access(
    secret_name TEXT,
    access_type TEXT,
    user_name TEXT DEFAULT 'system'
)
RETURNS VOID AS $$
BEGIN
    -- In a real implementation, this would log to an audit table
    -- For now, we'll just log the access
    RAISE NOTICE 'Secret access: % accessed % by %', secret_name, access_type, user_name;
END;
$$ LANGUAGE plpgsql;

-- Create function to rotate a secret
CREATE OR REPLACE FUNCTION rotate_vault_secret(
    secret_name TEXT,
    new_value TEXT,
    user_name TEXT DEFAULT 'system'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    secret_exists BOOLEAN;
BEGIN
    -- Check if secret exists
    SELECT EXISTS(SELECT 1 FROM vault.secrets WHERE name = secret_name) INTO secret_exists;
    
    IF NOT secret_exists THEN
        RETURN QUERY SELECT false, 'Secret not found: ' || secret_name;
        RETURN;
    END IF;
    
    -- Update the secret
    UPDATE vault.secrets 
    SET 
        value = new_value,
        updated_by = user_name,
        updated_at = NOW()
    WHERE name = secret_name;
    
    -- Log the rotation
    PERFORM audit_vault_secret_access(secret_name, 'rotation', user_name);
    
    RETURN QUERY SELECT true, 'Secret rotated successfully: ' || secret_name;
END;
$$ LANGUAGE plpgsql;

-- Insert default secrets (with placeholder values)
INSERT INTO vault.secrets (name, value, description, category, required, created_by) VALUES
('openai_api_key', 'sk-placeholder-replace-with-actual-key', 'OpenAI API key for content generation', 'api_keys', true, 'system'),
('openai_organization', '', 'OpenAI organization ID (optional)', 'api_keys', false, 'system'),
('wordpress_url', 'https://your-wordpress-site.com', 'WordPress site URL', 'external_services', true, 'system'),
('wordpress_username', 'content-bot', 'WordPress username for content posting', 'external_services', true, 'system'),
('wordpress_password', 'placeholder-password-replace-with-actual', 'WordPress application password', 'external_services', true, 'system'),
('slack_webhook_url', '', 'Slack webhook URL for notifications (optional)', 'notifications', false, 'system'),
('alert_webhook_url', '', 'Alert webhook URL for notifications (optional)', 'notifications', false, 'system'),
('encryption_key', '', 'Encryption key for sensitive data (optional)', 'security', false, 'system')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions
GRANT SELECT ON vault.secrets TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_vault_secret(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vault_secret(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vault_secrets_by_category(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_required_vault_secrets() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_vault_secrets() TO authenticated;
GRANT EXECUTE ON FUNCTION get_vault_secrets_status() TO authenticated;
GRANT EXECUTE ON FUNCTION audit_vault_secret_access(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION rotate_vault_secret(TEXT, TEXT, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE vault.secrets IS 'Secure secrets storage for API keys and credentials';
COMMENT ON COLUMN vault.secrets.id IS 'Unique identifier for the secret';
COMMENT ON COLUMN vault.secrets.name IS 'Unique name of the secret';
COMMENT ON COLUMN vault.secrets.value IS 'Encrypted secret value';
COMMENT ON COLUMN vault.secrets.description IS 'Description of what the secret is used for';
COMMENT ON COLUMN vault.secrets.category IS 'Category of the secret (api_keys, external_services, notifications, security)';
COMMENT ON COLUMN vault.secrets.required IS 'Whether this secret is required for the system to function';
COMMENT ON COLUMN vault.secrets.created_at IS 'When the secret was created';
COMMENT ON COLUMN vault.secrets.updated_at IS 'When the secret was last updated';
COMMENT ON COLUMN vault.secrets.created_by IS 'User who created the secret';
COMMENT ON COLUMN vault.secrets.updated_by IS 'User who last updated the secret';
