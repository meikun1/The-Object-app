// Настройка webhook Telegram + список команд для меню бота.
// POST включает webhook + регистрирует /-команды.
// GET возвращает текущий статус webhook.
// Защита — заголовок x-admin-token.
import { NextResponse } from 'next/server';
import { deleteWebhook, getWebhookInfo, setMyCommands, setWebhook } from '@/lib/telegram';
import { COMMANDS } from '@/lib/bot-ui';

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
    // Регистрируем команды — Telegram покажет их в меню «/».
    try { await setMyCommands(COMMANDS); } catch (e) { console.warn('setMyCommands', e); }
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
