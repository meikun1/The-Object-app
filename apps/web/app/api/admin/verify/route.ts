// Проверка ADMIN_ACCESS_TOKEN. Используется страницей /admin для входа.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: 'ADMIN_ACCESS_TOKEN не настроен' }, { status: 500 });
  }
  const got = req.headers.get('x-admin-token');
  if (got !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
