// Разовая засевка демо-данных (15 столов + 3 основы конструктора).
// Дёрнуть из консоли: curl -X POST -H "x-admin-token: $ADMIN_ACCESS_TOKEN" \
//   https://<домен>/api/admin/seed
// Идемпотентность: удаляет старое меню/столы и создаёт заново.
import { NextResponse } from 'next/server';
import { TableKind, StaffRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: 'ADMIN_ACCESS_TOKEN не настроен' }, { status: 500 });
  }
  const got = req.headers.get('x-admin-token');
  if (got !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    return await runSeed();
  } catch (e: any) {
    console.error('seed failed', e);
    const msg = String(e?.message ?? e);
    let hint = '';
    if (/column .* does not exist/i.test(msg) || /category|defaultSelected/.test(msg)) {
      hint = ' Похоже, новая миграция ещё не накатана на Neon. Выполните в Neon SQL Editor: ALTER TABLE "Base" ADD COLUMN "category" TEXT; ALTER TABLE "Modifier" ADD COLUMN "defaultSelected" BOOLEAN NOT NULL DEFAULT false;';
    }
    return NextResponse.json({ error: msg + hint }, { status: 500 });
  }
}

async function runSeed() {
  // --- Сбрасываем всё связанное со столами и меню в правильном порядке ---
  // Идём от листьев к корням, чтобы FK не блокировали удаление.
  // CartItem / Order чистятся вручную — они блокируют удаление Base/Table.
  await prisma.cartItem.deleteMany();           // каскадом подчистит CartItemModifier
  await prisma.order.deleteMany();              // каскадом OrderItem
  await prisma.guest.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.base.deleteMany();               // каскадом ModifierGroup + Modifier
  await prisma.table.deleteMany();
  await prisma.auditLog.deleteMany();

  // --- Столы: 13 в зале + 2 VIP ---
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

  // --- Меню (создаётся ниже через createBase) ---

  const createBase = async (base: {
    name: string;
    description?: string;
    category?: string;
    price: string;
    sortOrder: number;
    groups?: {
      name: string;
      required?: boolean;
      minSelect?: number;
      maxSelect?: number;
      modifiers: { name: string; priceDelta?: string; defaultSelected?: boolean }[];
    }[];
  }) => {
    await prisma.base.create({
      data: {
        name: base.name,
        description: base.description,
        category: base.category,
        price: base.price,
        sortOrder: base.sortOrder,
        groups: {
          create: (base.groups ?? []).map((g, gi) => ({
            name: g.name,
            required: g.required ?? false,
            minSelect: g.minSelect ?? 0,
            maxSelect: g.maxSelect ?? 1,
            sortOrder: gi,
            modifiers: {
              create: g.modifiers.map((m, mi) => ({
                name: m.name,
                priceDelta: m.priceDelta ?? '0',
                defaultSelected: m.defaultSelected ?? false,
                sortOrder: mi,
              })),
            },
          })),
        },
      },
    });
  };

  // === Коктейли (без модификаторов — добавляются в 1 тап) ===
  await createBase({
    category: 'Коктейли', name: 'Негрони',
    description: 'Джин, биттер, мартини россо, апельсин.',
    price: '550', sortOrder: 1,
  });
  await createBase({
    category: 'Коктейли', name: 'Эспрессо-мартини',
    description: 'Эспрессо, водка, кофейный ликёр.',
    price: '550', sortOrder: 2,
  });
  await createBase({
    category: 'Коктейли', name: 'Опен Объект',
    description: 'Фирменный: оркард, фиеро, персик, супер-джус.',
    price: '650', sortOrder: 3,
  });

  // === Лимонады — конструктор ===
  await createBase({
    category: 'Лимонады', name: 'Авторский лимонад',
    description: 'Свежий, газированный, на ваш вкус.',
    price: '300', sortOrder: 10,
    groups: [
      { name: 'Вкус', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [{ name: 'Малина' }, { name: 'Маракуйя' }, { name: 'Облепиха' }] },
      { name: 'Газация', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [{ name: 'С газом', defaultSelected: true }, { name: 'Без газа' }] },
      { name: 'Доп. сироп', required: false, minSelect: 0, maxSelect: 3,
        modifiers: [
          { name: 'Мята', priceDelta: '20' },
          { name: 'Имбирь', priceDelta: '20' },
          { name: 'Бузина', priceDelta: '30' },
        ] },
    ],
  });

  // === Кофе — фиксированные позиции с опциональными сиропами ===
  // Часть позиций имеют сироп «по умолчанию» включён (Айс-латте, Раф).
  const coffeeSyrups = [
    { name: 'Ваниль', priceDelta: '30' },
    { name: 'Карамель', priceDelta: '30' },
    { name: 'Кокос', priceDelta: '30' },
  ];
  const coffeeMilk = [
    { name: 'Коровье' },
    { name: 'Растительное', priceDelta: '50' },
  ];
  await createBase({
    category: 'Кофе', name: 'Эспрессо',
    description: 'Насыщенный, классический.', price: '150', sortOrder: 20,
  });
  await createBase({
    category: 'Кофе', name: 'Капучино',
    price: '250', sortOrder: 21,
    groups: [
      { name: 'Молоко', required: false, maxSelect: 1, modifiers: coffeeMilk },
      { name: 'Сироп', required: false, maxSelect: 1, modifiers: coffeeSyrups },
    ],
  });
  await createBase({
    category: 'Кофе', name: 'Раф',
    description: 'Сливочный с ванилью.', price: '290', sortOrder: 22,
    groups: [
      { name: 'Сироп', required: false, maxSelect: 1,
        modifiers: [
          { name: 'Ваниль', priceDelta: '0', defaultSelected: true },
          { name: 'Карамель', priceDelta: '0' },
          { name: 'Кокос', priceDelta: '0' },
        ] },
    ],
  });
  await createBase({
    category: 'Кофе', name: 'Айс-латте',
    description: 'Эспрессо, молоко, сироп, лёд.', price: '290', sortOrder: 23,
    groups: [
      { name: 'Молоко', required: false, maxSelect: 1, modifiers: coffeeMilk },
      { name: 'Сироп', required: false, maxSelect: 1,
        modifiers: [
          { name: 'Ваниль', priceDelta: '0', defaultSelected: true },
          { name: 'Карамель', priceDelta: '0' },
          { name: 'Кокос', priceDelta: '0' },
        ] },
    ],
  });

  const adminCount = await prisma.staff.count({ where: { role: StaffRole.ADMIN } });
  if (adminCount === 0) {
    await prisma.staff.create({
      data: { name: 'Администратор', role: StaffRole.ADMIN, authorized: true },
    });
  }

  const [tablesN, basesN] = await Promise.all([prisma.table.count(), prisma.base.count()]);
  return NextResponse.json({ ok: true, tables: tablesN, bases: basesN });
}
