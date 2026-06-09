# THE OBJECT

Лаундж-бар THE OBJECT: сайт-визитка + гостевой бар-конструктор за столом по QR
в одном Next.js-проекте, плюс NestJS-API и Telegram-бот бармена.

> Каркас: монорепозиторий pnpm — `apps/web` (Next.js, лендинг + гостевой
> заказ + админка) и `apps/api` (NestJS + Prisma).

## Маршруты

- `/` — сайт-визитка (Hero, атмосфера, барная карта, кальянная карта,
  галерея, контакты, форма брони).
- `/t/[token]` — гостевой конструктор за столом (открывается по QR).
- `/admin` — админка (меню, столы, QR, смены).
- `/api/*` — Next.js-прокси и/или NestJS-эндпоинты.

## Запуск (локально, по шагам)

```bash
cp .env.example .env
cp .env apps/api/.env        # Prisma читает .env из папки apps/api

pnpm db:up                   # Postgres + Redis в Docker
pnpm install
pnpm api:migrate             # миграции БД
pnpm api:seed                # демо-данные: 15 столов + конструктор

pnpm dev                     # одновременно: web (3000) + api (4000)
```

## Требования

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Docker Desktop (для PostgreSQL и Redis)
