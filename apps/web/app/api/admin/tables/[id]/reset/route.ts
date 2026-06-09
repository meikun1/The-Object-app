// Сброс стола: закрыть открытые сессии + ротировать qrSecret.
// После вызова старые QR-коды становятся невалидны — нужно сгенерировать
// и распечатать новые наклейки. Защита — заголовок x-admin-token.
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  if (!expected) return NextResponse.json({ error: 'ADMIN_ACCESS_TOKEN не настроен' }, { status: 500 });
  if (req.headers.get('x-admin-token') !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const table = await prisma.table.findUnique({ where: { id: params.id } });
  if (!table) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const newSecret = randomUUID();

  await prisma.$transaction([
    prisma.tableSession.updateMany({
      where: { tableId: table.id, status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: new Date() },
    }),
    prisma.table.update({
      where: { id: table.id },
      data: { qrSecret: newSecret },
    }),
    prisma.auditLog.create({
      data: {
        type: 'table.reset',
        message: `Стол ${table.label} сброшен`,
        meta: { tableId: table.id },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
