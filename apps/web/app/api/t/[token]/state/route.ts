// Состояние стола для гостевого конструктора:
// корзина (общая), список гостей сессии, история отправленных заказов.
// Проверка подписи на каждом запросе.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseToken, verifyTable } from '@/lib/sign';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const parsed = parseToken(params.token);
  if (!parsed) return NextResponse.json({ error: 'invalid token' }, { status: 404 });

  const table = await prisma.table.findFirst({
    where: { id: parsed.tableId, active: true },
  });
  if (!table || !verifyTable(table.id, table.qrSecret, parsed.sig)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 404 });
  }

  const session = await ensureOpenSession(table.id);

  const [cartItems, orders] = await Promise.all([
    prisma.cartItem.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      include: { guest: true, modifiers: true, base: true },
    }),
    prisma.order.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
      take: 10,
    }),
  ]);

  const cart = cartItems.map((c) => ({
    id: c.id,
    guestId: c.guestId,
    guestName: c.guest.name,
    summary: [c.base.name, ...c.modifiers.map((m) => m.nameSnapshot)].join(', '),
    qty: c.qty,
    unitPrice: c.unitPrice.toString(),
    lineTotal: c.unitPrice.mul(c.qty).toString(),
  }));
  const cartTotal = cartItems
    .reduce((s, c) => s + Number(c.unitPrice) * c.qty, 0)
    .toFixed(2);

  const ordersOut = orders.map((o) => ({
    id: o.id,
    status: o.status,
    total: o.total.toString(),
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      guestName: i.guestName,
      summary: i.summary,
      qty: i.qty,
      lineTotal: i.lineTotal.toString(),
    })),
  }));

  return NextResponse.json({
    tableLabel: table.label,
    sessionId: session.id,
    cart,
    cartTotal,
    orders: ordersOut,
  });
}

async function ensureOpenSession(tableId: string) {
  const existing = await prisma.tableSession.findFirst({
    where: { tableId, status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
  });
  if (existing) return existing;
  return prisma.tableSession.create({ data: { tableId } });
}
