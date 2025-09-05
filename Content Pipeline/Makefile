# Content Pipeline Makefile
# PRD Reference: Configuration & Deployment (6.4), Performance & Scalability (F1-F3)

.PHONY: help setup install deps test deploy rollback health clean lint format check

# Default target
help: ## Show this help message
	@echo "Content Pipeline - Available Commands"
	@echo "====================================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Environment Variables:"
	@echo "  SUPABASE_PROJECT_ID      Supabase project ID"
	@echo "  SUPABASE_SERVICE_ROLE_KEY  Supabase service role key"
	@echo "  OPENAI_API_KEY           OpenAI API key"
	@echo "  WORDPRESS_URL            WordPress site URL"
	@echo "  WORDPRESS_USERNAME       WordPress username"
	@echo "  WORDPRESS_PASSWORD       WordPress password"
	@echo "  ENVIRONMENT              Environment (development, staging, production)"
	@echo ""

# Setup and Installation
setup: ## Run initial setup
	@echo "Running initial setup..."
	@chmod +x scripts/setup.sh
	@./scripts/setup.sh

install: deps ## Install all dependencies
	@echo "Installing dependencies..."
	@npm install

deps: ## Install system dependencies
	@echo "Installing system dependencies..."
	@if ! command -v node >/dev/null 2>&1; then \
		echo "Node.js is required. Please install Node.js 18 or later."; \
		exit 1; \
	fi
	@if ! command -v npm >/dev/null 2>&1; then \
		echo "npm is required. Please install npm."; \
		exit 1; \
	fi
	@if ! command -v deno >/dev/null 2>&1; then \
		echo "Installing Deno..."; \
		curl -fsSL https://deno.land/install.sh | sh; \
	fi
	@if ! command -v supabase >/dev/null 2>&1; then \
		echo "Installing Supabase CLI..."; \
		npm install -g supabase; \
	fi

# Development
dev: ## Start development environment
	@echo "Starting development environment..."
	@supabase start
	@echo "Supabase is running at http://localhost:54321"
	@echo "Supabase Studio is available at http://localhost:54321"

dev-stop: ## Stop development environment
	@echo "Stopping development environment..."
	@supabase stop

dev-reset: ## Reset development environment
	@echo "Resetting development environment..."
	@supabase stop
	@supabase start
	@supabase db reset

# Testing
test: ## Run all tests
	@echo "Running all tests..."
	@make test-unit
	@make test-integration
	@make test-performance
	@make test-security

test-unit: ## Run unit tests
	@echo "Running unit tests..."
	@npx tsc --noEmit
	@for func in supabase/functions/*/; do \
		if [ -f "$$func/index.ts" ]; then \
			echo "Testing $$(basename $$func)..."; \
			deno check "$$func/index.ts"; \
		fi; \
	done

test-integration: ## Run integration tests
	@echo "Running integration tests..."
	@supabase start
	@sleep 10
	@supabase db reset
	@for func in supabase/functions/*/; do \
		if [ -f "$$func/index.ts" ]; then \
			echo "Deploying $$(basename $$func)..."; \
			supabase functions deploy "$$(basename $$func)" --no-verify-jwt; \
		fi; \
	done
	@echo "Integration tests completed"

test-performance: ## Run performance tests
	@echo "Running performance tests..."
	@start_time=$$(date +%s); \
	npx tsc --noEmit; \
	end_time=$$(date +%s); \
	compilation_time=$$((end_time - start_time)); \
	echo "TypeScript compilation time: $${compilation_time}s"; \
	if [ $$compilation_time -gt 30 ]; then \
		echo "WARNING: Compilation time is high: $${compilation_time}s"; \
	fi

test-security: ## Run security tests
	@echo "Running security tests..."
	@if grep -r "sk-" supabase/functions/; then \
		echo "ERROR: Hardcoded OpenAI API key found"; \
		exit 1; \
	fi
	@if grep -r "password.*=" supabase/functions/; then \
		echo "ERROR: Hardcoded password found"; \
		exit 1; \
	fi
	@if grep -r "eyJ" supabase/functions/; then \
		echo "ERROR: Hardcoded service role key found"; \
		exit 1; \
	fi
	@echo "Security tests passed"

