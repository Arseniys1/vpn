# 📁 Структура Frontend проекта

## Новая структура (после реорганизации):

```
src/
├── components/          # Переиспользуемые компоненты
│   ├── Badge.tsx
│   ├── Layout.tsx
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
│   └── index.css       # Главный CSS файл с Tailwind
├── types/              # TypeScript типы
│   └── index.ts
├── constants/          # Константы и данные
│   └── index.ts
├── services/           # API сервисы
│   └── geminiService.ts (можно удалить)
├── utils/              # Утилиты (опционально)
├── App.tsx             # Главный компонент
└── index.tsx           # Точка входа

Root:
├── index.html          # HTML шаблон (без CDN!)
├── tailwind.config.js  # Конфигурация Tailwind
├── postcss.config.js   # Конфигурация PostCSS
├── vite.config.ts      # Конфигурация Vite
└── package.json
```

## ✅ Что было сделано:

1. **Убраны все CDN зависимости** из `index.html`:
   - ❌ Tailwind CSS CDN → ✅ Локальный через npm
   - ❌ Font Awesome CDN → ✅ Локальный через npm (@fortawesome/fontawesome-free)
   - ❌ React через importmap → ✅ Локальный через npm
   - ✅ Telegram WebApp JS (остается, так как официальный скрипт)

2. **Настроен Tailwind CSS локально**:
   - `tailwind.config.js` с кастомными цветами Telegram
   - `postcss.config.js` для обработки
   - `src/styles/index.css` с `@tailwind` директивами

3. **Улучшена структура проекта**:
   - Все файлы в `src/`
   - Логичное разделение на папки
   - Алиасы для импортов (`@/` → `src/`)

4. **Настроена правильная сборка**:
   - Vite собирает все в `dist/`
   - Все стили и скрипты включены в билд
   - Оптимизация через code splitting

## 📦 Установка зависимостей:

```bash
npm install
```

## 🚀 Запуск:

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## 🔧 Что нужно еще сделать:

1. Скопировать все страницы в `src/pages/` с правильными путями
2. Убедиться что все импорты обновлены
3. Протестировать сборку

## 📝 Изменения в импортах:

Старый путь:
```tsx
import { Plan } from './types';
import { PLANS } from './constants';
```

Новый путь (тот же, так как алиасы настроены):
```tsx
import { Plan } from '@/types';
import { PLANS } from '@/constants';
```

Или относительный:
```tsx
import { Plan } from '../types';
import { PLANS } from '../constants';
```

