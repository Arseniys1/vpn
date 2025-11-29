# 🚀 Quick Start Guide

## Полностью готовое к продакшену приложение для Telegram Mini App

Все функции работают, все кнопки подключены к backend, готово к развертыванию в Docker Swarm.

---

## 📋 Что готово

### ✅ Backend
- Все CRUD операции для серверов, планов, пользователей, тикетов
- Аутентификация через Telegram WebApp
- Rate limiting (10 req/s на IP)
- Connection pooling для PostgreSQL
- Health checks для Docker Swarm
- Graceful shutdown
- Structured logging (zerolog)
- Docker Secrets поддержка

### ✅ Frontend
- Полная интеграция с backend API
- Все страницы работают с реальными данными
- Loading states
- Error handling
- Telegram WebApp features (haptic feedback, alerts)
- Responsive design
- Оптимистичные UI обновления

### ✅ Все кнопки работают
- **Покупка подписки** → `/api/v1/subscriptions/purchase`
- **Пополнение баланса** → `/api/v1/users/topup`
- **Создание подключения** → `/api/v1/connections`
- **Создание тикета** → `/api/v1/support/tickets`
- **Отправка сообщений** → `/api/v1/support/tickets/:id/messages`
- **Сообщить о проблеме** → создает тикет поддержки
- **Админ панель** → полный CRUD для всех сущностей

---

## 🏃 Быстрый старт для разработки

### 1. Запуск Backend

```bash
cd backend

# Скопировать пример конфигурации
cp .env.example .env

# Отредактировать .env
# - Установить TELEGRAM_BOT_TOKEN
# - Установить JWT_SECRET
# - Настроить PostgreSQL

# Запустить с Docker Compose
docker-compose up -d

# Или локально
go run cmd/main.go
```

Backend запустится на: `http://localhost:8080`

### 2. Запуск Frontend

```bash
# В корне проекта
npm install

# Создать .env
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_APP_ENV=development
EOF

# Запустить dev сервер
npm run dev
```

Frontend запустится на: `http://localhost:5173`

### 3. Тестирование в Telegram

