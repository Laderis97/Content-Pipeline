
// Site Configuration Schema Validator
// This module provides JSON Schema validation for site configurations

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');
const BusinessValidators = require('./business-validators');

class SchemaValidator {
    constructor() {
        this.ajv = new Ajv({ 
            allErrors: true,
            verbose: true,
            strict: false
        });
        addFormats(this.ajv);
        
        // Load the schema
        this.schema = this.loadSchema();
        this.validate = this.ajv.compile(this.schema);
        
        // Initialize business validators
        this.businessValidators = new BusinessValidators();
    }

    loadSchema() {
        const schemaPath = path.join(__dirname, 'site-config-schema.json');
        return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    }

    async validateConfig(config, filePath = '', options = {}) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            info: []
        };

        // 1. JSON Schema validation
        const schemaValid = this.validate(config);
        if (!schemaValid) {
            const schemaErrors = this.formatErrors(this.validate.errors, filePath);
            result.errors.push(...schemaErrors);
            result.valid = false;
        }

        // 2. Business logic validation
        if (options.enableBusinessValidation !== false) {
            const businessResult = await this.performBusinessValidation(config, filePath, options);
            result.errors.push(...businessResult.errors);
            result.warnings.push(...businessResult.warnings);
            result.info.push(...businessResult.info);
            
            if (!businessResult.valid) {
                result.valid = false;
            }
        }

        return result;
    }

    async performBusinessValidation(config, filePath = '', options = {}) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            info: []
        };

        // Required field validation
        const requiredFields = this.getRequiredFields();
        const requiredValidation = this.businessValidators.validateRequiredFields(config, requiredFields);
        if (!requiredValidation.valid) {
            result.errors.push(...requiredValidation.errors);
            result.valid = false;
        }

        // WordPress credentials validation
        if (config.username && config.appPassword) {
            const credentialsValidation = this.businessValidators.validateWordPressCredentials(
                config.username, 
                config.appPassword
            );
            if (!credentialsValidation.valid) {
                result.errors.push(...credentialsValidation.errors);
                result.valid = false;
            }
        }

        // URL validation
        if (config.url) {
            const urlValidation = await this.businessValidators.validateUrl(config.url, 'url');
            if (!urlValidation.valid) {
                result.errors.push(...urlValidation.errors);
                result.valid = false;
            } else {
                result.warnings.push(...urlValidation.errors.filter(e => e.severity === 'warning'));
            }

            // WordPress endpoint validation (if enabled)
            if (options.validateWordPressEndpoint !== false) {
                const wpValidation = await this.businessValidators.validateWordPressEndpoint(config.url);
                if (!wpValidation.valid) {
                    result.errors.push(...wpValidation.errors);
                    result.valid = false;
                } else {
                    result.warnings.push(...wpValidation.errors.filter(e => e.severity === 'warning'));
                }
            }
        }

        // Timeout validation (if present)
        if (config.timeout !== undefined) {
            const timeoutValidation = this.businessValidators.validateTimeout(config.timeout);
            if (!timeoutValidation.valid) {
                result.errors.push(...timeoutValidation.errors);
                result.valid = false;
            }
        }

        // Site ID uniqueness validation (if all configs provided)
        if (options.allConfigs && config.id) {
            const uniquenessValidation = this.businessValidators.validateSiteIdUniqueness(
                config.id, 
                options.allConfigs, 
                filePath
            );
            if (!uniquenessValidation.valid) {
                result.errors.push(...uniquenessValidation.errors);
                result.valid = false;
            }
        }

        return result;
    }

    formatErrors(errors, filePath = '') {
        return errors.map(error => {
            const fieldPath = error.instancePath || error.schemaPath;
            const message = this.getErrorMessage(error);
            
            return {
                file: filePath,
                field: fieldPath,
                message: message,
                value: error.data,
                schema: error.schema
            };
        });
    }

    getErrorMessage(error) {
        const field = error.instancePath ? error.instancePath.substring(1) : 'root';
        
        switch (error.keyword) {
            case 'required':
                return `Required field '${error.params.missingProperty}' is missing`;
            
            case 'type':
                return `Field '${field}' must be of type ${error.schema}`;
            
            case 'minLength':
                return `Field '${field}' must be at least ${error.schema} characters long`;
            
            case 'maxLength':
                return `Field '${field}' must be no more than ${error.schema} characters long`;
            
            case 'minItems':
                return `Field '${field}' must contain at least ${error.schema} items`;
            
            case 'maxItems':
                return `Field '${field}' must contain no more than ${error.schema} items`;
            
            case 'uniqueItems':
                return `Field '${field}' must contain unique items`;
            
            case 'pattern':
                return `Field '${field}' has invalid format: ${error.data}`;
            
            case 'format':
                return `Field '${field}' must be a valid ${error.schema} format`;
            
            case 'enum':
                return `Field '${field}' must be one of: ${error.schema.join(', ')}`;
            
            case 'additionalProperties':
                return `Field '${field}' contains additional properties not allowed in schema`;
            
            default:
                return `Field '${field}' validation failed: ${error.message}`;
        }
    }

    async validateAllConfigs(configDir, options = {}) {
        const results = {
            valid: true,
            totalFiles: 0,
            validFiles: 0,
            invalidFiles: 0,
            errors: [],
            warnings: [],
            info: []
        };

        if (!fs.existsSync(configDir)) {
            results.errors.push({
                file: configDir,
                field: 'directory',
                message: `Configuration directory does not exist: ${configDir}`,
                value: null,
                schema: null,
                severity: 'error',
                category: 'file_system'
            });
            results.valid = false;
            return results;
        }

        const files = fs.readdirSync(configDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        results.totalFiles = jsonFiles.length;

        // Load all configs for uniqueness validation
        const allConfigs = {};
        for (const file of jsonFiles) {
            const filePath = path.join(configDir, file);
            try {
                const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                allConfigs[file] = config;
            } catch (parseError) {
                // Will be handled in validation loop
            }
        }

        // Validate each config
        for (const file of jsonFiles) {
            const filePath = path.join(configDir, file);
            const siteId = file.replace('.json', '');
            
            try {
                const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const validationOptions = {
                    ...options,
                    allConfigs: allConfigs
                };
                
                const validation = await this.validateConfig(config, filePath, validationOptions);
                
                if (validation.valid) {
                    results.validFiles++;
                } else {
                    results.invalidFiles++;
                }
                
                results.errors.push(...validation.errors);
                results.warnings.push(...validation.warnings);
                results.info.push(...validation.info);
                
            } catch (parseError) {
                results.invalidFiles++;
                results.errors.push({
                    file: filePath,
                    field: 'json',
                    message: `Invalid JSON: ${parseError.message}`,
                    value: null,
                    schema: null,
                    severity: 'error',
                    category: 'json_parse'
                });
            }
        }

        if (results.invalidFiles > 0) {
            results.valid = false;
        }

        return results;
    }

    getSchema() {
        return this.schema;
    }

    getRequiredFields() {
        return this.schema.required || [];
    }

    getOptionalFields() {
        const allFields = Object.keys(this.schema.properties || {});
        const requiredFields = this.getRequiredFields();
        return allFields.filter(field => !requiredFields.includes(field));
    }
}

module.exports = SchemaValidator;
