// Меню конструктора: основы → группы → модификаторы. Только доступные.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const bases = await prisma.base.findMany({
    where: { available: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      groups: {
        orderBy: { sortOrder: 'asc' },
        include: {
          modifiers: {
            where: { available: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });
  return NextResponse.json({ bases });
}
