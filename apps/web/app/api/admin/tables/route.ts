// Создание нового стола из админки. Защита — x-admin-token.
// Также можно получить полный список столов (включая неактивные).
import { NextResponse } from 'next/server';
import { TableKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authed(req: Request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  return !!expected && req.headers.get('x-admin-token') === expected;
}

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const tables = await prisma.table.findMany({
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }],
    select: { id: true, label: true, kind: true, active: true, sortOrder: true },
  });
  return NextResponse.json({ tables });
}

export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({} as any));

  const label = String(body.label ?? '').trim();
  if (!label || label.length > 40) {
    return NextResponse.json({ error: 'label: 1..40 символов' }, { status: 422 });
  }
  const kind: TableKind = body.kind === 'VIP' ? 'VIP' : 'HALL';

  // По умолчанию ставим в конец своей категории.
  const last = await prisma.table.findFirst({
    where: { kind },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? (kind === 'VIP' ? 100 : 0)) + 1;

  const table = await prisma.table.create({
    data: { label, kind, sortOrder },
    select: { id: true, label: true, kind: true, active: true, sortOrder: true },
  });
  return NextResponse.json({ table });
}