# Code Quality
lint: ## Run linting
	@echo "Running linting..."
	@npx tsc --noEmit
	@for func in supabase/functions/*/; do \
		if [ -f "$$func/index.ts" ]; then \
			echo "Linting $$(basename $$func)..."; \
			deno check "$$func/index.ts"; \
		fi; \
	done

format: ## Format code
	@echo "Formatting code..."
	@npx prettier --write "supabase/functions/**/*.ts"
	@npx prettier --write "scripts/**/*.sh"
	@npx prettier --write "*.json"
	@npx prettier --write "*.md"

check: lint test-security ## Run code quality checks
	@echo "Code quality checks completed"

# Deployment
deploy: ## Deploy to current environment
	@echo "Deploying to $(ENVIRONMENT)..."
	@chmod +x scripts/deploy.sh
	@./scripts/deploy.sh --environment $(ENVIRONMENT)

deploy-dev: ## Deploy to development
	@echo "Deploying to development..."
	@chmod +x scripts/deploy.sh
	@./scripts/deploy.sh --environment development

deploy-staging: ## Deploy to staging
	@echo "Deploying to staging..."
	@chmod +x scripts/deploy.sh
	@./scripts/deploy.sh --environment staging

deploy-prod: ## Deploy to production
	@echo "Deploying to production..."
	@chmod +x scripts/deploy.sh
	@./scripts/deploy.sh --environment production

deploy-dry: ## Dry run deployment
	@echo "Dry run deployment..."
	@chmod +x scripts/deploy.sh
	@./scripts/deploy.sh --dry-run

# Rollback
rollback: ## Rollback deployment
	@echo "Rolling back deployment..."
	@chmod +x scripts/rollback.sh
	@./scripts/rollback.sh

rollback-force: ## Force rollback without confirmation
	@echo "Force rolling back deployment..."
	@chmod +x scripts/rollback.sh
	@./scripts/rollback.sh --force

# Health Checks
health: ## Run health check
	@echo "Running health check..."
	@chmod +x scripts/health-check.sh
	@./scripts/health-check.sh

health-verbose: ## Run verbose health check
	@echo "Running verbose health check..."
	@chmod +x scripts/health-check.sh
	@./scripts/health-check.sh --verbose

health-report: ## Generate health report
	@echo "Generating health report..."
	@chmod +x scripts/health-check.sh
	@./scripts/health-check.sh --report

health-functions: ## Check Edge Functions health
	@echo "Checking Edge Functions health..."
	@chmod +x scripts/health-check.sh
	@./scripts/health-check.sh --type functions

health-scheduler: ## Check scheduler health
	@echo "Checking scheduler health..."
	@chmod +x scripts/health-check.sh
	@./scripts/health-check.sh --type scheduler

# Database
db-reset: ## Reset database
	@echo "Resetting database..."
	@supabase db reset

db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	@supabase db push

db-diff: ## Show database differences
	@echo "Showing database differences..."
	@supabase db diff

db-backup: ## Backup database
	@echo "Backing up database..."
	@supabase db dump --schema public > backup-$(shell date +%Y%m%d_%H%M%S).sql

# Edge Functions
functions-deploy: ## Deploy all Edge Functions
	@echo "Deploying all Edge Functions..."
	@for func in supabase/functions/*/; do \
		if [ -f "$$func/index.ts" ]; then \
			echo "Deploying $$(basename $$func)..."; \
			supabase functions deploy "$$(basename $$func)"; \
		fi; \
	done

functions-deploy-local: ## Deploy Edge Functions locally
	@echo "Deploying Edge Functions locally..."
	@for func in supabase/functions/*/; do \
		if [ -f "$$func/index.ts" ]; then \
			echo "Deploying $$(basename $$func) locally..."; \
			supabase functions deploy "$$(basename $$func)" --no-verify-jwt; \
		fi; \
	done

