// Создание основы конструктора.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authed(req: Request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  return !!expected && req.headers.get('x-admin-token') === expected;
}

export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({} as any));

  const name = String(body.name ?? '').trim();
  if (!name || name.length > 80) {
    return NextResponse.json({ error: 'name: 1..80 символов' }, { status: 422 });
  }
  const description = body.description ? String(body.description).slice(0, 240) : null;
  const category = body.category ? String(body.category).trim().slice(0, 40) || null : null;
  const price = String(body.price ?? '');
  if (!/^\d+(\.\d{1,2})?$/.test(price)) {
    return NextResponse.json({ error: 'price: число с не более чем 2 знаками после точки' }, { status: 422 });
  }

  const last = await prisma.base.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
  const sortOrder = (last?.sortOrder ?? 0) + 1;

  const base = await prisma.base.create({
    data: { name, description, price, category, sortOrder, available: true },
  });
  return NextResponse.json({ base: { ...base, price: base.price.toString() } });
}
