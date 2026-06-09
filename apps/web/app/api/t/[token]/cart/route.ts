// Добавление позиции в общую корзину стола.
// Гость идентифицируется по guestId (если есть в localStorage) или создаётся
// новый с переданным именем. Подпись токена проверяется.
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseToken, verifyTable } from '@/lib/sign';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  guestId?: string | null;
  guestName: string;
  baseId: string;
  modifierIds: string[];
  qty: number;
};

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const parsed = parseToken(params.token);
  if (!parsed) return NextResponse.json({ error: 'invalid token' }, { status: 404 });

  const table = await prisma.table.findFirst({ where: { id: parsed.tableId, active: true } });
  if (!table || !verifyTable(table.id, table.qrSecret, parsed.sig)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !body.baseId || !body.guestName?.trim()) {
    return NextResponse.json({ error: 'baseId и guestName обязательны' }, { status: 422 });
  }

  const session = await prisma.tableSession.findFirst({
    where: { tableId: table.id, status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
  }) ?? await prisma.tableSession.create({ data: { tableId: table.id } });

  // Гость: либо по guestId (валидный для этой сессии), либо новый.
  let guestId = body.guestId ?? null;
  if (guestId) {
    const ok = await prisma.guest.findFirst({ where: { id: guestId, sessionId: session.id } });
    if (!ok) guestId = null;
  }
  if (!guestId) {
    const g = await prisma.guest.create({
      data: { sessionId: session.id, name: body.guestName.trim().slice(0, 40) },
    });
    guestId = g.id;
  } else {
    // Обновим имя если поменялось.
    await prisma.guest.update({
      where: { id: guestId },
      data: { name: body.guestName.trim().slice(0, 40) },
    });
  }

  // Снимок цены и состава.
  const base = await prisma.base.findUnique({ where: { id: body.baseId } });
  if (!base || !base.available) {
    return NextResponse.json({ error: 'основа недоступна' }, { status: 422 });
  }
  const modifiers = body.modifierIds?.length
    ? await prisma.modifier.findMany({ where: { id: { in: body.modifierIds } } })
    : [];

  const unitPrice = modifiers.reduce(
    (s, m) => s.add(m.priceDelta),
    new Prisma.Decimal(base.price),
  );
  const qty = Math.max(1, Math.min(99, Number(body.qty) || 1));

  await prisma.cartItem.create({
    data: {
      sessionId: session.id,
      guestId,
      baseId: base.id,
      qty,
      unitPrice,
      modifiers: {
        create: modifiers.map((m) => ({
          modifierId: m.id,
          nameSnapshot: m.name,
          priceSnapshot: m.priceDelta,
        })),
      },
    },
  });

  return NextResponse.json({ ok: true, guestId });
}
