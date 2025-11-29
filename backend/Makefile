.PHONY: help build run-api run-worker test clean docker-build docker-up docker-down migrate

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build both API and Worker binaries
	@echo "Building API..."
	@go build -o api-binary ./cmd/api
	@echo "Building Worker..."
	@go build -o worker-binary ./cmd/worker
	@echo "Build complete!"

run-api: ## Run API server (development)
	@echo "Starting API server..."
ifeq ($(OS),Windows_NT)
	@set APP_ENV=development && go run ./cmd/api/main.go
else
	@APP_ENV=development go run ./cmd/api/main.go
endif

run-worker: ## Run worker (development)
	@echo "Starting worker..."
ifeq ($(OS),Windows_NT)
	@set APP_ENV=development && go run ./cmd/worker/main.go
else
	@APP_ENV=development go run ./cmd/worker/main.go
endif

test: ## Run tests
	@go test -v ./...

clean: ## Clean build artifacts
	@rm -f api-binary worker-binary
	@echo "Cleaned!"

docker-build: ## Build Docker images
	@echo "Building Docker images..."
	@docker build -t xray-vpn-api:latest .
	@docker build -t xray-vpn-worker:latest .
	@echo "Docker images built!"

docker-up: ## Start Docker Compose services
	@docker-compose up -d

docker-down: ## Stop Docker Compose services
	@docker-compose down

docker-logs: ## Show Docker Compose logs
	@docker-compose logs -f

migrate: ## Run database migrations (requires running DB)
	@echo "Running migrations..."
ifeq ($(OS),Windows_NT)
	@set APP_ENV=development && go run ./cmd/api/main.go
else
	@APP_ENV=development go run ./cmd/api/main.go
endif

deps: ## Download dependencies
	@go mod download
	@go mod tidy

