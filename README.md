# 🚀 Xray VPN - Telegram Mini App

A fully functional VPN service with Telegram integration, built with Go backend and React frontend.

## 🌟 Features

### ✅ Backend
- Complete CRUD operations for servers, plans, users, tickets
- Telegram WebApp authentication
- Rate limiting (10 req/s per IP)
- Connection pooling for PostgreSQL
- Health checks for Docker Swarm
- Graceful shutdown
- Structured logging (zerolog)
- Docker Secrets support

### ✅ Frontend
- Full integration with backend API
- All pages work with real data
- Loading states
- Error handling
- Telegram WebApp features (haptic feedback, alerts)
- Responsive design
- Optimistic UI updates

### ✅ All Buttons Work
- **Purchase Subscription** → `/api/v1/subscriptions/purchase`
- **Top Up Balance** → `/api/v1/users/topup`
- **Create Connection** → `/api/v1/connections`
- **Create Ticket** → `/api/v1/support/tickets`
- **Send Messages** → `/api/v1/support/tickets/:id/messages`
- **Report Problem** → Creates support ticket
- **Admin Panel** → Full CRUD for all entities

## 📱 Telegram Integration

This application is designed as a Telegram Mini App with full bot integration:

### ✅ Bot Features
- Menu button opens the Mini App directly
- Command responses with inline buttons (`/start`, `/help`, `/info`)
- Authentication flow through Telegram WebApp
- Deep linking support with authentication tokens

### 🤖 Bot Setup
Follow the [Telegram Bot Setup Guide](TELEGRAM_BOT_SETUP.md) for complete instructions.

## 🏃 Quick Start

### 1. Backend Setup

```bash
cd backend

# Copy example configuration
cp configs/config.example.yaml configs/config.yaml

# Edit config.yaml with your settings
# - Set TELEGRAM_BOT_TOKEN
# - Set TELEGRAM_BOT_USERNAME
# - Set JWT_SECRET
# - Configure PostgreSQL

# Run with Docker Compose
docker-compose up -d

# Or run locally
go run cmd/api/main.go
```

Backend will be available at: `http://localhost:8080`

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_APP_ENV=development
EOF

# Run development server
npm run dev
```

Frontend will be available at: `http://localhost:5173`

### 3. Telegram Bot Configuration

1. Create a bot with [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Add token to `backend/configs/config.yaml`
4. Set up the Mini App URL in BotFather
5. Configure webhook URL

See [TELEGRAM_BOT_SETUP.md](TELEGRAM_BOT_SETUP.md) for detailed instructions.

## 📊 Architecture

```
┌─────────────────┐
│  Telegram Bot   │
│   Mini App      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│   Frontend      │─────▶│   Traefik    │
│  (React + Vite) │      │ Load Balancer│
└─────────────────┘      └──────┬───────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
            ┌──────────────┐          ┌──────────────┐
            │  API Server  │          │  API Server  │
            │   (Replica)  │          │   (Replica)  │
            └──────┬───────┘          └──────┬───────┘
                   │                         │
                   └──────────┬──────────────┘
                              ▼
                    ┌──────────────────┐
                    │    PostgreSQL    │
                    │    (Database)    │
                    └──────────────────┘
```

## 🎯 Production Deployment

### Docker Swarm Ready
- Multi-replica support
- Health checks (`/health`, `/ready`)
- Rate limiting (10 req/s per IP)
- Connection pooling
- Graceful shutdown
- Structured logging

### Environment Configuration
All settings can be configured via:
- `configs/config.yaml`
- Environment variables
- Docker secrets

## 🔐 Security Features

### Authentication
- Telegram WebApp initData verification
- HMAC signature validation
- No password authentication needed

### Protection
- Rate limiting (10 req/s per IP)
- SQL injection prevention (GORM)
- Input validation
- CORS configuration

## 🧪 Testing

### Manual Testing Steps
1. Open Telegram Mini App
2. Verify welcome message shows user's name
3. Check balance is 0
4. Verify no admin access
5. Check referral stats show 0

### API Testing
```bash
# Get user data
curl -H "X-Telegram-Init-Data: ..." \
  http://localhost:8080/api/v1/users/me

# List servers
curl http://localhost:8080/api/v1/servers

# Create connection (requires auth)
curl -X POST -H "X-Telegram-Init-Data: ..." \
  -d '{"server_id": "uuid"}' \
  http://localhost:8080/api/v1/connections
```

## 📚 Documentation

- [QUICK_START.md](QUICK_START.md) - Quick start guide
- [TELEGRAM_BOT_SETUP.md](TELEGRAM_BOT_SETUP.md) - Telegram bot setup
- [BACKEND_FRONTEND_INTEGRATION.md](BACKEND_FRONTEND_INTEGRATION.md) - Integration details
- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - Deployment guide
- [backend/README.md](backend/README.md) - API documentation

## ✅ Ready for Production

The application is fully production-ready with:
- Complete backend-frontend integration
- All buttons working with real API calls
- Database-driven content (no mock data)
- Docker Swarm multi-replica support
- Comprehensive error handling
- Telegram WebApp native features
- Security best practices
- Performance optimizations

Deploy to production immediately with confidence that all functionality works as expected.