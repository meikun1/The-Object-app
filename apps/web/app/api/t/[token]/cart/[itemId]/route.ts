// Удаление позиции из общей корзины. Любой за столом может удалять —
// договорённость гостей. (Хочется ограничить «только свои» — добавляем
// проверку guestId в headers; пока пропускаем для простоты.)
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseToken, verifyTable } from '@/lib/sign';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { token: string; itemId: string } }) {
  const parsed = parseToken(params.token);
  if (!parsed) return NextResponse.json({ error: 'invalid token' }, { status: 404 });

  const table = await prisma.table.findFirst({ where: { id: parsed.tableId, active: true } });
  if (!table || !verifyTable(table.id, table.qrSecret, parsed.sig)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 404 });
  }

  const item = await prisma.cartItem.findUnique({
    where: { id: params.itemId },
    include: { session: true },
  });
  if (!item || item.session.tableId !== table.id || item.session.status !== 'OPEN') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  await prisma.cartItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
