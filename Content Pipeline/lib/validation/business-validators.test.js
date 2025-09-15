// Tests for Business Logic Validators

const BusinessValidators = require('./business-validators');

describe('BusinessValidators', () => {
    let validators;

    beforeEach(() => {
        validators = new BusinessValidators();
    });

    describe('validateUrl', () => {
        test('should validate correct HTTP URL', async () => {
            const result = await validators.validateUrl('http://example.com');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should validate correct HTTPS URL', async () => {
            const result = await validators.validateUrl('https://example.com');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject invalid URL format', async () => {
            const result = await validators.validateUrl('not-a-url');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('Invalid URL format');
            expect(result.errors[0].severity).toBe('error');
            expect(result.errors[0].category).toBe('format');
        });

        test('should reject non-HTTP protocols', async () => {
            const result = await validators.validateUrl('ftp://example.com');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('URL must use HTTP or HTTPS protocol');
            expect(result.errors[0].severity).toBe('error');
        });

        test('should handle inaccessible URLs gracefully', async () => {
            const result = await validators.validateUrl('http://nonexistent-domain-12345.com');
            expect(result.valid).toBe(true); // Format is valid
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].severity).toBe('warning');
            expect(result.errors[0].category).toBe('connectivity');
        });
    });

    describe('validateWordPressEndpoint', () => {
        test('should validate accessible WordPress site', async () => {
            // Mock a successful WordPress API response
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    name: 'Test Site',
                    description: 'A test WordPress site'
                })
            });

            const result = await validators.validateWordPressEndpoint('https://example.com');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject non-WordPress site', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    name: 'Not WordPress',
                    description: 'This is not WordPress'
                })
            });

            const result = await validators.validateWordPressEndpoint('https://example.com');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('does not appear to be a WordPress site');
            expect(result.errors[0].severity).toBe('warning');
        });

        test('should handle API errors', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            const result = await validators.validateWordPressEndpoint('https://example.com');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('WordPress REST API not accessible');
            expect(result.errors[0].severity).toBe('error');
        });

        test('should handle network errors', async () => {
            global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

            const result = await validators.validateWordPressEndpoint('https://example.com');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('WordPress API check failed');
            expect(result.errors[0].severity).toBe('error');
        });
    });

    describe('validateTimeout', () => {
        test('should validate correct timeout values', () => {
            const result = validators.validateTimeout(30);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject non-numeric timeout', () => {
            const result = validators.validateTimeout('not-a-number');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('Timeout must be a valid number');
            expect(result.errors[0].severity).toBe('error');
        });

        test('should reject timeout less than 1 second', () => {
            const result = validators.validateTimeout(0.5);
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('Timeout must be at least 1 second');
            expect(result.errors[0].severity).toBe('error');
        });

        test('should reject timeout greater than 300 seconds', () => {
            const result = validators.validateTimeout(301);
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('Timeout must not exceed 300 seconds');
            expect(result.errors[0].severity).toBe('error');
        });

        test('should accept boundary values', () => {
            const result1 = validators.validateTimeout(1);
            expect(result1.valid).toBe(true);

            const result2 = validators.validateTimeout(300);
            expect(result2.valid).toBe(true);
        });
    });

    describe('validateRequiredFields', () => {
        test('should validate all required fields present', () => {
            const config = {
                id: 'test-site',
                name: 'Test Site',
                url: 'https://example.com',
                topics: ['test'],
                categories: ['Test'],
                tags: ['test']
            };
            const requiredFields = ['id', 'name', 'url', 'topics', 'categories', 'tags'];

            const result = validators.validateRequiredFields(config, requiredFields);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject missing required fields', () => {
            const config = {
                id: 'test-site',
                name: 'Test Site'
                // Missing required fields
            };
            const requiredFields = ['id', 'name', 'url', 'topics'];

            const result = validators.validateRequiredFields(config, requiredFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(2);
            expect(result.errors[0].message).toContain('Required field \'url\' is missing');
            expect(result.errors[1].message).toContain('Required field \'topics\' is missing');
        });

        test('should reject null or undefined values', () => {
            const config = {
                id: 'test-site',
                name: null,
                url: undefined,
                topics: ['test']
            };
            const requiredFields = ['id', 'name', 'url', 'topics'];

            const result = validators.validateRequiredFields(config, requiredFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(2);
            expect(result.errors[0].message).toContain('Required field \'name\' cannot be null or undefined');
            expect(result.errors[1].message).toContain('Required field \'url\' cannot be null or undefined');
        });

        test('should reject empty string values', () => {
            const config = {
                id: 'test-site',
                name: '   ', // Empty after trim
                url: 'https://example.com',
                topics: ['test']
            };
            const requiredFields = ['id', 'name', 'url', 'topics'];

            const result = validators.validateRequiredFields(config, requiredFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('Required field \'name\' cannot be empty');
        });

        test('should reject empty arrays', () => {
            const config = {
                id: 'test-site',
                name: 'Test Site',
                url: 'https://example.com',
                topics: [] // Empty array
            };
            const requiredFields = ['id', 'name', 'url', 'topics'];

            const result = validators.validateRequiredFields(config, requiredFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('Required field \'topics\' cannot be an empty array');
        });
    });

    describe('validateWordPressCredentials', () => {
        test('should validate correct credentials', () => {
            const result = validators.validateWordPressCredentials(
                'admin',
                'abcd efgh ijkl mnop qrst uvwx'
            );
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject missing username', () => {
            const result = validators.validateWordPressCredentials(
                null,
                'abcd efgh ijkl mnop qrst uvwx'
            );
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('WordPress username is required');
            expect(result.errors[0].severity).toBe('error');
        });

        test('should reject short username', () => {
            const result = validators.validateWordPressCredentials(
                'ab',
                'abcd efgh ijkl mnop qrst uvwx'
            );
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('WordPress username must be at least 3 characters long');
        });

        test('should reject invalid username characters', () => {
            const result = validators.validateWordPressCredentials(
                'admin@user',
                'abcd efgh ijkl mnop qrst uvwx'
            );
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('WordPress username contains invalid characters');
        });

        test('should reject missing app password', () => {
            const result = validators.validateWordPressCredentials('admin', null);
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('WordPress application password is required');
        });

        test('should reject invalid app password format', () => {
            const result = validators.validateWordPressCredentials(
                'admin',
                'invalid-password-format'
            );
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('WordPress application password has invalid format');
        });
    });

    describe('validateSiteIdUniqueness', () => {
        test('should validate unique site ID', () => {
            const allConfigs = {
                'site1.json': { id: 'site1' },
                'site2.json': { id: 'site2' }
            };

            const result = validators.validateSiteIdUniqueness('site3', allConfigs, 'site3.json');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject duplicate site ID', () => {
            const allConfigs = {
                'site1.json': { id: 'site1' },
                'site2.json': { id: 'site2' }
            };

            const result = validators.validateSiteIdUniqueness('site1', allConfigs, 'site3.json');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('Site ID \'site1\' is already used in: site1.json');
            expect(result.errors[0].severity).toBe('error');
        });

        test('should ignore current file when checking uniqueness', () => {
            const allConfigs = {
                'site1.json': { id: 'site1' },
                'site2.json': { id: 'site2' }
            };

            const result = validators.validateSiteIdUniqueness('site1', allConfigs, 'site1.json');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('utility methods', () => {
        test('should clear cache', () => {
            validators.urlCache.set('test', { accessible: true, timestamp: Date.now() });
            expect(validators.urlCache.size).toBe(1);
            
            validators.clearCache();
            expect(validators.urlCache.size).toBe(0);
        });

        test('should set timeout', () => {
            validators.setTimeout(10000);
            expect(validators.timeout).toBe(10000);
        });
    });
});
