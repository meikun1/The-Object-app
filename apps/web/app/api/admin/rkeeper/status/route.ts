// Текущий режим r_keeper-адаптера для отображения в админке.
import { NextResponse } from 'next/server';
import { rkeeperMode } from '@/lib/rkeeper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  if (!expected || req.headers.get('x-admin-token') !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ mode: rkeeperMode });
}
