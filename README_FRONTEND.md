# 🎨 Frontend - Xray VPN Telegram Mini App

## 📁 Структура проекта

```
src/
├── components/          # UI компоненты
│   ├── Badge.tsx
│   ├── Layout.tsx       # Главный layout с навигацией
│   ├── Modal.tsx
│   ├── SectionHeader.tsx
│   └── TgCard.tsx
├── pages/              # Страницы приложения
│   ├── Instructions.tsx
│   ├── Main.tsx
│   ├── Referrals.tsx
│   ├── Shop.tsx
│   ├── Support.tsx
│   └── Tunnels.tsx
├── styles/             # Стили
│   └── index.css       # Tailwind + кастомные стили
├── types/              # TypeScript типы
│   └── index.ts
├── constants/          # Константы
│   └── index.ts
├── services/           # API сервисы (опционально)
├── App.tsx             # Главный компонент
└── index.tsx           # Точка входа
```

## 🚀 Быстрый старт

### 1. Установка зависимостей:
```bash
npm install
```

### 2. Запуск в режиме разработки:
```bash
npm run dev
```

Приложение будет доступно на: http://localhost:3000

### 3. Сборка для production:
```bash
npm run build
```

Результат в папке `dist/` - готов к деплою!

## 📦 Технологии

- **React 19** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик
- **Tailwind CSS** - стилизация
- **Font Awesome** - иконки
- **React Router** - маршрутизация

## ✅ Особенности

- ✅ Все зависимости локальные (нет CDN)
- ✅ Оптимизированная сборка
- ✅ Code splitting
- ✅ TypeScript поддержка
- ✅ Готово к production

## 📝 Скрипты

- `npm run dev` - запуск dev сервера
- `npm run build` - production сборка
- `npm run preview` - preview production сборки
- `npm run lint` - проверка TypeScript

## 🎯 Следующие шаги

1. Подключить API к бэкенду
2. Добавить обработку ошибок
3. Настроить environment переменные
4. Добавить тесты (опционально)

