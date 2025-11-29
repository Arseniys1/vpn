# Xray VPN Production Deployment Script for Windows PowerShell
# This script deploys the application to Docker Swarm

$ErrorActionPreference = "Stop"

Write-Host "=== Xray VPN Production Deployment ===" -ForegroundColor Green

# Check if Docker Swarm is initialized
$swarmStatus = docker info --format '{{.Swarm.LocalNodeState}}'
if ($swarmStatus -ne "active") {
    Write-Host "Docker Swarm is not initialized. Initializing now..." -ForegroundColor Yellow
    docker swarm init
}

# Create overlay network for Traefik if it doesn't exist
$networks = docker network ls --format '{{.Name}}'
if ($networks -notcontains "traefik-public") {
    Write-Host "Creating traefik-public network..." -ForegroundColor Yellow
    docker network create --driver=overlay traefik-public
}

# Load environment variables
if (Test-Path .env) {
    Write-Host "Loading environment variables..." -ForegroundColor Green
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($name -and -not $name.StartsWith('#')) {
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
    }
} else {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env and configure it"
    exit 1
}

# Check required secrets
$requiredSecrets = @("db_password", "telegram_bot_token", "jwt_secret", "rabbitmq_password")
$missingSecrets = @()

foreach ($secret in $requiredSecrets) {
    $exists = docker secret ls --format '{{.Name}}' | Select-String -Pattern "^$secret$"
    if (-not $exists) {
        $missingSecrets += $secret
    }
}

if ($missingSecrets.Count -gt 0) {
    Write-Host "Error: The following Docker secrets are missing:" -ForegroundColor Red
    foreach ($secret in $missingSecrets) {
        Write-Host "  - $secret"
    }
    Write-Host ""
    Write-Host "Create secrets with:"
    Write-Host '  echo "your_value" | docker secret create secret_name -'
    Write-Host ""
    Write-Host "Example:"
    Write-Host '  echo "MySecurePassword123" | docker secret create db_password -'
    exit 1
}

# Build images
Write-Host "Building Docker images..." -ForegroundColor Green
$registry = $env:REGISTRY
$version = if ($env:VERSION) { $env:VERSION } else { "latest" }

docker build -t "${registry}xray-vpn-api:${version}" -f Dockerfile --target final .
docker build -t "${registry}xray-vpn-worker:${version}" -f Dockerfile --target final .

# Tag and push images if registry is set
if ($registry) {
    Write-Host "Pushing images to registry..." -ForegroundColor Green
    docker push "${registry}xray-vpn-api:${version}"
    docker push "${registry}xray-vpn-worker:${version}"
}

# Label manager node for PostgreSQL
Write-Host "Labeling manager node for PostgreSQL..." -ForegroundColor Green
$managerNode = docker node ls --filter role=manager --format "{{.Hostname}}" | Select-Object -First 1
docker node update --label-add postgres=true $managerNode

# Deploy stack
Write-Host "Deploying stack to Docker Swarm..." -ForegroundColor Green
docker stack deploy -c docker-compose.swarm.yml xray-vpn

# Wait for services to be ready
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Show service status
Write-Host "Service Status:" -ForegroundColor Green
docker service ls

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Check service logs with:"
Write-Host "  docker service logs xray-vpn_api"
Write-Host "  docker service logs xray-vpn_worker"
Write-Host "  docker service logs xray-vpn_frontend"
Write-Host ""
Write-Host "Scale services with:"
Write-Host "  docker service scale xray-vpn_api=5"
Write-Host ""
Write-Host "Update services with:"
Write-Host "  .\deploy.ps1"
