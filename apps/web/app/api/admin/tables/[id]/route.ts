// CRUD на конкретный стол. Защита — заголовок x-admin-token.
// GET   /api/admin/tables/[id]  — текущие поля стола.
// PATCH /api/admin/tables/[id]  — обновить label/kind/active/sortOrder.
// DELETE /api/admin/tables/[id] — удалить (если нет сессий/заказов).
import { NextResponse } from 'next/server';
import { TableKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authed(req: Request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  return !!expected && req.headers.get('x-admin-token') === expected;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const table = await prisma.table.findUnique({
    where: { id: params.id },
    select: { id: true, label: true, kind: true, active: true, sortOrder: true, createdAt: true },
  });
  if (!table) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ table });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({} as any));

  const data: { label?: string; kind?: TableKind; active?: boolean; sortOrder?: number } = {};
  if (typeof body.label === 'string') {
    const v = body.label.trim();
    if (!v || v.length > 40) return NextResponse.json({ error: 'label: 1..40 символов' }, { status: 422 });
    data.label = v;
  }
  if (body.kind === 'HALL' || body.kind === 'VIP') data.kind = body.kind;
  if (typeof body.active === 'boolean') data.active = body.active;
  if (Number.isFinite(body.sortOrder)) data.sortOrder = Math.trunc(body.sortOrder);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'нечего обновлять' }, { status: 422 });
  }

  try {
    const updated = await prisma.table.update({
      where: { id: params.id },
      data,
      select: { id: true, label: true, kind: true, active: true, sortOrder: true },
    });
    return NextResponse.json({ table: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.code === 'P2025' ? 'not found' : String(e?.message ?? e) }, { status: 404 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const ordersCount = await prisma.order.count({
    where: { session: { tableId: params.id } },
  });
  if (ordersCount > 0) {
    return NextResponse.json(
      { error: `Нельзя удалить: у стола есть заказы (${ordersCount}). Снимите «активен», чтобы убрать его из списка.` },
      { status: 409 },
    );
  }

  try {
    await prisma.tableSession.deleteMany({ where: { tableId: params.id } });
    await prisma.table.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.code === 'P2025' ? 'not found' : String(e?.message ?? e) }, { status: 404 });
  }
}
