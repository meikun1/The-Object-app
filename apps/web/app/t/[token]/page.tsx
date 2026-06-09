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
      <main className="order">
        <div className="invalid-page">
          <div>
            <div className="qr-brand" style={{ marginBottom: 32 }}>
              <span className="mark">O</span>
              <span className="name">The&nbsp;<b>Object</b></span>
            </div>
            <h1>Ссылка недействительна</h1>
            <p>
              QR-код устарел или ссылка неверная. Попросите бармена показать
              актуальный QR-код вашего стола.
            </p>
          </div>
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
    category: b.category,
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
        defaultSelected: m.defaultSelected,
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
