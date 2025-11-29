# Quick Start Guide

## Prerequisites

1. **Go 1.21+** installed
2. **Docker & Docker Compose** installed
3. **Telegram Bot Token** - create bot via @BotFather

## Setup Steps

### 1. Configure Environment

Copy example config:
```bash
cp configs/config.example.yaml configs/config.yaml
```

Edit `configs/config.yaml`:
- Set `telegram.bot_token` to your Telegram bot token
- Configure Xray panel credentials
- Update database credentials if needed

### 2. Start Infrastructure

Start PostgreSQL and RabbitMQ:
```bash
docker-compose up -d postgres rabbitmq
```

Wait for services to be healthy (about 30 seconds).

### 3. Install Dependencies

```bash
go mod download
```

### 4. Run Migrations

Migrations run automatically when API starts, or you can run:
```bash
make migrate
```

### 5. Start Services

**Terminal 1 - API Server:**
```bash
make run-api
# or
APP_ENV=development go run ./cmd/api/main.go
```

**Terminal 2 - Worker:**
```bash
make run-worker
# or
APP_ENV=development go run ./cmd/worker/main.go
```

### 6. Test API

Health check:
```bash
curl http://localhost:8080/health
```

Get servers:
```bash
curl http://localhost:8080/api/v1/servers
```

## Production Deployment

### Docker Swarm

1. **Build images:**
```bash
make docker-build
```

2. **Initialize Swarm:**
```bash
docker swarm init
```

3. **Deploy stack:**
```bash
docker stack deploy -c docker-compose.yml xray-vpn
```

4. **Check status:**
```bash
docker service ls
docker service ps xray-vpn_api
docker service logs xray-vpn_api
```

### Environment Variables

For production, use environment variables instead of config file:

```bash
export DB_PASSWORD=your_secure_password
export TELEGRAM_BOT_TOKEN=your_bot_token
export JWT_SECRET=your_jwt_secret
export RABBITMQ_URL=amqp://user:pass@rabbitmq:5672/
```

## Troubleshooting

### Database Connection Issues

Check PostgreSQL is running:
```bash
docker-compose ps postgres
docker-compose logs postgres
```

Test connection:
```bash
docker-compose exec postgres psql -U postgres -d xrayvpn -c "SELECT 1;"
```

### RabbitMQ Issues

Check RabbitMQ is running:
```bash
docker-compose ps rabbitmq
docker-compose logs rabbitmq
```

Access management UI: http://localhost:15672 (guest/guest)

### API Not Starting

Check logs:
```bash
docker-compose logs api
```

Verify configuration:
```bash
cat configs/config.yaml
```

### Worker Not Processing Tasks

Check worker logs:
```bash
docker-compose logs worker
```

Check RabbitMQ queues:
- Access http://localhost:15672
- Login with guest/guest
- Check "Queues" tab

## Development Tips

1. **Hot Reload**: Use `air` or `fresh` for auto-reload during development
2. **Database GUI**: Use pgAdmin or DBeaver to inspect database
3. **API Testing**: Use Postman or `curl` with Telegram init data header
4. **Logs**: Check logs with `docker-compose logs -f api worker`

## Next Steps

1. Configure Xray panel integration
2. Set up SSL/TLS certificates
3. Configure reverse proxy (nginx/traefik)
4. Set up monitoring (Prometheus/Grafana)
5. Configure backups for PostgreSQL

