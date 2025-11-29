#!/bin/bash

# Xray VPN Production Deployment Script
# This script deploys the application to Docker Swarm

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Xray VPN Production Deployment ===${NC}"

# Check if Docker Swarm is initialized
if ! docker info | grep -q "Swarm: active"; then
    echo -e "${YELLOW}Docker Swarm is not initialized. Initializing now...${NC}"
    docker swarm init
fi

# Create overlay network for Traefik if it doesn't exist
if ! docker network ls | grep -q "traefik-public"; then
    echo -e "${YELLOW}Creating traefik-public network...${NC}"
    docker network create --driver=overlay traefik-public
fi

# Load environment variables
if [ -f .env ]; then
    echo -e "${GREEN}Loading environment variables...${NC}"
    set -a
    source .env
    set +a
else
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Check required secrets
REQUIRED_SECRETS=("db_password" "telegram_bot_token" "jwt_secret" "rabbitmq_password")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! docker secret ls | grep -q "$secret"; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e "${RED}Error: The following Docker secrets are missing:${NC}"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo -e "  - $secret"
    done
    echo ""
    echo "Create secrets with:"
    echo "  echo 'your_value' | docker secret create secret_name -"
    echo ""
    echo "Example:"
    echo "  echo 'MySecurePassword123' | docker secret create db_password -"
    exit 1
fi

# Build images
echo -e "${GREEN}Building Docker images...${NC}"
docker build -t ${REGISTRY}xray-vpn-api:${VERSION} -f Dockerfile --target final .
docker build -t ${REGISTRY}xray-vpn-worker:${VERSION} -f Dockerfile --target final .

# Tag images if registry is set
if [ ! -z "$REGISTRY" ]; then
    echo -e "${GREEN}Pushing images to registry...${NC}"
    docker push ${REGISTRY}xray-vpn-api:${VERSION}
    docker push ${REGISTRY}xray-vpn-worker:${VERSION}
fi

# Label manager node for PostgreSQL
echo -e "${GREEN}Labeling manager node for PostgreSQL...${NC}"
MANAGER_NODE=$(docker node ls --filter role=manager --format "{{.Hostname}}" | head -n 1)
docker node update --label-add postgres=true $MANAGER_NODE

# Deploy stack
echo -e "${GREEN}Deploying stack to Docker Swarm...${NC}"
docker stack deploy -c docker-compose.swarm.yml xray-vpn

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Show service status
echo -e "${GREEN}Service Status:${NC}"
docker service ls

echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Check service logs with:"
echo "  docker service logs xray-vpn_api"
echo "  docker service logs xray-vpn_worker"
echo "  docker service logs xray-vpn_frontend"
echo ""
echo "Scale services with:"
echo "  docker service scale xray-vpn_api=5"
echo ""
echo "Update services with:"
echo "  ./deploy.sh"
