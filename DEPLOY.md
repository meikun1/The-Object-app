# Деплой

## Тест-стенд: Vercel (бесплатно)

Поднимает лендинг и форму брони. Гостевой `/t/[token]` и `/admin`
пока показывают заглушки — для них на следующих этапах понадобится
Postgres (например, бесплатный Neon).

### 1. Залить репозиторий

GitHub-репозиторий `meikun1/the-object-app`. Ветка `claude/focused-meitner-aa0twe`
уже запушена; смержите её в `main` или подключите Vercel прямо к ней.

### 2. Создать проект в Vercel

1. <https://vercel.com> → Add New → Project → Import репозитория.
2. **Root Directory:** `apps/web` (важно — это монорепо).
3. Framework Preset должен сам определиться как **Next.js**.
4. Build Command: оставить по умолчанию (`next build`).
5. Install Command: `pnpm install` (Vercel сам подхватит pnpm-workspace).

### 3. Переменные окружения (Environment Variables)

В Vercel → Project → Settings → Environment Variables добавить:

| Имя | Значение |
| --- | --- |
| `BOT_TOKEN` | **новый** токен от @BotFather (старый отозвать) |
| `BOOKING_CHAT_ID` | `8877197039` (ваш chat_id) |

Применить ко всем окружениям (Production / Preview / Development).

### 4. Deploy

После первого деплоя Vercel выдаст адрес вида
`https://the-object-app-xxxx.vercel.app`. Открыть → проверить:

- лендинг отрисован, грейн/виньетка/анимации работают;
- форма брони отправляется, приходит сообщение в Telegram.

### Что если форма не присылает сообщение

- Проверить, что бот **писал вам первым** (Telegram не позволит боту
  написать в чат, который сам не инициировал диалог). Откройте бота в
  Telegram, нажмите Start.
- В Vercel → Project → Logs смотреть `/api/booking` — там будет ошибка
  Telegram, если что-то не так.

---

## Прод: VPS + Caddy + Docker Compose

Описан в `README.md` (раздел «Прод (кратко)»). Используется когда:

- готовы Этапы 2–7 (гостевой заказ, бот бармена, r_keeper);
- нужен Postgres + Redis на боевой нагрузке;
- интеграция r_keeper XML API V7 (локальная, через VPN/туннель).

Тогда `/api/*` обслуживает уже NestJS, а Next.js-route-handler
`/api/booking` остаётся как fallback и идентичен по поведению.
