// Проверка подписи initData из Telegram Mini App.
// initData приходит как query-string, hash подписан HMAC-SHA256 от секрета,
// производного от BOT_TOKEN: secretKey = HMAC('WebAppData', BOT_TOKEN).
//
// Документация:
//   https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
import { createHmac, timingSafeEqual } from 'crypto';

export type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type VerifyResult =
  | { ok: true; user: TgUser; authDate: number }
  | { ok: false; reason: string };

export function verifyTelegramInitData(initData: string, maxAgeSec = 60 * 60 * 6): VerifyResult {
  if (!initData) return { ok: false, reason: 'empty initData' };
  const token = process.env.BOT_TOKEN;
  if (!token) return { ok: false, reason: 'BOT_TOKEN не задан' };

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'no hash' };
  params.delete('hash');

  // data_check_string: «key=value» отсортированные по ключу, разделитель \n.
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(token).digest();
  const calcHex = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // Timing-safe сравнение.
  const a = Buffer.from(calcHex, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad signature' };
  }

  // Проверка возраста.
  const authDate = Number(params.get('auth_date') ?? 0);
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { ok: false, reason: 'no auth_date' };
  }
  if (Date.now() / 1000 - authDate > maxAgeSec) {
    return { ok: false, reason: 'initData expired' };
  }

  const userRaw = params.get('user');
  if (!userRaw) return { ok: false, reason: 'no user' };
  let user: TgUser;
  try { user = JSON.parse(userRaw) as TgUser; }
  catch { return { ok: false, reason: 'bad user json' }; }
  if (!user?.id) return { ok: false, reason: 'no user.id' };

  return { ok: true, user, authDate };
}
