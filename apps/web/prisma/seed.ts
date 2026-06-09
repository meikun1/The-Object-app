/* Демо-данные для разработки: столы, конструктор, администратор.
   Запуск: pnpm --filter @app/api seed (после миграции).
   Идемпотентность: перед заполнением чистим конструктор и столы. */
import { PrismaClient, TableKind, StaffRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // --- Столы: 13 в зале + 2 VIP ---
  await prisma.table.deleteMany();
  const tables = [
    ...Array.from({ length: 13 }, (_, i) => ({
      label: `Стол ${i + 1}`,
      kind: TableKind.HALL,
      sortOrder: i + 1,
    })),
    { label: 'VIP 1', kind: TableKind.VIP, sortOrder: 101 },
    { label: 'VIP 2', kind: TableKind.VIP, sortOrder: 102 },
  ];
  for (const t of tables) await prisma.table.create({ data: t });

  // --- Конструктор (демо): 3 основы ---
  await prisma.base.deleteMany(); // каскадом удалит группы/модификаторы

  // Хелпер: создаёт основу с группами и модификаторами.
  const createBase = async (base: {
    name: string;
    description?: string;
    price: string;
    sortOrder: number;
    groups: {
      name: string;
      required?: boolean;
      minSelect?: number;
      maxSelect?: number;
      modifiers: { name: string; priceDelta?: string }[];
    }[];
  }) => {
    await prisma.base.create({
      data: {
        name: base.name,
        description: base.description,
        price: base.price,
        sortOrder: base.sortOrder,
        groups: {
          create: base.groups.map((g, gi) => ({
            name: g.name,
            required: g.required ?? false,
            minSelect: g.minSelect ?? 0,
            maxSelect: g.maxSelect ?? 1,
            sortOrder: gi,
            modifiers: {
              create: g.modifiers.map((m, mi) => ({
                name: m.name,
                priceDelta: m.priceDelta ?? '0',
                sortOrder: mi,
              })),
            },
          })),
        },
      },
    });
  };

  await createBase({
    name: 'Джин-тоник',
    description: 'Классическая база: джин, тоник, лёд.',
    price: '350',
    sortOrder: 1,
    groups: [
      {
        name: 'Крепость',
        required: true,
        minSelect: 1,
        maxSelect: 1,
        modifiers: [
          { name: 'Классический' },
          { name: 'Лёгкий' },
          { name: 'Двойной', priceDelta: '150' },
        ],
      },
      {
        name: 'Цитрус',
        required: false,
        minSelect: 0,
        maxSelect: 2,
        modifiers: [
          { name: 'Лайм' },
          { name: 'Грейпфрут', priceDelta: '30' },
          { name: 'Лимон' },
        ],
      },
      {
        name: 'Лёд',
        required: true,
        minSelect: 1,
        maxSelect: 1,
        modifiers: [{ name: 'Со льдом' }, { name: 'Без льда' }],
      },
    ],
  });

  await createBase({
    name: 'Авторский лимонад',
    description: 'Свежий, газированный, на ваш вкус.',
    price: '300',
    sortOrder: 2,
    groups: [
      {
        name: 'Вкус',
        required: true,
        minSelect: 1,
        maxSelect: 1,
        modifiers: [{ name: 'Малина' }, { name: 'Маракуйя' }, { name: 'Облепиха' }],
      },
      {
        name: 'Газация',
        required: true,
        minSelect: 1,
        maxSelect: 1,
        modifiers: [{ name: 'С газом' }, { name: 'Без газа' }],
      },
      {
        name: 'Доп. сироп',
        required: false,
        minSelect: 0,
        maxSelect: 3,
        modifiers: [
          { name: 'Мята', priceDelta: '20' },
          { name: 'Имбирь', priceDelta: '20' },
          { name: 'Бузина', priceDelta: '30' },
        ],
      },
    ],
  });

  await createBase({
    name: 'Кофе',
    description: 'Эспрессо-база с молоком и сиропом.',
    price: '200',
    sortOrder: 3,
    groups: [
      {
        name: 'Молоко',
        required: false,
        minSelect: 0,
        maxSelect: 1,
        modifiers: [
          { name: 'Коровье' },
          { name: 'Растительное', priceDelta: '50' },
        ],
      },
      {
        name: 'Сироп',
        required: false,
        minSelect: 0,
        maxSelect: 2,
        modifiers: [
          { name: 'Ваниль', priceDelta: '30' },
          { name: 'Карамель', priceDelta: '30' },
        ],
      },
    ],
  });

  // --- Администратор (для бота/админки на след. этапах) ---
  const adminCount = await prisma.staff.count({ where: { role: StaffRole.ADMIN } });
  if (adminCount === 0) {
    await prisma.staff.create({
      data: { name: 'Администратор', role: StaffRole.ADMIN, authorized: true },
    });
  }

  const [tablesN, basesN] = await Promise.all([prisma.table.count(), prisma.base.count()]);
  console.log(`Готово: столов ${tablesN}, основ конструктора ${basesN}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
