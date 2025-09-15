// Business Logic Validators for Site Configuration
// This module provides business rule validation beyond JSON Schema

const { URL } = require('url');
const fetch = require('node-fetch');

class BusinessValidators {
    constructor() {
        this.urlCache = new Map();
        this.timeout = 5000; // 5 second timeout for URL validation
    }

    /**
     * Validate URL accessibility and format
     * @param {string} url - URL to validate
     * @param {string} fieldName - Field name for error reporting
     * @returns {Promise<Object>} Validation result
     */
    async validateUrl(url, fieldName = 'url') {
        const result = {
            valid: true,
            errors: []
        };

        try {
            // Basic URL format validation
            const urlObj = new URL(url);
            
            // Check protocol
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                result.valid = false;
                result.errors.push({
                    field: fieldName,
                    message: `URL must use HTTP or HTTPS protocol, got: ${urlObj.protocol}`,
                    value: url,
                    severity: 'error',
                    category: 'format',
                    suggestion: 'Change protocol to http:// or https://'
                });
            }

            // Check if URL is accessible (optional, with timeout)
            if (result.valid) {
                try {
                    const isAccessible = await this.checkUrlAccessibility(url);
                    if (!isAccessible) {
                        result.errors.push({
                            field: fieldName,
                            message: `URL is not accessible: ${url}`,
                            value: url,
                            severity: 'warning',
                            category: 'connectivity',
                            suggestion: 'Verify the URL is correct and the site is running'
                        });
                    }
                } catch (error) {
                    result.errors.push({
                        field: fieldName,
                        message: `URL accessibility check failed: ${error.message}`,
                        value: url,
                        severity: 'warning',
                        category: 'connectivity',
                        suggestion: 'Check network connectivity and URL validity'
                    });
                }
            }

        } catch (error) {
            result.valid = false;
            result.errors.push({
                field: fieldName,
                message: `Invalid URL format: ${error.message}`,
                value: url,
                severity: 'error',
                category: 'format',
                suggestion: 'Ensure URL follows standard format (e.g., https://example.com)'
            });
        }

