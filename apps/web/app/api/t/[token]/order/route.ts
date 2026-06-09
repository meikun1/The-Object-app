// Отправка общей корзины как нового заказа.
// Берём все позиции корзины открытой сессии стола, копируем в OrderItem
// со снимком имени гостя, очищаем корзину, шлём уведомление сменам.
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseToken, verifyTable } from '@/lib/sign';
import { notifyShiftAboutOrder } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const parsed = parseToken(params.token);
  if (!parsed) return NextResponse.json({ error: 'invalid token' }, { status: 404 });

  const table = await prisma.table.findFirst({ where: { id: parsed.tableId, active: true } });
  if (!table || !verifyTable(table.id, table.qrSecret, parsed.sig)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 404 });
  }

  const session = await prisma.tableSession.findFirst({
    where: { tableId: table.id, status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
    include: {
      cartItems: {
        include: { guest: true, base: true, modifiers: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!session || session.cartItems.length === 0) {
    return NextResponse.json({ error: 'корзина пуста' }, { status: 422 });
  }

  let total = new Prisma.Decimal(0);
  const orderItems = session.cartItems.map((c) => {
    const lineTotal = c.unitPrice.mul(c.qty);
    total = total.add(lineTotal);
    const summary = [c.base.name, ...c.modifiers.map((m) => m.nameSnapshot)].join(', ');
    return {
      guestName: c.guest.name,
      baseName: c.base.name,
      summary,
      detail: {
        baseId: c.baseId,
        mods: c.modifiers.map((m) => ({
          id: m.modifierId,
          name: m.nameSnapshot,
          priceDelta: m.priceSnapshot.toString(),
        })),
      } as Prisma.InputJsonValue,
      qty: c.qty,
      unitPrice: c.unitPrice,
      lineTotal,
    };
  });

  // Транзакционно: создаём заказ, очищаем корзину.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        sessionId: session.id,
        total,
        items: { create: orderItems },
      },
      include: { items: true },
    });
    await tx.cartItem.deleteMany({ where: { sessionId: session.id } });
    return created;
  });

  // Имя стола и «первого гостя» (для шапки сообщения).
  const firstGuest = await prisma.guest.findFirst({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
  });

  void (async () => {
    try {
      const delivered = await notifyShiftAboutOrder(order, table.label, firstGuest?.name ?? 'Гости');
      if (delivered === 0) await fallbackNotify(order, table.label);
    } catch (e) {
      console.error('order submit notify failed', e);
    }
  })();

  return NextResponse.json({ ok: true, orderId: order.id, total: total.toString() });
}

async function fallbackNotify(order: { items: any[] }, tableLabel: string) {
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.BOOKING_CHAT_ID;
  if (!token || !chatId) return;
  const lines = [
    '🛎 Новый заказ — THE OBJECT',
    '(никто не на смене, отправляю в общий чат)',
    `Стол: ${tableLabel}`,
    '',
    ...order.items.map((i: any) => `• ${i.qty}× ${i.summary} — ${i.lineTotal} ₽ (${i.guestName})`),
  ];
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') }),
    });
  } catch (e) {
    console.error('fallback telegram notify failed', e);
  }
}
