# Volleyboll

Веб-приложение для записи на волейбол: React (Vite) + Tailwind CSS, Express + SQLite, Web Push.

## Быстрый старт

### 1) Сервер

```bash
cd server
npm install
```

Сгенерируйте VAPID ключи:

```bash
npx web-push generate-vapid-keys
```

Создайте `.env` (пример):

```bash
VAPID_PUBLIC_KEY=... 
VAPID_PRIVATE_KEY=...
ADMIN_PASSWORD=admin
```

Запуск сервера:

```bash
npm run dev
```

### 2) Клиент

```bash
cd client
npm install
npm run dev
```

По умолчанию клиент ходит на `http://localhost:3001`.

## Маршруты API

- `POST /api/users`
- `GET /api/users`
- `POST /api/votes/toggle`
- `GET /api/votes`
- `POST /api/push/subscribe`
- `GET /api/push/public-key`

Админ:
- `GET /api/admin/lazy-users` (header `x-admin-password`)
- `POST /api/admin/remind-lazy`
- `DELETE /api/admin/users/:id`
- `DELETE /api/admin/votes/:id`

## Admin

Откройте `/admin` и введите пароль (по умолчанию `admin`).
