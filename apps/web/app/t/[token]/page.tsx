// Гостевой конструктор. Token (пока) трактуется как ID стола.
// В Этапе 3 добавим подписанные токены и серверные сессии.
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ConstructorClient from '@/components/ConstructorClient';

type Props = { params: { token: string } };

export const dynamic = 'force-dynamic';

export default async function GuestPage({ params }: Props) {
  const table = await prisma.table.findFirst({
    where: { id: params.token, active: true },
  });

  if (!table) {
    return (
      <main className="wrap">
        <p className="eyebrow">THE OBJECT</p>
        <h1>Стол не найден</h1>
        <p style={{ color: 'var(--dim)' }}>
          Похоже, ссылка устарела или QR-код неверный. Позовите бармена.
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

  // Prisma Decimal → string для сериализации в client component.
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
      tableLabel={table.label}
      bases={serialized}
    />
  );
}
