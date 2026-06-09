// HMAC-подписи для QR-токенов столов.
// Формат токена в URL: `<tableId>.<base64url(hmac)>`
// Подпись = HMAC-SHA256(SESSION_SECRET, `${tableId}:${qrSecret}`)
// При сбросе стола qrSecret ротируется → все старые подписи становятся невалидны.
import { createHmac, timingSafeEqual } from 'crypto';

const ENC = 'base64url' as const;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET не задан или слишком короткий (минимум 16 символов)');
  }
  return s;
}

export function signTable(tableId: string, qrSecret: string): string {
  const mac = createHmac('sha256', secret())
    .update(`${tableId}:${qrSecret}`)
    .digest(ENC);
  return `${tableId}.${mac}`;
}

export type ParsedToken = { tableId: string; sig: string } | null;

export function parseToken(token: string): ParsedToken {
  const i = token.lastIndexOf('.');
  if (i <= 0 || i === token.length - 1) return null;
  return { tableId: token.slice(0, i), sig: token.slice(i + 1) };
}

export function verifyTable(tableId: string, qrSecret: string, sig: string): boolean {
  let expected: Buffer;
  let got: Buffer;
  try {
    expected = Buffer.from(
      createHmac('sha256', secret()).update(`${tableId}:${qrSecret}`).digest(ENC),
      ENC,
    );
    got = Buffer.from(sig, ENC);
  } catch {
    return false;
  }
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}
