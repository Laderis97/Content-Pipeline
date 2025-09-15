// Tests for Site Configuration Schema Validator

const SchemaValidator = require('./schema-validator');
const path = require('path');

describe('SchemaValidator', () => {
    let validator;

    beforeEach(() => {
        validator = new SchemaValidator();
    });

    describe('validateConfig', () => {
        test('should validate a correct configuration', () => {
            const validConfig = {
                id: 'test-site',
                name: 'Test Site',
                url: 'https://example.com',
                username: 'admin',
                appPassword: 'abcd efgh ijkl mnop qrst uvwx',
                topics: ['test', 'example'],
                categories: ['Test', 'Example'],
                tags: ['test', 'example'],
                status: 'active'
            };

            const result = validator.validateConfig(validConfig);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject configuration with missing required fields', () => {
            const invalidConfig = {
                id: 'test-site',
                name: 'Test Site'
                // Missing required fields
            };

            const result = validator.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(error => error.message.includes('Required field'))).toBe(true);
        });

        test('should reject configuration with invalid field types', () => {
            const invalidConfig = {
                id: 'test-site',
                name: 'Test Site',
                url: 'https://example.com',
                username: 'admin',
                appPassword: 'abcd efgh ijkl mnop qrst uvwx',
                topics: 'not-an-array', // Should be array
                categories: ['Test'],
                tags: ['test'],
                status: 'active'
            };

            const result = validator.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(error => error.message.includes('must be of type'))).toBe(true);
        });

        test('should reject configuration with invalid field formats', () => {
            const invalidConfig = {
                id: 'test-site',
                name: 'Test Site',
                url: 'not-a-url', // Invalid URL format
                username: 'admin',
                appPassword: 'invalid-password-format', // Invalid app password format
                topics: ['test'],
                categories: ['Test'],
                tags: ['test'],
                status: 'active'
            };

            const result = validator.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(error => error.message.includes('format'))).toBe(true);
        });

        test('should reject configuration with invalid enum values', () => {
            const invalidConfig = {
                id: 'test-site',
                name: 'Test Site',
                url: 'https://example.com',
                username: 'admin',
                appPassword: 'abcd efgh ijkl mnop qrst uvwx',
                topics: ['test'],
                categories: ['Test'],
                tags: ['test'],
                status: 'invalid-status' // Invalid enum value
            };

            const result = validator.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(error => error.message.includes('must be one of'))).toBe(true);
        });

        test('should reject configuration with empty arrays', () => {
            const invalidConfig = {
                id: 'test-site',
                name: 'Test Site',
                url: 'https://example.com',
                username: 'admin',
                appPassword: 'abcd efgh ijkl mnop qrst uvwx',
                topics: [], // Empty array
                categories: [], // Empty array
                tags: [], // Empty array
                status: 'active'
            };

            const result = validator.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(error => error.message.includes('must contain at least'))).toBe(true);
        });

        test('should reject configuration with duplicate array items', () => {
            const invalidConfig = {
                id: 'test-site',
                name: 'Test Site',
                url: 'https://example.com',
                username: 'admin',
                appPassword: 'abcd efgh ijkl mnop qrst uvwx',
                topics: ['test', 'test'], // Duplicate items
                categories: ['Test'],
                tags: ['test'],
                status: 'active'
            };

            const result = validator.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(error => error.message.includes('unique items'))).toBe(true);
        });

        test('should reject configuration with invalid string patterns', () => {
            const invalidConfig = {
                id: 'Test-Site', // Invalid pattern (uppercase)
                name: 'Test Site',
                url: 'https://example.com',
                username: 'admin',
                appPassword: 'abcd efgh ijkl mnop qrst uvwx',
                topics: ['test'],
                categories: ['Test'],
                tags: ['Test-Tag'], // Invalid pattern (uppercase)
                status: 'active'
            };

            const result = validator.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(error => error.message.includes('invalid format'))).toBe(true);
        });
    });

    describe('validateAllConfigs', () => {
        test('should validate all configuration files in directory', () => {
            const configDir = path.join(__dirname, '..', '..', 'config', 'sites');
            const result = validator.validateAllConfigs(configDir);
            
            expect(result).toHaveProperty('valid');
            expect(result).toHaveProperty('totalFiles');
            expect(result).toHaveProperty('validFiles');
            expect(result).toHaveProperty('invalidFiles');
            expect(result).toHaveProperty('errors');
            expect(Array.isArray(result.errors)).toBe(true);
        });

        test('should handle non-existent directory', () => {
            const result = validator.validateAllConfigs('/non/existent/directory');
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].message).toContain('does not exist');
        });
    });

    describe('getSchema', () => {
        test('should return the loaded schema', () => {
            const schema = validator.getSchema();
            expect(schema).toBeDefined();
            expect(schema.type).toBe('object');
            expect(schema.required).toBeDefined();
            expect(schema.properties).toBeDefined();
        });
    });

    describe('getRequiredFields', () => {
        test('should return list of required fields', () => {
            const requiredFields = validator.getRequiredFields();
            expect(Array.isArray(requiredFields)).toBe(true);
            expect(requiredFields).toContain('id');
            expect(requiredFields).toContain('name');
            expect(requiredFields).toContain('url');
            expect(requiredFields).toContain('username');
            expect(requiredFields).toContain('appPassword');
            expect(requiredFields).toContain('topics');
            expect(requiredFields).toContain('categories');
            expect(requiredFields).toContain('tags');
            expect(requiredFields).toContain('status');
        });
    });

    describe('getOptionalFields', () => {
        test('should return list of optional fields', () => {
            const optionalFields = validator.getOptionalFields();
            expect(Array.isArray(optionalFields)).toBe(true);
            expect(optionalFields).toContain('description');
            expect(optionalFields).toContain('lastUpdated');
        });
    });

    describe('error formatting', () => {
        test('should format errors with proper field paths and messages', () => {
            const invalidConfig = {
                id: 'test-site',
                name: 'Test Site',
                url: 'not-a-url',
                username: 'admin',
                appPassword: 'invalid-format',
                topics: ['test'],
                categories: ['Test'],
                tags: ['test'],
                status: 'active'
            };

            const result = validator.validateConfig(invalidConfig, '/path/to/file.json');
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            result.errors.forEach(error => {
                expect(error).toHaveProperty('file');
                expect(error).toHaveProperty('field');
                expect(error).toHaveProperty('message');
                expect(error).toHaveProperty('value');
                expect(error).toHaveProperty('schema');
            });
        });
    });
});
