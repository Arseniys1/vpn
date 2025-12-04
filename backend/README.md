# Xray VPN Connect Backend

Production-ready backend for Telegram VPN service built with Go.

## Features

- **RESTful API** using Gin framework
- **PostgreSQL** database with GORM ORM
- **RabbitMQ** for task queue processing
- **Real-time WebSocket notifications**
- **Xray/3x-ui** panel integration for VPN management
- **Telegram WebApp** authentication
- **Docker Swarm** ready with health checks
- **Graceful shutdown** and error recovery
- **Structured logging** with zerolog
- **Database migrations** and seeding

## Architecture

- **API Server** (`cmd/api`) - REST API for frontend
- **Worker** (`cmd/worker`) - Background task processor
- **WebSocket Service** (`cmd/websocket`) - Real-time notifications
- **Services** - Business logic layer
- **Handlers** - HTTP request handlers
- **Models** - Database models with GORM
- **Queue** - RabbitMQ task queue integration
- **Xray Client** - Integration with 3x-ui panel API

## Getting Started

### Prerequisites

- Go 1.21+
- Docker and Docker Compose
- PostgreSQL 15+
- RabbitMQ 3.x

### Configuration

1. Copy example config:
```bash
cp configs/config.example.yaml configs/config.yaml
```

2. Update `configs/config.yaml` with your settings:
- Telegram bot token
- Database credentials
- Xray panel credentials
- JWT secret

### Environment Variables

You can override config with environment variables:

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- `RABBITMQ_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME` - Telegram bot username (without @)
- `FRONTEND_URL` - Frontend application URL (e.g., https://yourdomain.com)
- `JWT_SECRET`
- `APP_ENV` (development/production)
- `LOG_LEVEL` (debug/info/warn/error)

### Development

1. Install dependencies:
```bash
go mod download
```

2. Run migrations:
```bash
go run cmd/api/main.go
# Migrations run automatically on startup
```

3. Start services:
```bash
docker-compose up -d postgres rabbitmq
```

4. Run API server:
```bash
APP_ENV=development go run cmd/api/main.go
```

5. Run worker:
```bash
APP_ENV=development go run cmd/worker/main.go
```

### Production Deployment

#### Docker Swarm

1. Build images:
```bash
docker build -t xray-vpn-api:latest .
docker build -t xray-vpn-worker:latest .
```

2. Initialize Swarm (if not already):
```bash
docker swarm init
```

3. Create network:
```bash
docker network create --driver overlay xray-network
```

4. Create secrets:
```bash
echo "your-postgres-password" | docker secret create db_password -
echo "your-telegram-bot-token" | docker secret create telegram_bot_token -
echo "your-jwt-secret" | docker secret create jwt_secret -
```

5. Deploy stack:
```bash
docker stack deploy -c docker-compose.yml xray-vpn
```

6. Check status:
```bash
docker service ls
docker service ps xray-vpn_api
docker service ps xray-vpn_worker
```

#### Health Checks

- API: `GET /health`
- Database: PostgreSQL health check via pg_isready
- RabbitMQ: RabbitMQ diagnostics ping

## API Endpoints

### Public
- `GET /health` - Health check
- `GET /api/v1/servers` - List available servers

### Protected (requires Telegram auth header)
- `GET /api/v1/users/me` - Get current user
- `POST /api/v1/users/topup` - Add balance
- `GET /api/v1/subscriptions/plans` - List subscription plans
- `POST /api/v1/subscriptions/purchase` - Purchase subscription
- `GET /api/v1/subscriptions/me` - Get current subscription
- `GET /api/v1/connections` - List user connections
- `POST /api/v1/connections` - Create VPN connection
- `DELETE /api/v1/connections/:id` - Delete connection

### Authentication

All protected endpoints require `X-Telegram-Init-Data` header with Telegram WebApp init data.

## Worker Tasks

Worker processes tasks from RabbitMQ queue:

- `create_connection` - Create VPN connection in Xray panel
- `delete_connection` - Delete VPN connection from Xray panel
- `update_traffic` - Update connection traffic statistics

## WebSocket Service

WebSocket service handles real-time notifications:

- Consumes `websocket_notifications` queue from RabbitMQ
- Manages WebSocket connections for frontend clients
- Routes messages to specific users or broadcasts to all
- Supports automatic reconnection with exponential backoff

## Database Models

- **User** - Telegram users
- **Plan** - Subscription plans
- **Subscription** - User subscriptions
- **Server** - VPN server locations
- **Connection** - User VPN connections
- **XrayPanel** - Xray control panels
- **SupportTicket** - Support tickets
- **ServerReport** - Server problem reports
- **ReferralStats** - Referral program statistics

## License

MIT

