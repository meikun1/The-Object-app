// Создание группы модификаторов внутри основы.
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

  if (!body.baseId) return NextResponse.json({ error: 'baseId обязателен' }, { status: 422 });
  const name = String(body.name ?? '').trim();
  if (!name || name.length > 60) return NextResponse.json({ error: 'name: 1..60 символов' }, { status: 422 });

  const last = await prisma.modifierGroup.findFirst({
    where: { baseId: body.baseId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const group = await prisma.modifierGroup.create({
    data: {
      baseId: body.baseId,
      name,
      required: !!body.required,
      minSelect: Number.isFinite(body.minSelect) ? Math.max(0, Math.trunc(body.minSelect)) : 0,
      maxSelect: Number.isFinite(body.maxSelect) ? Math.max(1, Math.trunc(body.maxSelect)) : 1,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  return NextResponse.json({ group });
}
