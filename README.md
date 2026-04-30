# agro-analytics-frontend

Отдельный аналитический микрофронт (Vue + Vite), который встраивается в основное приложение через `iframe`.

## Стек
- Vue 3
- Vite
- Chart.js
- Docker / Nginx

## Быстрый запуск
```bash
docker network create agronetwork 2>/dev/null || true
docker compose up -d --build
```

Приложение будет доступно по адресу `http://localhost:9001`.

## Разработка (HMR в Docker)
```bash
docker compose -f docker-compose.dev.yml up
```

## Переменные окружения
Скопируйте `.env.example` в `.env` и при необходимости укажите:
- `VITE_PARENT_ORIGIN_ALLOWLIST` - список разрешённых origin хоста.

## Полезные команды
```bash
npm run dev
npm run test:ci
npm run build
```
