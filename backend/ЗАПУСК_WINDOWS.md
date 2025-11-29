# 🪟 Запуск на Windows

## Проблемы с Makefile на Windows

На Windows PowerShell синтаксис установки переменных окружения отличается от Linux/Mac.

## Решение: используйте скрипты

### Вариант 1: PowerShell скрипты (рекомендуется)

**Терминал 1 - API сервер:**
```powershell
.\run-api.ps1
```

**Терминал 2 - Worker:**
```powershell
.\run-worker.ps1
```

### Вариант 2: Batch файлы (.bat)

**Терминал 1 - API сервер:**
```cmd
run-api.bat
```

**Терминал 2 - Worker:**
```cmd
run-worker.bat
```

### Вариант 3: Прямой запуск в PowerShell

**Терминал 1 - API сервер:**
```powershell
$env:APP_ENV = "development"
go run ./cmd/api/main.go
```

**Терминал 2 - Worker:**
```powershell
$env:APP_ENV = "development"
go run ./cmd/worker/main.go
```

### Вариант 4: Прямой запуск в CMD

**Терминал 1 - API сервер:**
```cmd
set APP_ENV=development
go run ./cmd/api/main.go
```

**Терминал 2 - Worker:**
```cmd
set APP_ENV=development
go run ./cmd/worker/main.go
```

## Установка зависимостей

```powershell
go mod download
go mod tidy
```

## Docker Compose (работает на Windows)

```powershell
docker-compose up -d postgres rabbitmq
```

Затем запустите API и Worker через скрипты выше.

## Полный запуск через Docker (рекомендуется)

Если у вас установлен Docker Desktop для Windows:

```powershell
docker-compose up --build
```

Это запустит все сервисы сразу (API, Worker, PostgreSQL, RabbitMQ).

## Решение проблемы с go.sum

Если видите ошибку с go.sum:
```powershell
# Удалите go.sum если он есть
Remove-Item go.sum -ErrorAction SilentlyContinue

# Переустановите зависимости
go mod download
go mod tidy
```

## Проверка работы

Откройте новый терминал PowerShell и выполните:

```powershell
curl http://localhost:8080/health
```

Или используйте браузер: http://localhost:8080/health

## Рекомендуемый порядок запуска:

1. **Запустите инфраструктуру:**
   ```powershell
   docker-compose up -d postgres rabbitmq
   ```

2. **Подождите 30 секунд** для запуска сервисов

3. **Настройте конфиг:**
   ```powershell
   Copy-Item configs\config.example.yaml configs\config.yaml
   # Отредактируйте config.yaml в любом редакторе
   ```

4. **Установите зависимости:**
   ```powershell
   go mod download
   go mod tidy
   ```

5. **Запустите API:**
   ```powershell
   .\run-api.ps1
   ```

6. **В другом терминале запустите Worker:**
   ```powershell
   .\run-worker.ps1
   ```

## Альтернатива: WSL2

Если вы используете WSL2 (Windows Subsystem for Linux), можно использовать стандартные команды Linux:

```bash
make run-api
make run-worker
```

