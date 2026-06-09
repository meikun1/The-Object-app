// CRUD на основу. PATCH — обновить, DELETE — удалить с каскадом групп/мод.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authed(req: Request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  return !!expected && req.headers.get('x-admin-token') === expected;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({} as any));

  const data: any = {};
  if (typeof body.name === 'string') {
    const v = body.name.trim();
    if (!v || v.length > 80) return NextResponse.json({ error: 'name: 1..80 символов' }, { status: 422 });
    data.name = v;
  }
  if ('description' in body) data.description = body.description ? String(body.description).slice(0, 240) : null;
  if ('price' in body) {
    const p = String(body.price);
    if (!/^\d+(\.\d{1,2})?$/.test(p)) return NextResponse.json({ error: 'price: число' }, { status: 422 });
    data.price = p;
  }
  if (typeof body.available === 'boolean') data.available = body.available;
  if (Number.isFinite(body.sortOrder)) data.sortOrder = Math.trunc(body.sortOrder);

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'нечего обновлять' }, { status: 422 });

  try {
    const base = await prisma.base.update({ where: { id: params.id }, data });
    return NextResponse.json({ base: { ...base, price: base.price.toString() } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.code === 'P2025' ? 'not found' : String(e?.message ?? e) }, { status: 404 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    // Каскад в schema: groups → modifiers удалятся автоматом.
    await prisma.base.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.code === 'P2025' ? 'not found' : String(e?.message ?? e) }, { status: 404 });
  }
}
