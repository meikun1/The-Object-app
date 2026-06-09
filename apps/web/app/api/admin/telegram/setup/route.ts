// Настройка webhook Telegram. POST включает webhook на текущий домен,
// GET возвращает текущий статус (что показывает Telegram про наш bot).
// Защита — заголовок x-admin-token.
import { NextResponse } from 'next/server';
import { deleteWebhook, getWebhookInfo, setWebhook } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authed(req: Request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  return !!expected && req.headers.get('x-admin-token') === expected;
}

function publicBase(req: Request): string {
  return (
    process.env.PUBLIC_APP_URL
    || req.headers.get('origin')
    || `https://${req.headers.get('host')}`
  ).replace(/\/$/, '');
}

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const info = await getWebhookInfo();
    return NextResponse.json({ info });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const url = `${publicBase(req)}/api/telegram/webhook`;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
    await setWebhook(url, secret);
    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    await deleteWebhook();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
