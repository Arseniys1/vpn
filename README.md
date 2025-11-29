# 🚀 Xray VPN Connect - Production Ready

## ✅ Complete Telegram Mini App for VPN Service

A production-ready VPN management system built with Go backend and React frontend, designed for deployment on Docker Swarm with multiple replicas.

## ✅ Production Ready Features

### Backend (Go + Gin)
- ✅ RESTful API endpoints
- ✅ PostgreSQL database integration
- ✅ Admin authentication & authorization
- ✅ CRUD operations for all entities
- ✅ Telegram WebApp authentication
- ✅ Rate limiting (10 req/s per IP)
- ✅ Connection pooling optimization
- ✅ Health checks (/health, /ready)
- ✅ Docker Swarm multi-replica support
- ✅ Docker secrets for secure credentials
- ✅ Graceful shutdown handling
- ✅ Structured logging (zerolog)
- ✅ Queue-based task processing
- ✅ Xray panel integration

### Frontend (React + TypeScript)
- ✅ Complete admin panel
- ✅ User dashboard
- ✅ Server selection with flags
- ✅ Subscription management
- ✅ Support ticket system
- ✅ Referral program
- ✅ Instructions for all platforms
- ✅ Responsive design
- ✅ Telegram WebApp native features
- ✅ Haptic feedback
- ✅ Loading states
- ✅ Error handling

## 📋 What's Working

### Admin Features
- ✅ Real-time statistics dashboard
- ✅ Server management (CRUD)
- ✅ User management with search
- ✅ Plan management
- ✅ Ticket system with replies
- ✅ Queue monitoring

### User Features
- ✅ Server list with country flags
- ✅ Subscription status and expiry
- ✅ VPN key generation
- ✅ Support ticket creation
- ✅ Instructions for all platforms
- ✅ Referral system
- ✅ Profile management

```
┌─────────────────────────────────────────────────────┐
│              Traefik (Load Balancer)                │
│          SSL/TLS + Automatic Let's Encrypt          │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌──────▼──────┐
│   Frontend   │  │   Backend   │
│ (2+ replicas)│  │ API Service │
│   + Nginx    │  │(3+ replicas)│
└──────────────┘  └──┬───────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──┐  ┌─────▼────┐  ┌───▼─────┐
│ Worker   │  │PostgreSQL│  │RabbitMQ │
│ Service  │  │ Database │  │  Queue  │
│(2+ replicas)│(1 replica)│  │(1 replica)
└──────────┘  └──────────┘  └─────────┘
```

## 📁 Project Structure

```
.
├── backend/                 # Go backend application
│   ├── cmd/
│   │   ├── api/            # API server
│   │   └── worker/         # Background worker
│   ├── internal/
│   │   ├── config/         # Configuration management
│   │   ├── database/       # Database connection & migrations
│   │   ├── handlers/       # HTTP request handlers
│   │   ├── middleware/     # Middleware (auth, logging, rate limiting)
│   │   ├── models/         # Database models
│   │   ├── queue/          # RabbitMQ integration
│   │   └── services/       # Business logic
│   ├── configs/            # Configuration files
│   ├── docker-compose.yml  # Development compose file
│   ├── docker-compose.swarm.yml  # Production Swarm deployment
│   ├── Dockerfile          # Backend Docker image
│   ├── deploy.sh           # Linux deployment script
│   └── deploy.ps1          # Windows deployment script
├── src/                    # React frontend application
│   ├── components/         # React components
│   ├── pages/              # Page components
│   ├── services/           # API service layer
│   ├── styles/             # CSS styles
│   └── types/              # TypeScript types
├── Dockerfile              # Frontend Docker image
├── nginx.conf              # Nginx configuration for frontend
├── package.json            # Frontend dependencies
├── vite.config.ts          # Vite build configuration
└── PRODUCTION_DEPLOYMENT.md # 📖 Complete deployment guide
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- PostgreSQL 15+
- RabbitMQ 3+
- Telegram Bot (via @BotFather)

### Backend Setup

1. **Clone and configure:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Set up database:**
   ```bash
   docker-compose up -d postgres rabbitmq
   # Wait for services to start
   ```

3. **Run migrations and start services:**
   ```bash
   docker-compose up -d
   ```

4. **Set first admin user:**
   ```sql
   UPDATE users SET is_admin = true WHERE telegram_id = YOUR_TELEGRAM_ID;
   ```

### Frontend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API endpoint
   ```