        return result;
    }

    /**
     * Check if URL is accessible with timeout
     * @param {string} url - URL to check
     * @returns {Promise<boolean>} True if accessible
     */
    async checkUrlAccessibility(url) {
        // Check cache first
        if (this.urlCache.has(url)) {
            const cached = this.urlCache.get(url);
            // Cache for 5 minutes
            if (Date.now() - cached.timestamp < 300000) {
                return cached.accessible;
            }
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Content-Pipeline-Validator/1.0'
                }
            });

            clearTimeout(timeoutId);

            const accessible = response.ok || response.status < 500;
            
            // Cache result
            this.urlCache.set(url, {
                accessible,
                timestamp: Date.now()
            });

            return accessible;

        } catch (error) {
            // Cache negative result
            this.urlCache.set(url, {
                accessible: false,
                timestamp: Date.now()
            });
            return false;
        }
    }

    /**
     * Validate WordPress endpoint accessibility
     * @param {string} baseUrl - WordPress site base URL
     * @returns {Promise<Object>} Validation result
     */
    async validateWordPressEndpoint(baseUrl) {
        const result = {
            valid: true,
            errors: []
        };

        try {
            const wpApiUrl = `${baseUrl.replace(/\/$/, '')}/wp-json/wp/v2/`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(wpApiUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Content-Pipeline-Validator/1.0'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                result.valid = false;
                result.errors.push({
                    field: 'url',
                    message: `WordPress REST API not accessible: ${response.status} ${response.statusText}`,
                    value: baseUrl,
                    severity: 'error',
                    category: 'wordpress',
                    suggestion: 'Verify WordPress is installed and REST API is enabled'
                });
            } else {
                // Check if it's actually WordPress
                const data = await response.json();
                if (!data.name || !data.description) {
                    result.errors.push({
                        field: 'url',
                        message: 'URL does not appear to be a WordPress site',
                        value: baseUrl,
                        severity: 'warning',
                        category: 'wordpress',
                        suggestion: 'Verify this is a WordPress installation'
                    });
                }
            }

        } catch (error) {
            result.valid = false;
            result.errors.push({
                field: 'url',
                message: `WordPress API check failed: ${error.message}`,
                value: baseUrl,
                severity: 'error',
                category: 'wordpress',
                suggestion: 'Check if WordPress is installed and accessible'
            });
        }

        return result;
    }

    /**
     * Validate timeout value range
     * @param {number} timeout - Timeout value in seconds
     * @param {string} fieldName - Field name for error reporting
     * @returns {Object} Validation result
     */
    validateTimeout(timeout, fieldName = 'timeout') {
        const result = {
            valid: true,
            errors: []
        };

        if (typeof timeout !== 'number' || isNaN(timeout)) {
            result.valid = false;
            result.errors.push({
                field: fieldName,
                message: 'Timeout must be a valid number',
                value: timeout,
                severity: 'error',
                category: 'type',
                suggestion: 'Provide a numeric timeout value in seconds'
            });
            return result;
        }

        if (timeout < 1) {
            result.valid = false;
            result.errors.push({
                field: fieldName,
                message: 'Timeout must be at least 1 second',
                value: timeout,
                severity: 'error',
                category: 'range',
                suggestion: 'Set timeout to at least 1 second'
            });
        }

        if (timeout > 300) {
            result.valid = false;
            result.errors.push({
                field: fieldName,
                message: 'Timeout must not exceed 300 seconds (5 minutes)',
                value: timeout,
                severity: 'error',
                category: 'range',
                suggestion: 'Set timeout to 300 seconds or less'
            });
        }

        return result;
    }

    /**
     * Validate required field presence and non-empty values
     * @param {Object} config - Configuration object
     * @param {Array} requiredFields - Array of required field names
     * @returns {Object} Validation result
     */
    validateRequiredFields(config, requiredFields) {
        const result = {
            valid: true,
            errors: []
        };

        requiredFields.forEach(field => {
            if (!(field in config)) {
                result.valid = false;
                result.errors.push({
                    field: field,
                    message: `Required field '${field}' is missing`,
                    value: undefined,
                    severity: 'error',
                    category: 'required',
                    suggestion: `Add the '${field}' field to the configuration`
                });
            } else if (config[field] === null || config[field] === undefined) {
                result.valid = false;
                result.errors.push({
                    field: field,
                    message: `Required field '${field}' cannot be null or undefined`,
                    value: config[field],
                    severity: 'error',
                    category: 'required',
                    suggestion: `Provide a valid value for '${field}'`
                });
            } else if (typeof config[field] === 'string' && config[field].trim() === '') {
                result.valid = false;
                result.errors.push({
                    field: field,
                    message: `Required field '${field}' cannot be empty`,
                    value: config[field],
                    severity: 'error',
                    category: 'required',
                    suggestion: `Provide a non-empty value for '${field}'`
                });
            } else if (Array.isArray(config[field]) && config[field].length === 0) {
                result.valid = false;
                result.errors.push({
                    field: field,
                    message: `Required field '${field}' cannot be an empty array`,
                    value: config[field],
                    severity: 'error',
                    category: 'required',
                    suggestion: `Provide at least one item for '${field}'`
                });
            }
        });

        return result;
    }

    /**
     * Validate WordPress credential format
     * @param {string} username - WordPress username
     * @param {string} appPassword - WordPress application password
     * @returns {Object} Validation result
     */
    validateWordPressCredentials(username, appPassword) {
        const result = {
            valid: true,
            errors: []
        };

        // Validate username
        if (!username || typeof username !== 'string') {
            result.valid = false;
            result.errors.push({
                field: 'username',
                message: 'WordPress username is required',
                value: username,
                severity: 'error',
                category: 'credentials',
                suggestion: 'Provide a valid WordPress username'
            });
        } else if (username.length < 3) {
            result.valid = false;
            result.errors.push({
                field: 'username',
                message: 'WordPress username must be at least 3 characters long',
                value: username,
                severity: 'error',
                category: 'credentials',
                suggestion: 'Use a username with at least 3 characters'
            });
        } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            result.valid = false;
            result.errors.push({
                field: 'username',
                message: 'WordPress username contains invalid characters',
                value: username,
                severity: 'error',
                category: 'credentials',
                suggestion: 'Use only letters, numbers, underscores, and hyphens'
            });
        }

        // Validate app password format
        if (!appPassword || typeof appPassword !== 'string') {
            result.valid = false;
            result.errors.push({
                field: 'appPassword',
                message: 'WordPress application password is required',
                value: appPassword,
                severity: 'error',
                category: 'credentials',
                suggestion: 'Generate an application password in WordPress admin'
            });
        } else {
            const appPasswordPattern = /^[A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4}$/;
            if (!appPasswordPattern.test(appPassword)) {
                result.valid = false;
                result.errors.push({
                    field: 'appPassword',
                    message: 'WordPress application password has invalid format',
                    value: appPassword,
                    severity: 'error',
                    category: 'credentials',
                    suggestion: 'Generate a new application password in WordPress admin (6 groups of 4 characters)'
                });
            }
        }

        return result;
    }

    /**
     * Validate site ID uniqueness across configurations
     * @param {string} siteId - Site ID to check
     * @param {Object} allConfigs - All site configurations
     * @param {string} currentFile - Current file being validated
     * @returns {Object} Validation result
     */
    validateSiteIdUniqueness(siteId, allConfigs, currentFile) {
        const result = {
            valid: true,
            errors: []
        };

        const duplicateFiles = Object.keys(allConfigs).filter(file => 
            file !== currentFile && allConfigs[file].id === siteId
        );

        if (duplicateFiles.length > 0) {
            result.valid = false;
            result.errors.push({
                field: 'id',
                message: `Site ID '${siteId}' is already used in: ${duplicateFiles.join(', ')}`,
                value: siteId,
                severity: 'error',
                category: 'uniqueness',
                suggestion: `Use a unique site ID. Consider: ${siteId}-${Date.now()}`
            });
        }

        return result;
    }

    /**
     * Clear URL validation cache
     */
    clearCache() {
        this.urlCache.clear();
    }

    /**
     * Set URL validation timeout
     * @param {number} timeout - Timeout in milliseconds
     */
    setTimeout(timeout) {
        this.timeout = timeout;
    }
}

module.exports = BusinessValidators;
