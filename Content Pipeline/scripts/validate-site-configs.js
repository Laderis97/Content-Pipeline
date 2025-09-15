#!/usr/bin/env node
// Site Configuration Validation CLI Tool
// This script provides command-line validation for site configurations

const path = require('path');
const fs = require('fs');
const SchemaValidator = require('../lib/validation/schema-validator');

class ValidationCLI {
    constructor() {
        this.validator = new SchemaValidator();
        this.options = {
            format: 'human', // human, json, table
            verbose: false,
            warnings: true,
            info: false,
            validateWordPress: false,
            enableBusinessValidation: true
        };
    }

    async run() {
        const args = process.argv.slice(2);
        this.parseArguments(args);

        try {
            if (this.options.file) {
                await this.validateFile(this.options.file);
            } else if (this.options.directory) {
                await this.validateDirectory(this.options.directory);
            } else {
                // Default to config/sites directory
                await this.validateDirectory('./config/sites');
            }
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            process.exit(1);
        }
    }

    parseArguments(args) {
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            switch (arg) {
                case '--file':
                case '-f':
                    this.options.file = args[++i];
                    break;
                case '--directory':
                case '-d':
                    this.options.directory = args[++i];
                    break;
                case '--format':
                    this.options.format = args[++i];
                    break;
                case '--json':
                    this.options.format = 'json';
                    break;
                case '--table':
                    this.options.format = 'table';
                    break;
                case '--verbose':
                case '-v':
                    this.options.verbose = true;
                    break;
                case '--warnings':
                    this.options.warnings = true;
                    break;
                case '--no-warnings':
                    this.options.warnings = false;
                    break;
                case '--info':
                    this.options.info = true;
                    break;
                case '--wordpress':
                    this.options.validateWordPress = true;
                    break;
                case '--no-business':
                    this.options.enableBusinessValidation = false;
                    break;
                case '--help':
                case '-h':
                    this.showHelp();
                    process.exit(0);
                    break;
                default:
                    if (arg.startsWith('-')) {
                        console.error(`❌ Unknown option: ${arg}`);
                        this.showHelp();
                        process.exit(1);
                    }
                    break;
            }
        }
    }

    async validateFile(filePath) {
        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found: ${filePath}`);
            process.exit(1);
        }

        try {
            const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const result = await this.validator.validateConfig(config, filePath, this.options);
            
            this.displayResult(result, filePath);
            
            if (!result.valid) {
                process.exit(1);
            }
        } catch (error) {
            console.error(`❌ Error reading file ${filePath}:`, error.message);
            process.exit(1);
        }
    }

    async validateDirectory(dirPath) {
        const result = await this.validator.validateAllConfigs(dirPath, this.options);
        
        this.displayResult(result, dirPath);
        
        if (!result.valid) {
            process.exit(1);
        }
    }

    displayResult(result, target) {
        switch (this.options.format) {
            case 'json':
                this.displayJSON(result);
                break;
            case 'table':
                this.displayTable(result, target);
                break;
            default:
                this.displayHuman(result, target);
                break;
        }
    }

    displayHuman(result, target) {
        console.log(`\n🔍 Validating: ${target}`);
        console.log('=' * 50);

        if (result.totalFiles !== undefined) {
            console.log(`📊 Summary:`);
            console.log(`   Total files: ${result.totalFiles}`);
            console.log(`   Valid files: ${result.validFiles}`);
            console.log(`   Invalid files: ${result.invalidFiles}`);
            console.log(`   Errors: ${result.errors.length}`);
            console.log(`   Warnings: ${result.warnings.length}`);
            console.log(`   Info: ${result.info.length}`);
            console.log('');
        }

        // Display errors
        if (result.errors.length > 0) {
            console.log('❌ Errors:');
            result.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.field ? `[${error.field}] ` : ''}${error.message}`);
                if (this.options.verbose && error.value !== null) {
                    console.log(`      Value: ${JSON.stringify(error.value)}`);
                }
                if (error.suggestion) {
                    console.log(`      💡 ${error.suggestion}`);
                }
                if (error.file) {
                    console.log(`      📁 ${error.file}`);
                }
                console.log('');
            });
        }

        // Display warnings
        if (this.options.warnings && result.warnings.length > 0) {
            console.log('⚠️  Warnings:');
            result.warnings.forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning.field ? `[${warning.field}] ` : ''}${warning.message}`);
                if (this.options.verbose && warning.value !== null) {
                    console.log(`      Value: ${JSON.stringify(warning.value)}`);
                }
                if (warning.suggestion) {
                    console.log(`      💡 ${warning.suggestion}`);
                }
                console.log('');
            });
        }

        // Display info
        if (this.options.info && result.info.length > 0) {
            console.log('ℹ️  Info:');
            result.info.forEach((info, index) => {
                console.log(`   ${index + 1}. ${info.field ? `[${info.field}] ` : ''}${info.message}`);
                console.log('');
            });
        }

        // Final status
        if (result.valid) {
            console.log('✅ All validations passed!');
        } else {
            console.log('❌ Validation failed!');
        }
    }

    displayJSON(result) {
        console.log(JSON.stringify(result, null, 2));
    }

    displayTable(result, target) {
        console.log(`\n📋 Validation Results for: ${target}`);
        console.log('=' * 60);

        if (result.totalFiles !== undefined) {
            console.log(`Files: ${result.validFiles}/${result.totalFiles} valid`);
            console.log(`Errors: ${result.errors.length} | Warnings: ${result.warnings.length} | Info: ${result.info.length}`);
            console.log('');
        }

        // Group errors by file
        const errorsByFile = {};
        [...result.errors, ...result.warnings, ...result.info].forEach(item => {
            const file = item.file || 'unknown';
            if (!errorsByFile[file]) {
                errorsByFile[file] = { errors: [], warnings: [], info: [] };
            }
            
            if (item.severity === 'error') {
                errorsByFile[file].errors.push(item);
            } else if (item.severity === 'warning') {
                errorsByFile[file].warnings.push(item);
            } else {
                errorsByFile[file].info.push(item);
            }
        });

        Object.keys(errorsByFile).forEach(file => {
            const fileErrors = errorsByFile[file];
            console.log(`\n📁 ${file}`);
            console.log('-'.repeat(40));

            fileErrors.errors.forEach((error, index) => {
                console.log(`❌ ${index + 1}. [${error.field || 'root'}] ${error.message}`);
            });

            if (this.options.warnings) {
                fileErrors.warnings.forEach((warning, index) => {
                    console.log(`⚠️  ${index + 1}. [${warning.field || 'root'}] ${warning.message}`);
                });
            }

            if (this.options.info) {
                fileErrors.info.forEach((info, index) => {
                    console.log(`ℹ️  ${index + 1}. [${info.field || 'root'}] ${info.message}`);
                });
            }
        });
    }

    showHelp() {
        console.log(`
🔍 Site Configuration Validator

Usage:
  node scripts/validate-site-configs.js [options]

Options:
  -f, --file <path>           Validate specific file
  -d, --directory <path>      Validate directory (default: ./config/sites)
  --format <format>           Output format: human, json, table (default: human)
  --json                      Output in JSON format
  --table                     Output in table format
  -v, --verbose               Show detailed information
  --warnings                  Show warnings (default: true)
  --no-warnings               Hide warnings
  --info                      Show info messages
  --wordpress                 Validate WordPress endpoints
  --no-business               Disable business logic validation
  -h, --help                  Show this help

Examples:
  node scripts/validate-site-configs.js
  node scripts/validate-site-configs.js --file config/sites/health-wellness.json
  node scripts/validate-site-configs.js --directory ./config/sites --verbose
  node scripts/validate-site-configs.js --json --wordpress
  node scripts/validate-site-configs.js --table --warnings --info

Exit Codes:
  0 - All validations passed
  1 - Validation failed or error occurred
        `);
    }
}

// Run CLI if called directly
if (require.main === module) {
    const cli = new ValidationCLI();
    cli.run().catch(error => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = ValidationCLI;
