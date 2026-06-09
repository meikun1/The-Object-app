// Полное меню для админки: все основы (включая снятые с продажи)
// с группами и модификаторами. Защита — x-admin-token.
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

  const bases = await prisma.base.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      groups: {
        orderBy: { sortOrder: 'asc' },
        include: { modifiers: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });

  return NextResponse.json({
    bases: bases.map((b) => ({
      id: b.id, name: b.name, description: b.description,
      price: b.price.toString(), available: b.available, sortOrder: b.sortOrder,
      groups: b.groups.map((g) => ({
        id: g.id, name: g.name, required: g.required,
        minSelect: g.minSelect, maxSelect: g.maxSelect, sortOrder: g.sortOrder,
        modifiers: g.modifiers.map((m) => ({
          id: m.id, name: m.name,
          priceDelta: m.priceDelta.toString(),
          available: m.available, sortOrder: m.sortOrder,
        })),
      })),
    })),
  });
}
