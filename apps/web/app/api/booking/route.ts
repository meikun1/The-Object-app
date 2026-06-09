// Bookings → Telegram. Работает как Next.js route handler (на Vercel —
// бесплатная serverless-функция). Токен бота берётся из Environment
// Variables площадки, в код не попадает.
//
// Те же поля и поведение, что у NestJS BookingService (для VPS-варианта).
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Body = {
  name?: string;
  phone?: string;
  date?: string;
  time?: string;
  guests?: string | number;
  note?: string;
  // honeypot
  company?: string;
};

export async function POST(req: Request) {
  let d: Body;
  try {
    d = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  if (d.company) return NextResponse.json({ ok: true });

  if (!d.name || !d.phone) {
    return NextResponse.json({ error: 'name и phone обязательны' }, { status: 422 });
  }

  const lines = [
    '🍸 Новая бронь — THE OBJECT',
    `Имя: ${d.name}`,
    `Телефон: ${d.phone}`,
    `Дата: ${d.date || '-'}   Время: ${d.time || '-'}`,
    `Гостей: ${d.guests ?? '-'}`,
  ];
  if (d.note) lines.push(`Пожелания: ${d.note}`);
  const text = lines.join('\n');

  const token = process.env.BOT_TOKEN;
  const chatId = process.env.BOOKING_CHAT_ID;
  if (!token || !chatId) {
    console.warn('BOT_TOKEN/BOOKING_CHAT_ID не заданы — бронь принята локально:\n' + text);
    return NextResponse.json({ ok: true, delivered: false });
  }

  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!tg.ok) {
    return NextResponse.json({ error: 'telegram error' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, delivered: true });
}
