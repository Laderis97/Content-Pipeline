const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class PipelineLogger {
    constructor(options = {}) {
        this.runId = options.runId || uuidv4();
        this.service = options.service || 'content-pipeline';
        this.environment = options.environment || process.env.NODE_ENV || 'development';
        
        // Custom log levels for pipeline-specific events
        const customLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            pipeline: 4,    // Pipeline-specific events
            validation: 5,  // Validation events
            generation: 6,  // Content generation events
            publishing: 7   // Publishing events
        };

        const customColors = {
            error: 'red',
            warn: 'yellow',
            info: 'green',
            debug: 'blue',
            pipeline: 'cyan',
            validation: 'magenta',
            generation: 'green',
            publishing: 'blue'
        };

        winston.addColors(customColors);

        // Create formatters
        const jsonFormatter = winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        );

        const consoleFormatter = winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, runId, service, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${runId}] ${level}: ${message} ${metaStr}`;
            })
        );

        // Create transports
        const transports = [];

        // Console transport for development
        if (this.environment !== 'production') {
            transports.push(
                new winston.transports.Console({
                    level: 'debug',
                    format: consoleFormatter
                })
            );
        }

        // File transport for all environments
        const logDir = path.join(process.cwd(), 'logs');
        transports.push(
            new DailyRotateFile({
                filename: path.join(logDir, 'pipeline-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '14d',
                level: 'debug',
                format: jsonFormatter
            })
        );

        // Error-specific file transport
        transports.push(
            new DailyRotateFile({
                filename: path.join(logDir, 'pipeline-error-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '30d',
                level: 'error',
                format: jsonFormatter
            })
        );

        // Create logger instance
        this.logger = winston.createLogger({
            levels: customLevels,
            level: options.level || 'info',
            transports,
            defaultMeta: {
                runId: this.runId,
                service: this.service,
                environment: this.environment
            }
        });
    }

    // Standard logging methods
    error(message, meta = {}) {
        this.logger.error(message, this._enrichMeta(meta));
    }

    warn(message, meta = {}) {
        this.logger.warn(message, this._enrichMeta(meta));
    }

    info(message, meta = {}) {
        this.logger.info(message, this._enrichMeta(meta));
    }

    debug(message, meta = {}) {
        this.logger.debug(message, this._enrichMeta(meta));
    }

    // Pipeline-specific logging methods
    pipeline(message, meta = {}) {
        this.logger.log('pipeline', message, this._enrichMeta(meta));
    }

    validation(message, meta = {}) {
        this.logger.log('validation', message, this._enrichMeta(meta));
    }

    generation(message, meta = {}) {
        this.logger.log('generation', message, this._enrichMeta(meta));
    }

    publishing(message, meta = {}) {
        this.logger.log('publishing', message, this._enrichMeta(meta));
    }

    // Utility methods
    _enrichMeta(meta) {
        return {
            ...meta,
            runId: this.runId,
            service: this.service,
            environment: this.environment,
            timestamp: new Date().toISOString()
        };
    }

    // Create child logger with additional context
    child(additionalMeta = {}) {
        const childLogger = new PipelineLogger({
            runId: this.runId,
            service: this.service,
            environment: this.environment
        });
        
        // Override _enrichMeta to include additional context
        const originalEnrich = childLogger._enrichMeta.bind(childLogger);
        childLogger._enrichMeta = (meta) => {
            return originalEnrich({ ...additionalMeta, ...meta });
        };
        
        return childLogger;
    }

    // Get current run ID
    getRunId() {
        return this.runId;
    }

    // Update run ID (useful for long-running processes)
    setRunId(newRunId) {
        this.runId = newRunId;
        this.logger.defaultMeta.runId = newRunId;
    }

    // Close logger (useful for graceful shutdown)
    close() {
        return new Promise((resolve) => {
            this.logger.on('finish', resolve);
            this.logger.end();
        });
    }
}

module.exports = PipelineLogger;
