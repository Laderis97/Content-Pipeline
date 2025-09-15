// Simple test for validation system
const SchemaValidator = require('./lib/validation/schema-validator');

async function testValidation() {
    try {
        console.log('Creating validator...');
        const validator = new SchemaValidator();
        console.log('✅ Validator created successfully');

        console.log('Testing basic validation...');
        const testConfig = {
            id: 'test-site',
            name: 'Test Site',
            url: 'https://example.com',
            username: 'admin',
            appPassword: 'abcd efgh ijkl mnop qrst uvwx',
            topics: ['test'],
            categories: ['Test'],
            tags: ['test'],
            status: 'active'
        };

        const result = await validator.validateConfig(testConfig, 'test.json', {
            enableBusinessValidation: false // Disable business validation for now
        });

        console.log('Validation result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testValidation();
