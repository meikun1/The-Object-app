import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const tables = await prisma.table.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, label: true, kind: true, sortOrder: true },
  });
  return NextResponse.json({ tables });
}
