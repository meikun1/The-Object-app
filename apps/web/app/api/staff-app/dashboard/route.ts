// Полное состояние панели бармена для Telegram Mini App.
// initData приходит из tg.WebApp.initData — подпись проверяется.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTelegramInitData } from '@/lib/telegram-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function startOfToday(): Date {
  const tz = process.env.TZ || 'Europe/Moscow';
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return new Date(`${ymd}T00:00:00`);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { initData?: string } | null;
  if (!body?.initData) {
    return NextResponse.json({ error: 'no initData' }, { status: 400 });
  }
  const v = verifyTelegramInitData(body.initData);
  if (!v.ok) {
    return NextResponse.json({ error: 'forbidden', reason: v.reason }, { status: 403 });
  }

  const me = await prisma.staff.findUnique({ where: { tgUserId: BigInt(v.user.id) } });
  if (!me || !me.authorized) {
    return NextResponse.json({
      ok: false,
      needLogin: true,
      message: 'Войдите через /login ПАРОЛЬ в чате с ботом, потом откройте панель снова.',
    });
  }

  const since = startOfToday();
  const [active, todayReady, openSessions, allStaff, todayAgg] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ['PENDING', 'ACCEPTED'] } },
      orderBy: { createdAt: 'asc' },
      include: {
        items: true,
        session: { include: { table: true, guests: true } },
        confirmedBy: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      where: { status: { in: ['READY', 'REJECTED'] }, confirmedAt: { gte: since } },
      orderBy: { confirmedAt: 'desc' },
      take: 12,
      include: {
        items: true,
        session: { include: { table: true } },
        confirmedBy: { select: { name: true } },
      },
    }),
    prisma.tableSession.findMany({
      where: { status: 'OPEN' },
      include: { table: true, guests: true, cartItems: true, orders: { where: { status: { in: ['PENDING', 'ACCEPTED', 'READY'] } } } },
    }),
    prisma.staff.findMany({
      where: { authorized: true },
      orderBy: [{ onShift: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, role: true, onShift: true, lastLoginAt: true },
    }),
    prisma.order.aggregate({
      where: { confirmedById: me.id, status: { in: ['ACCEPTED', 'READY'] }, confirmedAt: { gte: since } },
      _sum: { total: true }, _count: { _all: true },
    }),
  ]);

  const totalTablesActive = await prisma.table.count({ where: { active: true } });

  return NextResponse.json({
    ok: true,
    me: {
      id: me.id,
      name: me.name,
      role: me.role,
      onShift: me.onShift,
      lastLoginAt: me.lastLoginAt,
    },
    activeOrders: active.map((o) => ({
      id: o.id,
      short: o.id.slice(-6).toUpperCase(),
      status: o.status,
      total: o.total.toString(),
      createdAt: o.createdAt.toISOString(),
      confirmedAt: o.confirmedAt?.toISOString() ?? null,
      confirmedBy: o.confirmedBy?.name ?? null,
      rkeeperOrderId: o.rkeeperOrderId,
      table: o.session.table.label,
      tableKind: o.session.table.kind,
      guests: o.session.guests.map((g) => g.name),
      items: o.items.map((i) => ({
        guestName: i.guestName,
        summary: i.summary,
        qty: i.qty,
        lineTotal: i.lineTotal.toString(),
      })),
    })),
    todayHistory: todayReady.map((o) => ({
      id: o.id,
      short: o.id.slice(-6).toUpperCase(),
      status: o.status,
      total: o.total.toString(),
      confirmedAt: o.confirmedAt?.toISOString() ?? null,
      confirmedBy: o.confirmedBy?.name ?? null,
      rkeeperOrderId: o.rkeeperOrderId,
      table: o.session.table.label,
    })),
    tables: {
      total: totalTablesActive,
      openSessions: openSessions.map((s) => ({
        sessionId: s.id,
        table: s.table.label,
        kind: s.table.kind,
        guestsCount: s.guests.length,
        cartCount: s.cartItems.length,
        liveOrders: s.orders.length,
        openedAt: s.openedAt.toISOString(),
      })),
    },
    staff: allStaff.map((s) => ({
      id: s.id, name: s.name, role: s.role,
      onShift: s.onShift,
      lastLoginAt: s.lastLoginAt?.toISOString() ?? null,
      isMe: s.id === me.id,
    })),
    todayStats: {
      myAccepted: todayAgg._count._all,
      myRevenue: todayAgg._sum.total?.toString() ?? '0',
    },
  });
}
