// Гостевой конструктор. Токен в URL: `<tableId>.<sig>`. Подпись проверяется
// HMAC-секретом стола; при сбросе стола секрет ротируется и старые QR умирают.
import { prisma } from '@/lib/prisma';
import { parseToken, verifyTable } from '@/lib/sign';
import ConstructorClient from '@/components/ConstructorClient';

type Props = { params: { token: string } };

export const dynamic = 'force-dynamic';

export default async function GuestPage({ params }: Props) {
  const parsed = parseToken(params.token);
  let table: { id: string; label: string } | null = null;

  if (parsed) {
    const t = await prisma.table.findFirst({
      where: { id: parsed.tableId, active: true },
    });
    if (t && verifyTable(t.id, t.qrSecret, parsed.sig)) {
      table = { id: t.id, label: t.label };
    }
  }

  if (!table) {
    return (
      <main className="wrap">
        <p className="eyebrow">THE OBJECT</p>
        <h1>Ссылка недействительна</h1>
        <p style={{ color: 'var(--dim)' }}>
          QR-код устарел или ссылка неверная. Попросите бармена показать
          актуальный QR-код вашего стола.
        </p>
        <div className="card">
          <a href="/" style={{ color: 'var(--blood)' }}>← На главную</a>
        </div>
      </main>
    );
  }

  const bases = await prisma.base.findMany({
    where: { available: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      groups: {
        orderBy: { sortOrder: 'asc' },
        include: {
          modifiers: {
            where: { available: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  const serialized = bases.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    price: b.price.toString(),
    groups: b.groups.map((g) => ({
      id: g.id,
      name: g.name,
      required: g.required,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      modifiers: g.modifiers.map((m) => ({
        id: m.id,
        name: m.name,
        priceDelta: m.priceDelta.toString(),
      })),
    })),
  }));

  return (
    <ConstructorClient
      tableId={table.id}
      token={params.token}
      tableLabel={table.label}
      bases={serialized}
    />
  );
}
