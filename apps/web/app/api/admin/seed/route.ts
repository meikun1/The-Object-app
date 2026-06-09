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

  // === Лимонады — конструктор в 4 шага ===
  // Группы с префиксом «Шаг N · …» автоматически собираются в один шаг
  // под общим заголовком на странице конструктора.
  await createBase({
    category: 'Лимонады', name: 'Конструктор лимонада',
    description: 'Соберите свой лимонад: пюре → сироп → подсластитель → газация и гарниш.',
    price: '390', sortOrder: 10,
    groups: [
      // Шаг 1: фруктовое пюре (одно, в стоимости).
      { name: 'Шаг 1 · Пюре', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [
          { name: 'Клубника', defaultSelected: true },
          { name: 'Маракуйя' }, { name: 'Манго' }, { name: 'Малина' },
          { name: 'Вишня' }, { name: 'Персик' },
          { name: 'Чёрная смородина' }, { name: 'Тархун' },
        ] },
      // Шаг 2: сироп (один, в стоимости).
      { name: 'Шаг 2 · Сироп', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [
          { name: 'Без сиропа', defaultSelected: true },
          { name: 'Базилик' }, { name: 'Лаванда' }, { name: 'Бузина' },
          { name: 'Имбирь' }, { name: 'Лемонграсс' },
        ] },
      // Шаг 3: подсластитель (один).
      { name: 'Шаг 3 · Подсластитель', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [
          { name: 'Сахарный сироп', defaultSelected: true },
          { name: 'Мёд' },
          { name: 'Кленовый сироп' },
          { name: 'Финиковый сироп' },
          { name: 'Стевия' },
          { name: 'Сироп топинамбура' },
        ] },
      // Шаг 4: газация.
      { name: 'Шаг 4 · Вода', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [
          { name: 'С газом', defaultSelected: true },
          { name: 'Без газа' },
        ] },
      // Шаг 5: кислотность.
      { name: 'Шаг 5 · Кислотность', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [
          { name: 'Не кислый' },
          { name: 'Баланс', defaultSelected: true },
          { name: 'Кислый' },
        ] },
      // Шаг 6: гарниш — до 3.
      { name: 'Шаг 6 · Гарниш', required: false, minSelect: 0, maxSelect: 3,
        modifiers: [
          { name: 'Мята' }, { name: 'Розмарин' }, { name: 'Корица' },
          { name: 'Лимон' }, { name: 'Грейпфрут' }, { name: 'Апельсин' },
        ] },
    ],
  });

  // === Коктейли (из шаблона QR-меню) ===
  await createBase({ category: 'Коктейли', name: 'Old Object',
    description: 'Бурбон, выдержанный вермут, дымная горечь.',
    price: '690', sortOrder: 20 });
  await createBase({ category: 'Коктейли', name: 'Бархатный Негрони',
    description: 'Джин, кампари, апельсиновое масло.',
    price: '650', sortOrder: 21 });
  await createBase({ category: 'Коктейли', name: 'Дымный сауэр',
    description: 'Мескаль, лайм, тимьян, белок.',
    price: '720', sortOrder: 22 });
  await createBase({ category: 'Коктейли', name: 'Эспрессо Мартини',
    description: 'Водка, кофейный ликёр, свежий эспрессо.',
    price: '680', sortOrder: 23 });

  // === Напитки ===
  await createBase({ category: 'Напитки', name: 'Вода с газом',
    description: 'Минеральная, 0,5 л.', price: '180', sortOrder: 40 });
  await createBase({ category: 'Напитки', name: 'Вода без газа',
    description: 'Минеральная, 0,5 л.', price: '180', sortOrder: 41 });
  await createBase({ category: 'Напитки', name: 'Свежевыжатый сок',
    description: 'Апельсин, грейпфрут или яблоко · 250 мл.', price: '320', sortOrder: 42 });
  await createBase({ category: 'Напитки', name: 'Чайник чая',
    description: 'Облепиха-имбирь или классический · 1 л.', price: '450', sortOrder: 43 });
  await createBase({ category: 'Напитки', name: 'Кола / Тоник',
    description: 'Газированный напиток на выбор, 0,33 л.', price: '200', sortOrder: 44 });

  // === Снеки ===
  await createBase({ category: 'Снеки', name: 'Орешки ассорти',
    description: 'Миндаль, кешью, фундук с морской солью.', price: '320', sortOrder: 50 });
  await createBase({ category: 'Снеки', name: 'Начос с сыром',
    description: 'Кукурузные чипсы, сырный соус, халапеньо.', price: '390', sortOrder: 51 });
  await createBase({ category: 'Снеки', name: 'Сырные палочки',
    description: 'Моцарелла в хрустящей панировке · 6 шт.', price: '360', sortOrder: 52 });
  await createBase({ category: 'Снеки', name: 'Оливки & маслины',
    description: 'С лимоном, чесноком и прованскими травами.', price: '280', sortOrder: 53 });
  await createBase({ category: 'Снеки', name: 'Картофель фри',
    description: 'Трюфельный, с пармезаном и зеленью.', price: '320', sortOrder: 54 });
  await createBase({ category: 'Снеки', name: 'Попкорн карамельный',
    description: 'Солёная карамель, тёплый.', price: '240', sortOrder: 55 });

  // === Кофе (статичные позиции из шаблона QR-меню) ===
  await createBase({ category: 'Кофе', name: 'Эспрессо',
    description: 'Двойной, плотный, с тонкой крема.', price: '180', sortOrder: 30 });
  await createBase({ category: 'Кофе', name: 'Капучино',
    description: 'Бархатная молочная пенка, баланс вкуса.', price: '280', sortOrder: 31 });
  await createBase({ category: 'Кофе', name: 'Латте',
    description: 'Мягкий, на большом объёме молока.', price: '320', sortOrder: 32 });
  await createBase({ category: 'Кофе', name: 'Раф',
    description: 'Сливочный, с ванилью и тростниковым сахаром.', price: '340', sortOrder: 33 });
  await createBase({ category: 'Кофе', name: 'Американо',
    description: 'Эспрессо, разбавленный горячей водой.', price: '220', sortOrder: 34 });
  await createBase({ category: 'Кофе', name: 'Флэт уайт',
    description: 'Двойной эспрессо и тонкий слой микропены.', price: '320', sortOrder: 35 });

  const adminCount = await prisma.staff.count({ where: { role: StaffRole.ADMIN } });
  if (adminCount === 0) {
    await prisma.staff.create({
      data: { name: 'Администратор', role: StaffRole.ADMIN, authorized: true },
    });
  }

  const [tablesN, basesN] = await Promise.all([prisma.table.count(), prisma.base.count()]);
  return NextResponse.json({ ok: true, tables: tablesN, bases: basesN });
}
