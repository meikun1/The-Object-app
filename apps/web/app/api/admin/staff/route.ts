// Список сотрудников для админки. Защита — x-admin-token.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  if (!expected) return NextResponse.json({ error: 'ADMIN_ACCESS_TOKEN не настроен' }, { status: 500 });
  if (req.headers.get('x-admin-token') !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const staff = await prisma.staff.findMany({
    orderBy: [{ onShift: 'desc' }, { name: 'asc' }],
    select: { id: true, name: true, role: true, authorized: true, onShift: true, lastLoginAt: true },
  });
  return NextResponse.json({ staff });
}
