# THE OBJECT

Лаундж-бар THE OBJECT: сайт-визитка + гостевой бар-конструктор за столом по QR
в одном Next.js-проекте, плюс NestJS-API и Telegram-бот бармена.

Монорепозиторий pnpm:

- `apps/web` — Next.js 14 (App Router). Лендинг «/», гостевой заказ
  «/t/[token]», админка «/admin». Дизайн — art-house noir,
  шрифты Prata + Golos Text + JetBrains Mono (через `next/font`), палитра
  `--void #0a0908` / хром / акцент `--blood #c01f33`, грейн, виньетка,
  reveal-анимации, magnetic-кнопки.
- `apps/api` — NestJS + Prisma + Postgres. Эндпоинты: `/health`,
  `/api/menu`, `/api/tables`, `/api/booking`. Дальше: сессии столов,
  Telegram-бот бармена, адаптер r_keeper.

## Маршруты

| Путь | Назначение |
| --- | --- |
| `/` | Сайт-визитка (Hero, атмосфера, барная карта, кальянная карта, галерея, контакты, форма брони). |
| `/t/[token]` | Гостевой конструктор за столом (открывается по QR). Этап 2. |
| `/admin` | Админка: меню, столы, QR, смены. Этап 6. |
| `/api/*` | NestJS (через rewrite в dev; в проде — Caddy reverse-proxy). |

## Запуск (локально)

```bash
cp .env.example .env
cp .env apps/api/.env        # Prisma читает .env из apps/api

pnpm db:up                   # Postgres + Redis в Docker
pnpm install
pnpm api:migrate             # миграции БД
pnpm api:seed                # демо-данные: 15 столов + конструктор

pnpm dev                     # одновременно: web (3000) + api (4000)
```

Что проверить:

1. `GET http://localhost:4000/health` → `{ "ok": true, ... }`.
2. `GET http://localhost:4000/api/tables` → 15 столов (13 зал + 2 VIP).
3. `GET http://localhost:4000/api/menu` → 3 основы конструктора.
4. `http://localhost:3000/` — лендинг визитки с интерактивом.
5. Форма брони шлёт `POST /api/booking` → NestJS → Telegram
   (если заданы `BOT_TOKEN` и `BOOKING_CHAT_ID`; иначе принимается локально).
6. `http://localhost:3000/t/test-token` — служебная страница гостя.
7. `http://localhost:3000/admin` — служебная страница админки.

## Требования

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Docker Desktop (PostgreSQL и Redis)

## Дорожная карта

1. **Каркас + модель данных** — готово.
2. Гостевой конструктор «/t/[token]» + общая корзина с именами (real-time).
3. Сессии столов + сброс + подписанные QR-токены.
4. Telegram-бот бармена (вход по паролю, смены, подтверждение заказов).
5. Адаптер r_keeper (мок; заказ создаётся после подтверждения).
6. Админка + генерация QR-кодов.
7. Реальная интеграция r_keeper.

Мягкий запуск возможен после Этапа 5 (бот работает, r_keeper — мок),
полноценный — после Этапа 7.

## Прод (кратко)

- Один домен: лендинг «/», заказ «/t/...», админка «/admin», API «/api/...».
- Reverse-proxy Caddy с авто-HTTPS Let's Encrypt; `/api/*` → NestJS,
  остальное → Next.js.
- Docker Compose: `web`, `api`, `postgres` (с volume), `redis`, `caddy`.
- Секреты — `.env` на сервере, не в репозитории
  (`SESSION_SECRET`, `ADMIN_ACCESS_TOKEN`, `BOT_TOKEN`,
  `BOOKING_CHAT_ID`, `BOT_ACCESS_PASSWORD`, `DATABASE_URL`, `REDIS_URL`,
  `TZ`, `BAR_CLOSE_SCHEDULE`, `RKEEPER_*`, `PUBLIC_APP_URL`).
- БД: `prisma migrate deploy` + ежедневный `pg_dump` по cron.
- Telegram-бот: в проде — webhook
  (`setWebhook https://<домен>/api/telegram/webhook`).
- QR-коды столов: подписанные ссылки `https://<домен>/t/{table_id}?sig=...`,
  PNG/PDF-наклейки печатаются из админки.
- Rate-limit на бронь, вход в админку, создание заказов.
