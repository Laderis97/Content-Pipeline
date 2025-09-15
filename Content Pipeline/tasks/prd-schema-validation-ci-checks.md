# PRD: Schema Validation and CI Checks for Site Configurations

## Introduction/Overview

Implement comprehensive validation for site configuration files (`config/sites/*.json`) with both JSON schema validation and business logic validation. This feature will prevent invalid configurations from being deployed and provide clear feedback to developers about configuration errors. The system will integrate validation into both pre-commit hooks and CI pipeline to ensure all configurations are valid before reaching production.

## Goals

1. Ensure all site configuration files follow a defined schema structure
2. Validate business logic rules for configuration values (URLs, timeouts, credentials)
3. Integrate validation into both pre-commit hooks and CI pipeline for comprehensive coverage
4. Provide clear, actionable error messages for invalid configurations
5. Prevent deployment of sites with invalid configurations to production

## User Stories

- As a developer, I want my configuration changes validated before commit so I catch errors early in the development process
- As a developer, I want clear error messages when my configuration is invalid so I can fix issues quickly without trial and error
- As a DevOps engineer, I want all configurations validated in CI so invalid configs never reach production environments
- As a content manager, I want to know why a site configuration is invalid so I can request proper fixes from the development team
- As a junior developer, I want validation to guide me on proper configuration structure so I don't break existing sites

## Functional Requirements

1. The system must validate JSON schema structure for all site configuration files in `config/sites/`
2. The system must validate business logic rules including:
   - Valid URLs for endpoints and WordPress sites
   - Reasonable timeout values (between 1-300 seconds)
   - Required fields are present and non-empty
   - Valid configuration combinations
3. The system must provide pre-commit hooks that run validation locally before commit
4. The system must integrate validation into GitHub Actions CI pipeline
5. The system must fail fast with clear error messages when validation fails
6. The system must validate all configuration files on every change (not just modified files)
7. The system must prevent commits with invalid configurations through pre-commit hooks
8. The system must prevent deployment of invalid configurations through CI gates
9. The system must provide validation summary in CI output with file-by-file results
10. The system must support validation of both new and existing configuration files
11. The system must validate against a centralized JSON schema definition
12. The system must provide detailed error messages with line numbers and field paths

## Non-Goals (Out of Scope)

- Support for YAML configuration format (JSON only for initial implementation)
- Auto-fixing of configuration issues (fail fast approach)
- Validation of only modified files (all configs validated every time)
- Configuration migration or transformation tools
- Runtime configuration validation (CI/pre-commit only)
- Configuration templates or generators

## Design Considerations

- Use JSON Schema Draft 7 for structure validation with comprehensive schema definitions
- Implement custom validation functions for business logic rules
- Use husky for pre-commit hook management and developer workflow integration
- Create reusable validation library for consistency across tools
- Design clear error message format with actionable guidance
- Consider validation performance for CI pipeline efficiency

## Technical Considerations

- Must integrate with existing `config/sites/` directory structure without breaking changes
- Must work with current GitHub Actions workflow and Node.js environment
- Should use Node.js validation libraries (ajv for JSON Schema, custom validators for business logic)
- Must be performant for CI pipeline execution (validate all configs in <30 seconds)
- Should provide both programmatic API and CLI interface
- Must handle edge cases like malformed JSON files gracefully

## Success Metrics

- 100% of commits have valid configurations (measured via CI pass rate)
- Zero invalid configurations deployed to production environments
- Reduced time spent debugging configuration issues (baseline vs. post-implementation)
- Developer satisfaction with error message clarity (survey feedback)
- Reduced support tickets related to configuration errors
- Mean time to fix configuration issues <15 minutes

## Open Questions

- Should validation support custom validation rules per site type or keep rules universal?
- How should we handle configuration validation for different environments (dev/staging/prod)?
- Should we provide a configuration validation API endpoint for real-time validation?
- What's the preferred approach for schema versioning as requirements evolve?
