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
    if (!v || v.length > 60) return NextResponse.json({ error: 'name: 1..60 символов' }, { status: 422 });
    data.name = v;
  }
  if ('priceDelta' in body) {
    const p = String(body.priceDelta);
    if (!/^-?\d+(\.\d{1,2})?$/.test(p)) return NextResponse.json({ error: 'priceDelta: число' }, { status: 422 });
    data.priceDelta = p;
  }
  if (typeof body.available === 'boolean') data.available = body.available;
  if (typeof body.defaultSelected === 'boolean') data.defaultSelected = body.defaultSelected;
  if (Number.isFinite(body.sortOrder)) data.sortOrder = Math.trunc(body.sortOrder);
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'нечего обновлять' }, { status: 422 });

  try {
    const modifier = await prisma.modifier.update({ where: { id: params.id }, data });
    return NextResponse.json({ modifier: { ...modifier, priceDelta: modifier.priceDelta.toString() } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.code === 'P2025' ? 'not found' : String(e?.message ?? e) }, { status: 404 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    await prisma.modifier.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.code === 'P2025' ? 'not found' : String(e?.message ?? e) }, { status: 404 });
  }
}
