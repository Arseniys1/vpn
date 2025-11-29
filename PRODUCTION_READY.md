# Production Deployment Guide

## 🚀 Production Setup Complete!

All components are fully integrated and ready for production deployment.

## ✅ What's Working

### Frontend (React + TypeScript)
- ✅ Admin Panel fully functional
  - Real-time statistics dashboard
  - Server management (CRUD)
  - User management with search
  - Plan management
  - Ticket system with replies
- ✅ User interface
  - Server selection with country flags
  - Subscription management
  - Support system
  - Instructions

### Backend (Go + Gin)
- ✅ RESTful API endpoints
- ✅ PostgreSQL database integration
- ✅ Admin authentication & authorization
- ✅ CRUD operations for all entities
- ✅ Telegram WebApp authentication

## 📋 Pre-deployment Checklist

### 1. Database Setup
```sql
-- Create database
CREATE DATABASE xrayvpn;

-- Run migrations (auto-handled by backend)
-- Set first admin user
UPDATE users SET is_admin = true WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### 2. Backend Configuration
Edit `backend/configs/config.yaml`:
```yaml
app:
  env: production
  
database:
  host: your_postgres_host
  port: 5432
  user: postgres
  password: your_secure_password
  db_name: xrayvpn
  
telegram:
  bot_token: YOUR_BOT_TOKEN_HERE
```

### 3. Frontend Configuration
Update API endpoint in `src/services/adminApi.ts`:
```typescript
const API_BASE_URL = 'https://your-domain.com/api/v1';
```

### 4. Environment Variables (Backend)
```bash
export DB_HOST=your_postgres_host
export DB_PASSWORD=your_secure_password
export TELEGRAM_BOT_TOKEN=your_bot_token
export APP_ENV=production
```

## 🔧 Building for Production

### Backend
```bash
cd backend
go build -o xray-vpn-api cmd/api/main.go
go build -o xray-vpn-worker cmd/worker/main.go
```

### Frontend
```bash
npm run build
# Output will be in /dist folder
```

## 🐳 Docker Deployment

```bash
cd backend
docker-compose up -d
```

## 🌐 Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL
- [ ] Set strong JWT secret
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Regular database backups
- [ ] Monitor logs

## 📊 Admin Panel Access

1. **Set Admin Role:**
   ```sql
   UPDATE users SET is_admin = true WHERE telegram_id = YOUR_ID;
   ```

2. **Access Admin Panel:**
   - Open Telegram Mini App
   - Admin button appears on main page
   - Navigate to /admin

## 🎯 API Endpoints

All admin endpoints require authentication and admin role.

### Statistics
- `GET /api/v1/admin/stats`

### Servers
- `GET /api/v1/admin/servers`
- `POST /api/v1/admin/servers`
- `PUT /api/v1/admin/servers/:id`
- `DELETE /api/v1/admin/servers/:id`

### Users
- `GET /api/v1/admin/users?page=1&limit=20&search=query`
- `PUT /api/v1/admin/users/:id`

### Plans
- `GET /api/v1/admin/plans`
- `POST /api/v1/admin/plans`
- `PUT /api/v1/admin/plans/:id`
- `DELETE /api/v1/admin/plans/:id`

### Tickets
- `GET /api/v1/admin/tickets?status=open`
- `POST /api/v1/admin/tickets/:id/reply`

## 🧪 Testing

### Backend
```bash
cd backend
go test ./...
```

### Frontend
```bash
npm test
```

### API Testing
```bash
# Health check
curl http://localhost:8080/health

# Get stats (with auth)
curl -X GET http://localhost:8080/api/v1/admin/stats \
  -H "X-Telegram-Init-Data: YOUR_INIT_DATA"
```

## 📈 Monitoring

### Backend Logs
```bash
tail -f /var/log/xray-vpn/api.log
```

### Database Health
```sql
SELECT COUNT(*) FROM users WHERE is_active = true;
SELECT COUNT(*) FROM subscriptions WHERE is_active = true;
SELECT COUNT(*) FROM servers WHERE is_active = true;
```

## 🔄 Updates & Maintenance

### Database Migrations
Automatic on startup. Check logs:
```
[INFO] Running migrations...
[INFO] Migrations completed successfully
```

### Backup Strategy
```bash
# Daily backup
pg_dump xrayvpn > backup_$(date +%Y%m%d).sql

# Restore
psql xrayvpn < backup_20240101.sql
```

## 🐛 Troubleshooting

### Issue: Admin panel not accessible
```sql
-- Check admin status
SELECT telegram_id, first_name, is_admin FROM users WHERE telegram_id = YOUR_ID;

-- Set admin if needed
UPDATE users SET is_admin = true WHERE telegram_id = YOUR_ID;
```

### Issue: API 403 Forbidden
- Check Telegram WebApp init data
- Verify bot token in config
- Check middleware logs

### Issue: Database connection failed
- Verify PostgreSQL is running
- Check connection string
- Verify user permissions

## 📱 Telegram Bot Setup

1. Create bot with @BotFather
2. Get bot token
3. Set webhook (if needed)
4. Configure Mini App URL

## 🎉 Launch Checklist

- [ ] Backend deployed and running
- [ ] Frontend built and deployed
- [ ] Database migrated
- [ ] Admin user created
- [ ] SSL certificate installed
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Documentation updated
- [ ] Team trained

## 📞 Support

For issues, check:
1. Server logs
2. Database logs
3. Network connectivity
4. API responses

---

**Status:** ✅ Production Ready
**Version:** 1.0.0
**Last Updated:** 2024
