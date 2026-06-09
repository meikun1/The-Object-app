// Создание заказа гостем за столом. Этап 4: после сохранения шлём
// уведомление всем сотрудникам на смене с кнопками «Принять» / «Отклонить».
// Если на смене никого нет — фолбэк в BOOKING_CHAT_ID (как раньше),
// чтобы заказ не потерялся.
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { notifyShiftAboutOrder } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ItemIn = {
  baseId: string;
  qty: number;
  modifierIds: string[];
};

type OrderIn = {
  tableId: string;
  guestName: string;
  items: ItemIn[];
};

export async function POST(req: Request) {
  let body: OrderIn;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  if (!body.tableId || !body.guestName || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'tableId, guestName, items обязательны' }, { status: 422 });
  }

  // Грузим основы и модификаторы одним запросом — цены считаем на сервере,
  // нельзя доверять клиенту.
  const baseIds = Array.from(new Set(body.items.map((i) => i.baseId)));
  const modIds = Array.from(new Set(body.items.flatMap((i) => i.modifierIds ?? [])));
  const [bases, modifiers] = await Promise.all([
    prisma.base.findMany({ where: { id: { in: baseIds } } }),
    prisma.modifier.findMany({ where: { id: { in: modIds } } }),
  ]);
  const baseById = new Map(bases.map((b) => [b.id, b]));
  const modById = new Map(modifiers.map((m) => [m.id, m]));

  // Берём или создаём открытую сессию стола (полноценные сессии — Этап 3).
  let session = await prisma.tableSession.findFirst({
    where: { tableId: body.tableId, status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
  });
  if (!session) {
    session = await prisma.tableSession.create({ data: { tableId: body.tableId } });
  }

  const guest = await prisma.guest.create({
    data: { sessionId: session.id, name: body.guestName },
  });

  // Считаем позиции и итог.
  let total = new Prisma.Decimal(0);
  const orderItemsData = body.items.map((it) => {
    const base = baseById.get(it.baseId);
    if (!base) throw new Error(`base ${it.baseId} not found`);
    const mods = (it.modifierIds ?? []).map((id) => {
      const m = modById.get(id);
      if (!m) throw new Error(`modifier ${id} not found`);
      return m;
    });
    const unitPrice = mods.reduce(
      (s, m) => s.add(m.priceDelta),
      new Prisma.Decimal(base.price),
    );
    const qty = Math.max(1, Math.min(99, Number(it.qty) || 1));
    const lineTotal = unitPrice.mul(qty);
    total = total.add(lineTotal);
    const summary = [base.name, ...mods.map((m) => m.name)].join(', ');
    return {
      guestName: body.guestName,
      baseName: base.name,
      summary,
      detail: { baseId: base.id, mods: mods.map((m) => ({ id: m.id, name: m.name, priceDelta: m.priceDelta.toString() })) } as Prisma.InputJsonValue,
      qty,
      unitPrice,
      lineTotal,
    };
  });

  const order = await prisma.order.create({
    data: {
      sessionId: session.id,
      total,
      items: { create: orderItemsData },
    },
    include: { items: true },
  });

  // Параллельно — уведомление сменам с кнопками подтверждения.
  // Если на смене никого — фолбэк в BOOKING_CHAT_ID, чтобы заказ не потерялся.
  const table = await prisma.table.findUnique({ where: { id: body.tableId } });
  void (async () => {
    try {
      const delivered = await notifyShiftAboutOrder(order, table?.label ?? body.tableId, body.guestName);
      if (delivered === 0) await fallbackNotify(order, table?.label ?? body.tableId, body.guestName);
    } catch (e) {
      console.error('orders: notify failed', e);
      await fallbackNotify(order, table?.label ?? body.tableId, body.guestName);
    }
  })();

  return NextResponse.json({ ok: true, orderId: order.id, total: total.toString() });
}

async function fallbackNotify(
  order: { items: { baseName: string; summary: string; qty: number; lineTotal: Prisma.Decimal }[] },
  tableLabel: string,
  guestName: string,
) {
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.BOOKING_CHAT_ID;
  if (!token || !chatId) return;
  const lines = [
    '🛎 Новый заказ — THE OBJECT',
    '(никто не на смене, отправляю в общий чат)',
    `Стол: ${tableLabel}`,
    `Гость: ${guestName}`,
    '',
    ...order.items.map((i) => `• ${i.qty}× ${i.summary} — ${i.lineTotal} ₽`),
  ];
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') }),
    });
  } catch (e) {
    console.error('orders: fallback telegram notify failed', e);
  }
}