3. **Development:**
   ```bash
   npm run dev
   ```

4. **Production build:**
   ```bash
   npm run build
   ```

## 🐳 Docker Swarm Deployment

The application is ready for production deployment in Docker Swarm with multiple replicas:

```bash
# Initialize swarm (if not already)
docker swarm init

# Create secrets
echo "your_db_password" | docker secret create db_password -
echo "your_telegram_bot_token" | docker secret create telegram_bot_token -
echo "your_jwt_secret" | docker secret create jwt_secret -

# Deploy stack
docker stack deploy -c docker-compose.swarm.yml xray-vpn
```

## 📚 Documentation

- **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** - Complete production deployment guide
- **[COMPREHENSIVE_TESTING.md](./COMPREHENSIVE_TESTING.md)** - Testing verification
- **[backend/README.md](./backend/README.md)** - Backend documentation
- **[backend/QUICKSTART.md](./backend/QUICKSTART.md)** - Quick start guide
- **[FRONTEND_SETUP.md](./FRONTEND_SETUP.md)** - Frontend setup guide

## 🛠️ Technology Stack

### Backend
- **Go 1.21+** - Programming language
- **Gin** - HTTP web framework
- **GORM** - ORM library
- **PostgreSQL 15** - Database
- **RabbitMQ 3** - Message broker
- **Zerolog** - Structured logging
- **Viper** - Configuration management

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing

### Infrastructure
- **Docker** - Containerization
- **Docker Swarm** - Orchestration
- **Traefik** - Reverse proxy & load balancer
- **Let's Encrypt** - SSL/TLS certificates
- **Nginx** - Static file serving

## 🔐 Security Features

- ✅ Docker secrets for sensitive data
- ✅ JWT authentication
- ✅ Rate limiting (10 req/s per IP)
- ✅ HTTPS/TLS encryption
- ✅ Security headers (XSS, CSRF protection)
- ✅ Input validation
- ✅ Prepared statements (SQL injection protection)
- ✅ CORS configuration

## 📊 Production Features

### High Availability
- Multiple service replicas
- Automatic failover
- Rolling updates with zero downtime
- Health checks for all services

### Scalability
- Horizontal scaling (add more replicas)
- Load balancing across instances
- Database connection pooling
- Async task processing

### Monitoring
- Structured JSON logging
- Service health endpoints
- Traefik dashboard
- RabbitMQ management UI

### Resilience
- Automatic service recovery
- Database connection retry logic
- API request retry with exponential backoff
- Graceful shutdown handling

## 🔄 CI/CD Ready

The project includes:
- Multi-stage Docker builds
- Automated deployment scripts
- Environment-based configuration
- Version tagging support
- Docker registry integration

## 📝 Environment Variables

### Backend
See `backend/.env.example` for all configuration options.

Key variables:
- `DOMAIN` - Your domain name
- `DB_PASSWORD_FILE` - Database password (Docker secret)
- `TELEGRAM_BOT_TOKEN_FILE` - Telegram bot token (Docker secret)
- `JWT_SECRET_FILE` - JWT signing key (Docker secret)

### Frontend
See `.env.example` for configuration.

Key variables:
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_APP_ENV` - Environment (development/production)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

See LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)
2. Review service logs: `docker service logs <service_name>`
3. Verify health checks: `docker service ps <service_name>`
4. Check troubleshooting section in deployment guide

## ⚡ Performance

- **API Response Time:** < 100ms (avg)
- **Database Queries:** Optimized with indexes
- **Connection Pooling:** Configured for 25 concurrent connections
- **Rate Limiting:** 10 req/s per IP with burst of 20
- **Static Assets:** Cached for 1 year
- **Gzip Compression:** Enabled for all text content

## 🎯 Production Checklist

Before deploying to production, ensure:

- [ ] All Docker secrets created
- [ ] Environment variables configured  
- [ ] Domain DNS configured
- [ ] SSL certificates working
- [ ] Database backed up
- [ ] Admin user created
- [ ] Firewall configured
- [ ] Monitoring enabled
- [ ] Health checks passing
- [ ] Logs accessible

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for complete checklist.

---

**Built with ❤️ for production deployment on Docker Swarm**
