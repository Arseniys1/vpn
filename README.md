# Xray VPN Connect - Telegram Mini App

🚀 **Production-ready VPN service with Telegram Mini App interface**

A complete VPN management system built with Go backend and React frontend, designed for deployment on Docker Swarm with multiple replicas.

## 📋 Features

### Backend (Go + Gin)
- ✅ **RESTful API** with rate limiting
- ✅ **PostgreSQL** with connection pooling
- ✅ **RabbitMQ** task queue for async operations
- ✅ **Xray/3x-ui** panel integration
- ✅ **Telegram WebApp** authentication
- ✅ **Docker Swarm** ready with health checks
- ✅ **Graceful shutdown** and error recovery
- ✅ **Structured logging** with zerolog
- ✅ **Database migrations** and seeding
- ✅ **Docker secrets** support
- ✅ **Production-grade** error handling

### Frontend (React + TypeScript + Vite)
- ✅ **Admin Panel** with real-time statistics
- ✅ **Server management** (CRUD operations)
- ✅ **User management** with search
- ✅ **Plan management**
- ✅ **Support ticket** system
- ✅ **Responsive design** for mobile
- ✅ **Environment-based** configuration
- ✅ **Retry logic** for API calls
- ✅ **Production build** with nginx

## 🏗️ Architecture

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

### Development

1. **Backend Setup:**
```bash
cd backend
cp configs/config.example.yaml configs/config.yaml
# Edit config.yaml with your settings

# Start infrastructure
docker-compose up -d postgres rabbitmq

# Run API
go run cmd/api/main.go

# Run Worker (in another terminal)
go run cmd/worker/main.go
```

2. **Frontend Setup:**
```bash
npm install
npm run dev
```

### Production Deployment

**📖 See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for complete guide**

Quick deploy:

```bash
# 1. Create Docker secrets
echo "your_password" | docker secret create db_password -
echo "your_bot_token" | docker secret create telegram_bot_token -
echo "your_jwt_secret" | docker secret create jwt_secret -
echo "your_rabbitmq_pass" | docker secret create rabbitmq_password -

# 2. Configure environment
cd backend
cp .env.example .env
# Edit .env with your domain and settings

# 3. Deploy
./deploy.sh  # Linux
# OR
.\deploy.ps1  # Windows
```

## 📚 Documentation

- **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** - Complete production deployment guide
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
