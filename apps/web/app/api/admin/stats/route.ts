// Статистика заведения по дням / неделям. Защита x-admin-token.
// Возвращает данные за последние 30 дней:
//   - всего принятых заказов (ACCEPTED+READY),
//   - сумма принятых,
//   - кол-во отклонённых,
//   - разбивка по дням (ISO-дата YYYY-MM-DD),
//   - разбивка по последним 8 неделям (понедельник—воскресенье).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dayKey(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function weekStart(d: Date): Date {
  const r = new Date(d);
  const dow = (r.getUTCDay() + 6) % 7; // понедельник=0
  r.setUTCDate(r.getUTCDate() - dow);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

export async function GET(req: Request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  if (!expected || req.headers.get('x-admin-token') !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const tz = process.env.TZ || 'Europe/Moscow';
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  since.setUTCHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    select: { id: true, total: true, status: true, createdAt: true, items: { select: { qty: true } } },
  });

  // Агрегации
  const byDay = new Map<string, { count: number; total: number; items: number; rejected: number }>();
  const byWeek = new Map<string, { count: number; total: number; items: number; rejected: number }>();
  let totalAccepted = 0;
  let totalRevenue = 0;
  let totalRejected = 0;
  let totalItems = 0;

  for (const o of orders) {
    const d = o.createdAt;
    const day = dayKey(d, tz);
    const w = dayKey(weekStart(d), tz);
    const dayAgg = byDay.get(day) ?? { count: 0, total: 0, items: 0, rejected: 0 };
    const weekAgg = byWeek.get(w) ?? { count: 0, total: 0, items: 0, rejected: 0 };
    const sum = Number(o.total);
    const qty = o.items.reduce((s, i) => s + i.qty, 0);

    if (o.status === 'REJECTED') {
      dayAgg.rejected++; weekAgg.rejected++; totalRejected++;
    } else {
      dayAgg.count++; weekAgg.count++; totalAccepted++;
      dayAgg.total += sum; weekAgg.total += sum; totalRevenue += sum;
      dayAgg.items += qty; weekAgg.items += qty; totalItems += qty;
    }
    byDay.set(day, dayAgg); byWeek.set(w, weekAgg);
  }

  const days = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, agg]) => ({ date, ...agg, total: Number(agg.total.toFixed(2)) }));
  const weeks = Array.from(byWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStart, agg]) => ({ weekStart, ...agg, total: Number(agg.total.toFixed(2)) }));

  return NextResponse.json({
    summary: {
      sinceISO: since.toISOString(),
      totalAccepted, totalRevenue: Number(totalRevenue.toFixed(2)), totalRejected, totalItems,
    },
    days,
    weeks,
  });
}
