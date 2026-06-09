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

  // PNG, фирменная тёплая палитра: глубокий warm-black на кремовом фоне.
  // errorCorrectionLevel:'H' даёт ~30% запаса под повреждение → центр можно
  // безопасно перекрыть логотипом, телефоны всё равно прочитают.
  const png = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 720,
    color: { dark: '#15110c', light: '#f1e9da' },
  });

  return NextResponse.json({ url, png });
}
