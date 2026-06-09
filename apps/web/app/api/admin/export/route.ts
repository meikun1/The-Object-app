// Экспорт заказов в CSV (Excel открывает напрямую).
// CSV здесь предпочтительнее настоящего .xlsx — не требует тяжёлых
// зависимостей, файл маленький, Excel/Numbers/Google Sheets распознают
// разделители и BOM сразу.
// Параметр query ?days=N — за сколько последних дней (по умолчанию 30, до 365).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  if (!expected || req.headers.get('x-admin-token') !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? '30')));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      session: { include: { table: true } },
      confirmedBy: { select: { name: true } },
    },
  });

  // CSV: одна строка на ПОЗИЦИЮ заказа. Сводные поля заказа дублируются —
  // удобно сводить в pivot-таблице Excel.
  const header = [
    'order_id', 'order_short', 'status', 'rkeeper_id',
    'created_at', 'confirmed_at', 'confirmed_by',
    'table', 'table_kind',
    'guest', 'item_name', 'item_summary',
    'qty', 'unit_price', 'line_total', 'order_total',
  ];
  const rows: string[] = [header.join(',')];
  for (const o of orders) {
    for (const it of o.items) {
      rows.push([
        o.id,
        o.id.slice(-6).toUpperCase(),
        o.status,
        o.rkeeperOrderId ?? '',
        o.createdAt.toISOString(),
        o.confirmedAt?.toISOString() ?? '',
        o.confirmedBy?.name ?? '',
        o.session.table.label,
        o.session.table.kind,
        it.guestName,
        it.baseName,
        it.summary,
        it.qty,
        it.unitPrice.toString(),
        it.lineTotal.toString(),
        o.total.toString(),
      ].map(csvEscape).join(','));
    }
  }
  // BOM для Excel, чтобы кириллица не «поплыла» в CP1251.
  const body = '﻿' + rows.join('\n');

  const filename = `orders_${days}d_${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
