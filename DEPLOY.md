# Деплой

## Тест-стенд: Vercel (бесплатно)

Поднимает лендинг и форму брони. Гостевой `/t/[token]` и `/admin`
пока показывают заглушки — для них на следующих этапах понадобится
Postgres (например, бесплатный Neon).

### 1. Залить репозиторий

GitHub-репозиторий `meikun1/the-object-app`. Подключите Vercel к нужной
ветке (`main` или `claude/focused-meitner-aa0twe`).

### 2. Настройки проекта в Vercel

Конфиг `apps/web/vercel.json` лежит в репо: указывает framework и
install-команду для монорепо. В Vercel UI:

- **Root Directory:** `apps/web` (Edit → выбрать подпапку → Save).
- Framework Preset: Next.js (определится автоматически).
- Build Command / Install Command / Output Directory: **оставить
  пустыми** (Override off) — берутся из `vercel.json` и автодетекта.

### 3. Переменные окружения (Environment Variables)

В Vercel → Project → Settings → Environment Variables добавить:

| Имя | Значение |
| --- | --- |
| `BOT_TOKEN` | **новый** токен от @BotFather (старый отозвать) |
| `BOOKING_CHAT_ID` | `8877197039` (ваш chat_id) |

Применить ко всем окружениям (Production / Preview / Development).

### 4. Deploy

Deployments → ⋯ у последнего деплоя → **Redeploy**. После Success Vercel
выдаст адрес вида `https://the-object-app-xxxx.vercel.app`. Открыть → проверить:

- лендинг отрисован, грейн/виньетка/анимации работают;
- форма брони отправляется, приходит сообщение в Telegram.

### Если форма не присылает сообщение

- Проверить, что бот **писал вам первым** (Telegram не позволит боту
  написать в чат, который сам не инициировал диалог). Откройте бота в
  Telegram, нажмите Start.
- В Vercel → Project → Logs смотреть `/api/booking` — там будет ошибка
  Telegram, если что-то не так.

### Если падает с `ERR_INVALID_THIS` при install

Vercel взял старый pnpm. В Settings → General → Install Command
поставьте принудительно:

```
corepack enable && cd ../.. && pnpm install --frozen-lockfile --filter "@app/web..."
```

---

## Прод: VPS + Caddy + Docker Compose

Описан в `README.md` (раздел «Прод (кратко)»). Используется когда:

- готовы Этапы 2–7 (гостевой заказ, бот бармена, r_keeper);
- нужен Postgres + Redis на боевой нагрузке;
- интеграция r_keeper XML API V7 (локальная, через VPN/туннель).

Тогда `/api/*` обслуживает уже NestJS, а Next.js-route-handler
`/api/booking` остаётся как fallback и идентичен по поведению.
