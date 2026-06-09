// Подписанная ссылка на стол + QR-код PNG (как data-URL).
// Используется в админке для отображения и печати QR-наклейки.
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { signTable } from '@/lib/sign';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  if (!expected) return NextResponse.json({ error: 'ADMIN_ACCESS_TOKEN не настроен' }, { status: 500 });
  if (req.headers.get('x-admin-token') !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const table = await prisma.table.findUnique({ where: { id: params.id } });
  if (!table) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const token = signTable(table.id, table.qrSecret);

  const base = process.env.PUBLIC_APP_URL
    || req.headers.get('origin')
    || `https://${req.headers.get('host')}`;
  const url = `${base.replace(/\/$/, '')}/t/${token}`;

  // PNG, тёмный на белом — чтобы Telegram/принтер не уронили контраст.
  const png = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: { dark: '#0a0908', light: '#ffffff' },
  });

  return NextResponse.json({ url, png });
}
