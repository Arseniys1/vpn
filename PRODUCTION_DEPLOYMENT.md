# Xray VPN - Production Deployment Guide

Complete guide for deploying Xray VPN to production using Docker Swarm.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Deployment Steps](#deployment-steps)
- [Configuration](#configuration)
- [Scaling](#scaling)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Prerequisites

### Hardware Requirements

**Minimum (Single Node)**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB SSD

**Recommended (Multi-Node)**
- Manager Node: 2 cores, 4GB RAM, 20GB SSD
- Worker Nodes: 4 cores, 8GB RAM, 50GB SSD (x2 or more)

### Software Requirements

- Docker Engine 20.10+
- Docker Compose 2.0+
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- Domain name with DNS configured
- Telegram Bot Token from @BotFather

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Traefik (Manager)                │
│           SSL/TLS Termination & Load Balancing      │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌──────▼──────┐
│   Frontend   │  │     API     │
│ (2 replicas) │  │ (3 replicas)│
└──────────────┘  └──┬──────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──┐  ┌─────▼────┐  ┌───▼─────┐
│ Worker   │  │PostgreSQL│  │RabbitMQ │
│(2 replicas) │(1 replica)│  │(1 replica)
└──────────┘  └──────────┘  └─────────┘
```

## Deployment Steps

### 1. Initialize Docker Swarm

```bash
# On manager node
docker swarm init --advertise-addr <MANAGER_IP>

# On worker nodes (join from manager output)
docker swarm join --token <TOKEN> <MANAGER_IP>:2377

# Verify cluster
docker node ls
```

### 2. Create Docker Secrets

Create secure secrets for sensitive data:

```bash
# Database password
echo "YourSecureDBPassword123!" | docker secret create db_password -

# Telegram bot token
echo "123456789:ABCdefGHIjklMNOpqrsTUVwxyz" | docker secret create telegram_bot_token -

# JWT secret (generate random string)
openssl rand -base64 32 | docker secret create jwt_secret -

# RabbitMQ password
echo "YourSecureRabbitMQPassword!" | docker secret create rabbitmq_password -

# Verify secrets
docker secret ls
```

### 3. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
# Domain Configuration
DOMAIN=yourdomain.com
ACME_EMAIL=admin@yourdomain.com

# Database
DB_USER=postgres
DB_NAME=xrayvpn

# RabbitMQ
RABBITMQ_USER=xray_user

# Application
APP_ENV=production
LOG_LEVEL=info

# Replicas
API_REPLICAS=3
WORKER_REPLICAS=2
FRONTEND_REPLICAS=2

# Optional: Docker Registry
REGISTRY=registry.yourdomain.com/
VERSION=v1.0.0
```

### 4. Create Networks

```bash
# Create overlay network for Traefik
docker network create --driver=overlay traefik-public
```

### 5. Build and Push Images

**Option A: Build locally and push to registry**

```bash
# Build images
docker build -t your-registry.com/xray-vpn-api:v1.0.0 -f backend/Dockerfile backend/
docker build -t your-registry.com/xray-vpn-worker:v1.0.0 -f backend/Dockerfile backend/
docker build -t your-registry.com/xray-vpn-frontend:v1.0.0 -f Dockerfile .

# Push to registry
docker push your-registry.com/xray-vpn-api:v1.0.0
docker push your-registry.com/xray-vpn-worker:v1.0.0
docker push your-registry.com/xray-vpn-frontend:v1.0.0
```

**Option B: Use deployment script**

```bash
cd backend
chmod +x deploy.sh
./deploy.sh
```

For Windows:
```powershell
cd backend
.\deploy.ps1
```

### 6. Deploy Stack

```bash
cd backend
docker stack deploy -c docker-compose.swarm.yml xray-vpn
```

### 7. Verify Deployment

```bash
# Check services
docker service ls

# Check service status
docker service ps xray-vpn_api
docker service ps xray-vpn_worker
docker service ps xray-vpn_frontend

# View logs
docker service logs -f xray-vpn_api
docker service logs -f xray-vpn_worker
```

## Configuration

### Database Configuration

The application automatically runs migrations on startup. To manually run migrations:

```bash
# Connect to API container
docker exec -it $(docker ps -q -f name=xray-vpn_api) sh

# Migrations run automatically, but you can verify
# by checking the database tables
```

### Initial Admin Setup

Set the first admin user in the database:

```bash
# Connect to PostgreSQL
docker exec -it $(docker ps -q -f name=xray-vpn_postgres) psql -U postgres -d xrayvpn

# Set admin role
UPDATE users SET is_admin = true WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### SSL/TLS Configuration

Traefik automatically provisions SSL certificates using Let's Encrypt. Ensure:

1. Domain DNS points to your server IP
2. Ports 80 and 443 are open
3. `DOMAIN` and `ACME_EMAIL` are set in `.env`

## Scaling

### Scale Services

```bash
# Scale API replicas
docker service scale xray-vpn_api=5

# Scale workers
docker service scale xray-vpn_worker=4

# Scale frontend
docker service scale xray-vpn_frontend=3
```

### Add Worker Nodes

```bash
# On manager node, get join token
docker swarm join-token worker

# On new node, run the join command
docker swarm join --token <TOKEN> <MANAGER_IP>:2377
```

### Update Services

```bash
# Update with new image version
docker service update --image your-registry.com/xray-vpn-api:v1.1.0 xray-vpn_api

# Or redeploy entire stack
docker stack deploy -c docker-compose.swarm.yml xray-vpn
```

## Monitoring

### Service Health

```bash
# Check service health
docker service inspect --pretty xray-vpn_api

# View service events
docker service ps --no-trunc xray-vpn_api
```

### Logs

```bash
# Real-time logs
docker service logs -f xray-vpn_api

# Logs from specific task
docker service logs xray-vpn_api.<TASK_ID>

# Filter logs by time
docker service logs --since 1h xray-vpn_api
```

### Traefik Dashboard

Access Traefik dashboard at: `https://traefik.yourdomain.com`

### Database Monitoring

```bash
# Connect to PostgreSQL
docker exec -it $(docker ps -q -f name=xray-vpn_postgres) psql -U postgres -d xrayvpn

# Check database size
SELECT pg_size_pretty(pg_database_size('xrayvpn'));

# Active connections
SELECT count(*) FROM pg_stat_activity;
```

### RabbitMQ Management

Access RabbitMQ management UI at: `http://<SERVER_IP>:15672`
- Username: Value from `RABBITMQ_USER`
- Password: Value from `rabbitmq_password` secret

## Troubleshooting

### Service Not Starting

```bash
# Check service status
docker service ps xray-vpn_api --no-trunc

# Check logs for errors
docker service logs xray-vpn_api

# Inspect service
docker service inspect xray-vpn_api
```

### Database Connection Issues

```bash
# Check PostgreSQL service
docker service ps xray-vpn_postgres

# Test connection
docker exec -it $(docker ps -q -f name=xray-vpn_postgres) pg_isready

# Check logs
docker service logs xray-vpn_postgres
```

### SSL Certificate Issues

```bash
# Check Traefik logs
docker service logs xray-vpn_traefik

# Verify DNS records
nslookup yourdomain.com

# Check certificate storage
docker exec -it $(docker ps -q -f name=xray-vpn_traefik) ls -la /letsencrypt/
```

### High Memory Usage

```bash
# Check service resources
docker stats

# Limit service resources (edit docker-compose.swarm.yml)
resources:
  limits:
    memory: 512M
  reservations:
    memory: 256M
```

### Network Issues

```bash
# List networks
docker network ls

# Inspect network
docker network inspect xray-network

# Check service connectivity
docker exec -it $(docker ps -q -f name=xray-vpn_api) ping postgres
```

## Security Best Practices

### 1. Secrets Management

✅ **DO:**
- Use Docker secrets for sensitive data
- Rotate secrets regularly
- Use strong passwords (16+ characters)

❌ **DON'T:**
- Store secrets in environment variables
- Commit secrets to Git
- Use default passwords

### 2. Network Security

```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 2377/tcp  # Swarm management
ufw allow 7946/tcp  # Swarm node communication
ufw allow 7946/udp
ufw allow 4789/udp  # Swarm overlay network
ufw enable
```

### 3. SSL/TLS

- Always use HTTPS in production
- Enable HSTS headers
- Use TLS 1.2+ only
- Regularly update certificates

### 4. Database Security

- Use strong passwords
- Enable SSL connections in production
- Regular backups
- Limit database access to app containers only

### 5. Application Security

- Keep dependencies updated
- Enable rate limiting (already configured)
- Monitor logs for suspicious activity
- Use JWT with strong secrets
- Validate all user inputs

### 6. Update Strategy

```bash
# Rolling updates with zero downtime
docker service update \
  --update-parallelism 1 \
  --update-delay 10s \
  --image new-image:tag \
  xray-vpn_api
```

### 7. Backup Strategy

#### Database Backup

```bash
# Create backup
docker exec $(docker ps -q -f name=xray-vpn_postgres) \
  pg_dump -U postgres xrayvpn > backup_$(date +%Y%m%d).sql

# Restore from backup
cat backup_20240101.sql | docker exec -i $(docker ps -q -f name=xray-vpn_postgres) \
  psql -U postgres xrayvpn
```

#### Volume Backup

```bash
# Backup PostgreSQL data
docker run --rm \
  -v xray-vpn_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data
```

## Performance Optimization

### 1. Database Connection Pooling

Already configured in `backend/internal/database/db.go`:
- MaxOpenConns: 25
- MaxIdleConns: 5
- ConnMaxLifetime: 5 minutes

### 2. API Rate Limiting

Already configured in `backend/internal/handlers/handlers.go`:
- 10 requests per second per IP
- Burst of 20 requests

### 3. Caching

Configure frontend caching in `nginx.conf`:
- Static assets: 1 year cache
- HTML: no-cache
- Gzip compression enabled

### 4. Resource Limits

Properly set in `docker-compose.swarm.yml`:
- API: 512MB limit, 256MB reservation
- Worker: 512MB limit, 256MB reservation
- Frontend: 256MB limit, 128MB reservation

## Production Checklist

Before going live, verify:

- [ ] All Docker secrets created
- [ ] Environment variables configured
- [ ] Domain DNS properly configured
- [ ] SSL certificates provisioned
- [ ] Database backed up
- [ ] Admin user created
- [ ] Telegram bot configured
- [ ] Firewall rules configured
- [ ] Monitoring enabled
- [ ] Logs accessible
- [ ] Health checks passing
- [ ] Load balancing working
- [ ] Auto-scaling configured
- [ ] Backup strategy in place
- [ ] Rollback procedure tested

## Support

For issues and questions:
- Check logs: `docker service logs <service_name>`
- Review this guide
- Check Docker Swarm documentation
- Verify all prerequisites are met

## License

See LICENSE file for details.
