// Действия из mini-app: смена on/off, принять/отклонить/готов заказ.
// Все проверяются по initData; полностью эквивалентны действиям в боте.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTelegramInitData } from '@/lib/telegram-auth';
import { rkeeper } from '@/lib/rkeeper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body =
  | { kind: 'shift'; initData: string; on: boolean }
  | { kind: 'order'; initData: string; orderId: string; action: 'accept' | 'reject' | 'ready' };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as Body | null;
  if (!body?.initData) return NextResponse.json({ error: 'no initData' }, { status: 400 });
  const v = verifyTelegramInitData(body.initData);
  if (!v.ok) return NextResponse.json({ error: 'forbidden', reason: v.reason }, { status: 403 });

  const me = await prisma.staff.findUnique({ where: { tgUserId: BigInt(v.user.id) } });
  if (!me || !me.authorized) return NextResponse.json({ error: 'not_authorized' }, { status: 403 });

  if (body.kind === 'shift') {
    if (me.onShift === body.on) return NextResponse.json({ ok: true, onShift: me.onShift });
    const u = await prisma.staff.update({ where: { id: me.id }, data: { onShift: body.on } });
    return NextResponse.json({ ok: true, onShift: u.onShift });
  }

  if (body.kind === 'order') {
    const o = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { items: true, session: { include: { table: true } } },
    });
    if (!o) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const ok =
      (body.action === 'accept' && o.status === 'PENDING') ||
      (body.action === 'reject' && o.status === 'PENDING') ||
      (body.action === 'ready'  && o.status === 'ACCEPTED');
    if (!ok) return NextResponse.json({ error: 'wrong_status', status: o.status }, { status: 409 });

    const newStatus = body.action === 'accept' ? 'ACCEPTED' : body.action === 'reject' ? 'REJECTED' : 'READY';
    let updated = await prisma.order.update({
      where: { id: o.id },
      data: {
        status: newStatus, confirmedAt: new Date(),
        confirmedById: body.action === 'ready' ? o.confirmedById ?? me.id : me.id,
      },
      include: { items: true, session: { include: { table: true } } },
    });

    if (body.action === 'accept') {
      try {
        const r = await rkeeper.sendOrder(updated, updated.session.table.label);
        if (r.ok) {
          updated = await prisma.order.update({
            where: { id: updated.id },
            data: { rkeeperOrderId: r.receiptId },
            include: { items: true, session: { include: { table: true } } },
          });
        }
      } catch (e) { console.error('rkeeper send failed', e); }
    }

    await prisma.auditLog.create({
      data: {
        type: `order.${body.action}.app`,
        message: `mini-app: ${body.orderId.slice(-6).toUpperCase()} → ${newStatus}`,
        meta: { orderId: body.orderId, staffId: me.id },
      },
    });

    return NextResponse.json({
      ok: true,
      status: updated.status,
      rkeeperOrderId: updated.rkeeperOrderId,
    });
  }

  return NextResponse.json({ error: 'bad kind' }, { status: 400 });
}
