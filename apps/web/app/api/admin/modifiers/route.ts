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

  if (!body.groupId) return NextResponse.json({ error: 'groupId обязателен' }, { status: 422 });
  const name = String(body.name ?? '').trim();
  if (!name || name.length > 60) return NextResponse.json({ error: 'name: 1..60 символов' }, { status: 422 });
  const priceDelta = String(body.priceDelta ?? '0');
  if (!/^-?\d+(\.\d{1,2})?$/.test(priceDelta)) {
    return NextResponse.json({ error: 'priceDelta: число' }, { status: 422 });
  }

  const last = await prisma.modifier.findFirst({
    where: { groupId: body.groupId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const modifier = await prisma.modifier.create({
    data: {
      groupId: body.groupId,
      name,
      priceDelta,
      defaultSelected: !!body.defaultSelected,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      available: true,
    },
  });
  return NextResponse.json({ modifier: { ...modifier, priceDelta: modifier.priceDelta.toString() } });
}
