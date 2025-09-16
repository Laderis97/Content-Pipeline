const SensitiveDataRedactor = require('./redaction');

describe('SensitiveDataRedactor', () => {
    let redactor;

    beforeEach(() => {
        redactor = new SensitiveDataRedactor();
    });

    describe('String Redaction', () => {
        test('should redact API keys in strings', () => {
            const input = 'api_key: sk-1234567890abcdef';
            const result = redactor.redactString(input);
            
            expect(result).toContain('api_key:');
            expect(result).not.toContain('sk-1234567890abcdef');
            expect(result).toContain('********');
        });

        test('should redact passwords in strings', () => {
            const input = 'password: secret123';
            const result = redactor.redactString(input);
            
            expect(result).toContain('password:');
            expect(result).not.toContain('secret123');
            expect(result).toContain('********');
        });

        test('should redact WordPress credentials', () => {
            const input = 'username: admin, app_password: abcd efgh ijkl mnop qrst uvwx';
            const result = redactor.redactString(input);
            
            expect(result).toContain('username:');
            expect(result).toContain('app_password:');
            expect(result).not.toContain('admin');
            expect(result).not.toContain('abcd efgh ijkl mnop qrst uvwx');
            expect(result).toContain('********');
        });

        test('should redact URLs with credentials', () => {
            const input = 'https://user:pass@example.com';
            const result = redactor.redactString(input);
            
            expect(result).toContain('https://');
            expect(result).not.toContain('user:pass');
            expect(result).toContain('********');
        });

        test('should not redact non-sensitive data', () => {
            const input = 'This is normal text with no sensitive data';
            const result = redactor.redactString(input);
            
            expect(result).toBe(input);
        });
    });

    describe('Object Redaction', () => {
        test('should redact sensitive keys in objects', () => {
            const input = {
                username: 'admin',
                password: 'secret123',
                apiKey: 'sk-1234567890abcdef',
                normalData: 'this is not sensitive'
            };
            
            const result = redactor.redactObject(input);
            
            expect(result.username).toBe('********');
            expect(result.password).toBe('********');
            expect(result.apiKey).toBe('********');
            expect(result.normalData).toBe('this is not sensitive');
        });

        test('should redact with custom sensitive keys', () => {
            const input = {
                customSecret: 'secret123',
                customToken: 'token456',
                normalField: 'not sensitive'
            };
            
            const result = redactor.redactObject(input, ['customSecret', 'customToken']);
            
            expect(result.customSecret).toBe('********');
            expect(result.customToken).toBe('********');
            expect(result.normalField).toBe('not sensitive');
        });

        test('should handle nested objects', () => {
            const input = {
                config: {
                    username: 'admin',
                    password: 'secret123'
                },
                data: 'normal data'
            };
            
            const result = redactor.redactObject(input);
            
            expect(result.config.username).toBe('********');
            expect(result.config.password).toBe('********');
            expect(result.data).toBe('normal data');
        });

        test('should handle arrays', () => {
            const input = [
                { username: 'admin', password: 'secret123' },
                { normalData: 'not sensitive' }
            ];
            
            const result = redactor.redactObject(input);
            
            expect(result[0].username).toBe('********');
            expect(result[0].password).toBe('********');
            expect(result[1].normalData).toBe('not sensitive');
        });

        test('should handle null and undefined values', () => {
            const input = {
                username: null,
                password: undefined,
                normalData: 'test'
            };
            
            const result = redactor.redactObject(input);
            
            expect(result.username).toBeNull();
            expect(result.password).toBeUndefined();
            expect(result.normalData).toBe('test');
        });
    });

    describe('Log Meta Redaction', () => {
        test('should redact log metadata', () => {
            const meta = {
                username: 'admin',
                password: 'secret123',
                apiKey: 'sk-1234567890abcdef',
                postTitle: 'Test Post',
                siteId: 'tech-blog'
            };
            
            const result = redactor.redactLogMeta(meta);
            
            expect(result.username).toBe('********');
            expect(result.password).toBe('********');
            expect(result.apiKey).toBe('********');
            expect(result.postTitle).toBe('Test Post');
            expect(result.siteId).toBe('tech-blog');
        });
    });

    describe('Custom Patterns', () => {
        test('should add custom redaction pattern', () => {
            const customPattern = /(custom[_-]?field)\s*[:=]\s*["']?([^"'\s]+)["']?/gi;
            redactor.addPattern(customPattern);
            
            const input = 'custom_field: sensitive_value';
            const result = redactor.redactString(input);
            
            expect(result).toContain('custom_field:');
            expect(result).not.toContain('sensitive_value');
            expect(result).toContain('********');
        });

        test('should remove custom redaction pattern', () => {
            const customPattern = /custom[_-]?field\s*[:=]\s*["']?([^"'\s]+)["']?/gi;
            redactor.addPattern(customPattern);
            redactor.removePattern(customPattern);
            
            const input = 'custom_field: sensitive_value';
            const result = redactor.redactString(input);
            
            expect(result).toBe(input);
        });

        test('should throw error for invalid pattern', () => {
            expect(() => {
                redactor.addPattern('invalid pattern');
            }).toThrow('Pattern must be a RegExp instance');
        });
    });

    describe('Configuration Options', () => {
        test('should use custom redaction character', () => {
            const customRedactor = new SensitiveDataRedactor({
                redactionChar: '#',
                redactionLength: 6
            });
            
            const input = 'password: secret123';
            const result = customRedactor.redactString(input);
            
            expect(result).toContain('######');
        });

        test('should preserve length when configured', () => {
            const customRedactor = new SensitiveDataRedactor({
                preserveLength: true,
                redactionChar: '*',
                redactionLength: 20
            });
            
            const input = 'password: secret123';
            const result = customRedactor.redactString(input);
            
            expect(result).toContain('*********'); // 9 characters for 'secret123'
        });
    });

    describe('Statistics', () => {
        test('should provide redaction statistics', () => {
            const stats = redactor.getStats();
            
            expect(stats.totalPatterns).toBeGreaterThan(0);
            expect(stats.customPatterns).toBe(0);
            expect(stats.defaultPatterns).toBeGreaterThan(0);
            expect(stats.redactionChar).toBe('*');
            expect(stats.redactionLength).toBe(8);
            expect(stats.preserveLength).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty strings', () => {
            const result = redactor.redactString('');
            expect(result).toBe('');
        });

        test('should handle empty objects', () => {
            const result = redactor.redactObject({});
            expect(result).toEqual({});
        });

        test('should handle non-string values in redactString', () => {
            const result = redactor.redactString(123);
            expect(result).toBe(123);
        });
    });
});