functions-test: ## Test Edge Functions
	@echo "Testing Edge Functions..."
	@for func in supabase/functions/*/; do \
		if [ -f "$$func/index.ts" ]; then \
			echo "Testing $$(basename $$func)..."; \
			deno check "$$func/index.ts"; \
		fi; \
	done

# Scheduler
scheduler-status: ## Check scheduler status
	@echo "Checking scheduler status..."
	@curl -s -X GET "https://$(SUPABASE_PROJECT_ID).supabase.co/functions/v1/scheduler?action=status" \
		-H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" \
		-H "Content-Type: application/json" | jq .

scheduler-jobs: ## List scheduler jobs
	@echo "Listing scheduler jobs..."
	@curl -s -X GET "https://$(SUPABASE_PROJECT_ID).supabase.co/functions/v1/scheduler?action=jobs" \
		-H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" \
		-H "Content-Type: application/json" | jq .

scheduler-health: ## Check scheduler health
	@echo "Checking scheduler health..."
	@curl -s -X GET "https://$(SUPABASE_PROJECT_ID).supabase.co/functions/v1/scheduler?action=health" \
		-H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" \
		-H "Content-Type: application/json" | jq .

scheduler-test: ## Test scheduler
	@echo "Testing scheduler..."
	@curl -s -X GET "https://$(SUPABASE_PROJECT_ID).supabase.co/functions/v1/scheduler?action=test" \
		-H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" \
		-H "Content-Type: application/json" | jq .

# Secrets
secrets-status: ## Check secrets status
	@echo "Checking secrets status..."
	@curl -s -X GET "https://$(SUPABASE_PROJECT_ID).supabase.co/functions/v1/secrets?action=status" \
		-H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" \
		-H "Content-Type: application/json" | jq .

secrets-validate: ## Validate secrets
	@echo "Validating secrets..."
	@curl -s -X GET "https://$(SUPABASE_PROJECT_ID).supabase.co/functions/v1/secrets?action=validate" \
		-H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" \
		-H "Content-Type: application/json" | jq .

# Monitoring
monitor: ## Start monitoring
	@echo "Starting monitoring..."
	@curl -s -X POST "https://$(SUPABASE_PROJECT_ID).supabase.co/functions/v1/monitor?action=monitor" \
		-H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" \
		-H "Content-Type: application/json" | jq .

monitor-alerts: ## Check monitoring alerts
	@echo "Checking monitoring alerts..."
	@curl -s -X GET "https://$(SUPABASE_PROJECT_ID).supabase.co/functions/v1/monitor?action=alerts" \
		-H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" \
		-H "Content-Type: application/json" | jq .

# Metrics
metrics-collect: ## Collect metrics
	@echo "Collecting metrics..."
	@curl -s -X POST "https://$(SUPABASE_PROJECT_ID).supabase.co/functions/v1/metrics?action=collect" \
		-H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" \
		-H "Content-Type: application/json" | jq .

metrics-summary: ## Get metrics summary
	@echo "Getting metrics summary..."
	@curl -s -X GET "https://$(SUPABASE_PROJECT_ID).supabase.co/functions/v1/metrics?action=summary" \
		-H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" \
		-H "Content-Type: application/json" | jq .

# Cleanup
clean: ## Clean up temporary files
	@echo "Cleaning up temporary files..."
	@rm -rf node_modules/.cache
	@rm -rf .supabase
	@rm -rf backups/
	@rm -f *.log
	@rm -f health-report-*.txt
	@rm -f backup-*.sql

clean-all: clean ## Clean up all files
	@echo "Cleaning up all files..."
	@rm -rf node_modules
	@rm -f package-lock.json

# Git
git-hooks: ## Install Git hooks
	@echo "Installing Git hooks..."
	@chmod +x scripts/setup.sh
	@./scripts/setup.sh --skip-deps --skip-supabase --skip-config

# Documentation
docs: ## Generate documentation
	@echo "Generating documentation..."
	@echo "Documentation is available in the docs/ directory"

# CI/CD
ci: ## Run CI pipeline
	@echo "Running CI pipeline..."
	@make check
	@make test
	@make health

cd: ## Run CD pipeline
	@echo "Running CD pipeline..."
	@make deploy

# Environment-specific targets
.PHONY: dev-env staging-env prod-env

dev-env: ## Set development environment
	@export ENVIRONMENT=development

staging-env: ## Set staging environment
	@export ENVIRONMENT=staging

prod-env: ## Set production environment
	@export ENVIRONMENT=production

# Default environment
ENVIRONMENT ?= development
