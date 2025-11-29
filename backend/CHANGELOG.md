# Changelog

## [Unreleased]

### Удалено
- ❌ Удален весь AI функционал (файлы ai.go и связанные)
- ❌ Удалены настройки панелей Xray из конфига (config.yaml)
- ❌ Удалены типы XrayConfig и XrayPanelConfig из config.go

### Изменено
- ✅ Настройки панелей Xray теперь хранятся в базе данных (таблица `xray_panels`)
- ✅ Worker теперь использует панели из БД вместо конфига
- ✅ Создан сервис `XrayPanelService` для управления панелями через БД

### Добавлено
- ✅ Сервис `XrayPanelService` для CRUD операций с панелями
- ✅ Методы для получения панелей из БД:
  - `GetActivePanels()` - получить все активные панели
  - `GetPanelByID()` - получить панель по ID
  - `GetPanelByServerID()` - получить панель по серверу
  - `CreatePanel()` - создать новую панель
  - `UpdatePanel()` - обновить панель
  - `DeletePanel()` - удалить панель

## Как использовать

### Добавление панели через SQL:

```sql
INSERT INTO xray_panels (id, name, type, url, username, password, inbound_id, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Main Panel',
    '3x-ui',
    'https://your-panel.com',
    'admin',
    'password',
    1,
    true,
    NOW(),
    NOW()
);
```

### Связывание сервера с панелью:

```sql
UPDATE servers 
SET xray_panel_id = 'panel-uuid-here' 
WHERE id = 'server-uuid-here';
```

### Добавление панели через API (нужно будет реализовать):

Можно создать admin API endpoint для управления панелями.

## Миграции

Таблица `xray_panels` уже существует в моделях и будет создана автоматически при запуске миграций.

