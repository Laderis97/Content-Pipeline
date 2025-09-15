// Site Configuration Schema Validator
// This module provides JSON Schema validation for site configurations

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

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
    }

    loadSchema() {
        const schemaPath = path.join(__dirname, 'site-config-schema.json');
        return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    }

    validateConfig(config, filePath = '') {
        const valid = this.validate(config);
        
        if (!valid) {
            const errors = this.formatErrors(this.validate.errors, filePath);
            return {
                valid: false,
                errors: errors
            };
        }

        return {
            valid: true,
            errors: []
        };
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

    validateAllConfigs(configDir) {
        const results = {
            valid: true,
            totalFiles: 0,
            validFiles: 0,
            invalidFiles: 0,
            errors: []
        };

        if (!fs.existsSync(configDir)) {
            results.errors.push({
                file: configDir,
                field: 'directory',
                message: `Configuration directory does not exist: ${configDir}`,
                value: null,
                schema: null
            });
            results.valid = false;
            return results;
        }

        const files = fs.readdirSync(configDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        results.totalFiles = jsonFiles.length;

        jsonFiles.forEach(file => {
            const filePath = path.join(configDir, file);
            const siteId = file.replace('.json', '');
            
            try {
                const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const validation = this.validateConfig(config, filePath);
                
                if (validation.valid) {
                    results.validFiles++;
                } else {
                    results.invalidFiles++;
                    results.errors.push(...validation.errors);
                }
            } catch (parseError) {
                results.invalidFiles++;
                results.errors.push({
                    file: filePath,
                    field: 'json',
                    message: `Invalid JSON: ${parseError.message}`,
                    value: null,
                    schema: null
                });
            }
        });

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