1. Создать бота через [@BotFather](https://t.me/botfather)
2. Получить bot token
3. Добавить токен в `backend/.env`
4. Настроить Mini App URL в BotFather:
   - Для разработки: `https://yourtunnel.ngrok.io` (используйте ngrok)
   - Для продакшена: `https://yourdomain.com`

---

## 🐳 Продакшен развертывание (Docker Swarm)

### Подготовка

```bash
cd backend

# 1. Создать Docker secrets
echo "your_db_password" | docker secret create db_password -
echo "your_telegram_bot_token" | docker secret create telegram_bot_token -
echo "your_jwt_secret" | docker secret create jwt_secret -

# 2. Настроить переменные окружения
cp .env.example .env
# Отредактировать .env с продакшен значениями
```

### Развертывание

```bash
# Инициализировать Swarm (если еще не инициализирован)
docker swarm init

# Развернуть stack
./deploy.sh production

# Или вручную
docker stack deploy -c docker-compose.swarm.yml xray-vpn
```

### Проверка статуса

```bash
# Проверить сервисы
docker service ls

# Проверить логи
docker service logs xray-vpn_api -f

# Проверить health
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

### Обновление

```bash
# Обновить версию
export VERSION=1.0.1

# Пересобрать образы
docker build -t xray-vpn-api:$VERSION ./backend
docker build -t xray-vpn-frontend:$VERSION .

# Обновить stack (rolling update)
docker stack deploy -c docker-compose.swarm.yml xray-vpn
```

---

## 🔧 Конфигурация

### Backend Environment Variables

```bash
# Сервер
PORT=8080
GIN_MODE=release

# База данных
DB_HOST=postgres
DB_PORT=5432
DB_NAME=xray_vpn
DB_USER=xray
DB_PASSWORD=secret           # или используйте DB_PASSWORD_FILE
DB_PASSWORD_FILE=/run/secrets/db_password  # для Docker Swarm

# Telegram
TELEGRAM_BOT_TOKEN=your_token  # или TELEGRAM_BOT_TOKEN_FILE
TELEGRAM_BOT_TOKEN_FILE=/run/secrets/telegram_bot_token

# JWT
JWT_SECRET=your_secret         # или JWT_SECRET_FILE
JWT_SECRET_FILE=/run/secrets/jwt_secret

# RabbitMQ (опционально)
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
```

### Frontend Environment Variables

```bash
# API endpoint
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1

# Environment
VITE_APP_ENV=production
```

---

## 📊 Архитектура

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

---

## 🧪 Тестирование функционала

### 1. Проверка аутентификации
```bash
# Получить данные пользователя
curl -H "X-Telegram-Init-Data: ..." \
  http://localhost:8080/api/v1/users/me
```

### 2. Проверка серверов
```bash
# Список серверов
curl http://localhost:8080/api/v1/servers

# Создать подключение (требуется auth)
curl -X POST -H "X-Telegram-Init-Data: ..." \
  -d '{"server_id": "uuid"}' \
  http://localhost:8080/api/v1/connections
```

### 3. Проверка подписок
```bash
# Список планов
curl http://localhost:8080/api/v1/subscriptions/plans

# Купить план (требуется auth)
curl -X POST -H "X-Telegram-Init-Data: ..." \
  -d '{"plan_id": "uuid"}' \
  http://localhost:8080/api/v1/subscriptions/purchase
```

### 4. Проверка поддержки
```bash
# Создать тикет
curl -X POST -H "X-Telegram-Init-Data: ..." \
  -d '{"subject": "Test", "message": "Test message", "category": "other"}' \
  http://localhost:8080/api/v1/support/tickets

# Получить тикеты
curl -H "X-Telegram-Init-Data: ..." \
  http://localhost:8080/api/v1/support/tickets
```

---

## 🔐 Безопасность

### Telegram Authentication
- Все запросы проверяют `X-Telegram-Init-Data` заголовок
- Backend верифицирует подпись через Telegram Bot API
- Нет паролей, полностью Telegram-based auth

### Rate Limiting
- 10 запросов/секунду на IP адрес
- Burst до 20 запросов
- Автоматическая очистка каждые 10 минут

### Docker Secrets
- Пароли хранятся как Docker secrets
- Не передаются через environment variables
- Читаются из файлов в `/run/secrets/`

---

## 📁 Структура проекта

```
copy-of-xray-vpn-connect/
├── backend/                    # Go backend
│   ├── cmd/main.go            # Точка входа
│   ├── internal/
│   │   ├── handlers/          # API handlers
│   │   ├── middleware/        # Middleware (auth, rate limit)
│   │   ├── models/            # Database models
│   │   ├── database/          # DB connection
│   │   └── config/            # Configuration
│   ├── docker-compose.yml     # Dev environment
│   └── docker-compose.swarm.yml  # Production Swarm
│
├── src/                       # React frontend
│   ├── pages/                 # Page components
│   │   ├── Main.tsx          # Home page
│   │   ├── Shop.tsx          # Subscription shop
│   │   ├── Tunnels.tsx       # Server connections
│   │   ├── Support.tsx       # Support tickets
│   │   └── Admin.tsx         # Admin panel
│   ├── services/
│   │   ├── api.ts            # User API client
│   │   └── adminApi.ts       # Admin API client
│   ├── components/            # Reusable components
│   └── App.tsx               # Main app component
│
├── dist/                      # Frontend build output
├── Dockerfile                 # Frontend Docker image
├── nginx.conf                 # Nginx config for SPA
└── BACKEND_FRONTEND_INTEGRATION.md  # Integration docs
```

---

## 🎯 Что делает каждая страница

### 1. Main (Главная)
- Показывает статус подписки
- Админ панель (если пользователь админ)
- Быстрый доступ к серверам и инструкциям
- Отображает сообщения от админа

**API вызовы:**
- `GET /api/v1/users/me` - данные пользователя
- `GET /api/v1/subscriptions/me` - статус подписки

### 2. Shop (Магазин)
- Показывает доступные планы подписки
- Текущий баланс
- Кнопка пополнения
- Покупка плана

**API вызовы:**
- `GET /api/v1/subscriptions/plans` - список планов
- `POST /api/v1/subscriptions/purchase` - покупка
- `POST /api/v1/users/topup` - пополнение баланса

### 3. Tunnels (Серверы)
- Список доступных серверов (из базы данных)
- Создание VPN подключений
- Копирование конфигурации
- Сообщить о проблеме

**API вызовы:**
- `GET /api/v1/servers` - список серверов
- `POST /api/v1/connections` - создать подключение
- `GET /api/v1/connections` - получить подключения

### 4. Support (Поддержка)
- Создание тикетов поддержки
- Чат с поддержкой
- История обращений
- Статусы тикетов

**API вызовы:**
- `GET /api/v1/support/tickets` - список тикетов
- `POST /api/v1/support/tickets` - создать тикет
- `POST /api/v1/support/tickets/:id/messages` - отправить сообщение

### 5. Admin (Админ панель)
- Управление серверами (CRUD)
- Управление пользователями
- Управление планами
- Ответы на тикеты
- Статистика

**API вызовы:**
- `GET /api/v1/admin/stats` - статистика
- `GET/POST/PUT/DELETE /api/v1/admin/servers` - серверы
- `GET/PUT /api/v1/admin/users` - пользователи
- `GET/POST/PUT/DELETE /api/v1/admin/plans` - планы
- `GET /api/v1/admin/tickets` - все тикеты
- `POST /api/v1/admin/tickets/:id/reply` - ответить на тикет

---

## 🐛 Troubleshooting

### Backend не запускается
```bash
# Проверить логи
docker-compose logs -f api

# Проверить подключение к БД
docker-compose exec postgres psql -U xray -d xray_vpn -c "SELECT 1"

# Проверить переменные окружения
docker-compose exec api env | grep DB
```

### Frontend не подключается к API
```bash
# Проверить VITE_API_BASE_URL в .env
cat .env

# Проверить CORS на backend
curl -I http://localhost:8080/api/v1/servers

# Проверить network в браузере (DevTools → Network)
```

### Telegram authentication не работает
```bash
# Проверить TELEGRAM_BOT_TOKEN
docker-compose exec api env | grep TELEGRAM

# Проверить что initData передается в заголовке
# (в браузере DevTools → Network → Request Headers)

# Тестовый запрос с debug логами
docker-compose logs -f api
```

### Rate limit срабатывает
```bash
# Увеличить лимит в config.yaml или .env
# По умолчанию: 10 req/s, burst 20

# Или отключить для разработки
# В backend/internal/handlers/handlers.go
# Закомментировать: router.Use(rateLimiter.Middleware())
```

---

## 📚 Дополнительная документация

- **[BACKEND_FRONTEND_INTEGRATION.md](./BACKEND_FRONTEND_INTEGRATION.md)** - Полное описание интеграции
- **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** - Детальный гайд по развертыванию
- **[README.md](./README.md)** - Общий обзор проекта
- **[backend/README.md](./backend/README.md)** - API документация

---

## ✅ Чеклист готовности

### Перед развертыванием:
- [ ] Telegram Bot создан и настроен
- [ ] Bot token добавлен в конфигурацию
- [ ] Домен настроен и указывает на сервер
- [ ] SSL сертификат настроен (Let's Encrypt через Traefik)
- [ ] Docker Swarm инициализирован
- [ ] Secrets созданы (`db_password`, `telegram_bot_token`, `jwt_secret`)
- [ ] PostgreSQL база данных создана
- [ ] `.env` файлы настроены для продакшена
- [ ] Frontend собран (`npm run build`)
- [ ] Docker образы собраны

### После развертывания:
- [ ] Health check работает (`/health`)
- [ ] API отвечает (`/api/v1/servers`)
- [ ] Frontend загружается
- [ ] Telegram Mini App открывается
- [ ] Аутентификация работает
- [ ] Все основные функции протестированы

---

## 🎉 Готово к работе!

Приложение полностью готово к продакшену и развертыванию в Docker Swarm с несколькими репликами. Все функции работают, все кнопки подключены, все данные приходят из backend.

### Основные команды:

```bash
# Разработка
npm run dev                    # Frontend
cd backend && docker-compose up  # Backend

# Продакшен
cd backend
./deploy.sh production         # Развернуть в Swarm

# Проверка
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/servers
```

**Успешного запуска! 🚀**
