// Mock uuid before requiring logger
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

const PipelineLogger = require('./logger');
const fs = require('fs');
const path = require('path');

describe('PipelineLogger', () => {
    let logger;
    let logDir;

    beforeEach(() => {
        logDir = path.join(process.cwd(), 'logs');
        // Ensure logs directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        logger = new PipelineLogger({
            service: 'test-service',
            environment: 'test'
        });
    });

    afterEach(async () => {
        if (logger) {
            await logger.close();
        }
    });

    describe('Basic Logging', () => {
        test('should log info messages', () => {
            // Test that the method doesn't throw
            expect(() => {
                logger.info('Test info message', { testData: 'hello' });
            }).not.toThrow();
        });

        test('should log warning messages', () => {
            expect(() => {
                logger.warn('Test warning message', { warningType: 'test' });
            }).not.toThrow();
        });

        test('should log error messages', () => {
            expect(() => {
                logger.error('Test error message', { errorCode: 'TEST_ERROR' });
            }).not.toThrow();
        });

        test('should log debug messages', () => {
            expect(() => {
                logger.debug('Test debug message', { debugInfo: 'detailed' });
            }).not.toThrow();
        });
    });

    describe('Pipeline-specific Logging', () => {
        test('should log pipeline messages', () => {
            expect(() => {
                logger.pipeline('Pipeline started', { pipelineId: 'test-123' });
            }).not.toThrow();
        });

        test('should log validation messages', () => {
            expect(() => {
                logger.validation('Validation completed', { validConfigs: 5 });
            }).not.toThrow();
        });

        test('should log generation messages', () => {
            expect(() => {
                logger.generation('Content generated', { wordCount: 500 });
            }).not.toThrow();
        });

        test('should log publishing messages', () => {
            expect(() => {
                logger.publishing('Post published', { postId: 12345 });
            }).not.toThrow();
        });
    });

    describe('Run ID Management', () => {
        test('should generate and return run ID', () => {
            const runId = logger.getRunId();
            expect(runId).toBeDefined();
            expect(typeof runId).toBe('string');
            expect(runId).toBe('mock-uuid-123');
        });

        test('should update run ID', () => {
            const newRunId = 'new-run-id-123';
            logger.setRunId(newRunId);
            expect(logger.getRunId()).toBe(newRunId);
        });
    });

    describe('Child Logger', () => {
        test('should create child logger with additional context', () => {
            const childLogger = logger.child({ 
                siteId: 'tech-blog',
                operation: 'content-generation'
            });
            
            expect(childLogger).toBeDefined();
            expect(childLogger.getRunId()).toBe(logger.getRunId());
        });

        test('should include additional context in child logger messages', () => {
            const childLogger = logger.child({ siteId: 'tech-blog' });
            
            expect(() => {
                childLogger.info('Child message', { additionalData: 'test' });
            }).not.toThrow();
        });
    });

    describe('Log File Creation', () => {
        test('should create log files in logs directory', () => {
            const logFiles = fs.readdirSync(logDir);
            expect(logFiles.length).toBeGreaterThan(0);
            expect(logFiles.some(file => file.includes('pipeline-'))).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle errors gracefully', () => {
            expect(() => {
                logger.error('Test error', { error: new Error('Test error') });
            }).not.toThrow();
        });
    });
});
