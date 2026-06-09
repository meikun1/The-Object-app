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

  // Меню из актуальной карты заведения. Цены — плейсхолдеры (PDF был без
  // рублёвых цен), точные значения настраиваются в /admin → Меню.

  // === Чай авторский ===
  await createBase({ category: 'Чай', name: 'Лесные ягоды',
    description: 'Малина, гренадин, мята, чай ассам · чайник стимер.',
    price: '490', sortOrder: 1 });
  await createBase({ category: 'Чай', name: 'Малина-маракуйя',
    description: 'Малина, маракуйя, апельсин, фруктовый чай · чайник стимер.',
    price: '490', sortOrder: 2 });
  await createBase({ category: 'Чай', name: 'Облепиха-имбирь',
    description: 'Облепиха, мёд, имбирь, травяной чай, специи · чайник стимер.',
    price: '490', sortOrder: 3 });
  await createBase({ category: 'Чай', name: 'Яблоко-лайм',
    description: 'Яблоко, лайм, мята, чай жасмин · чайник стимер.',
    price: '490', sortOrder: 4 });
  await createBase({ category: 'Чай', name: 'Смородина-мята',
    description: 'Смородина, грейпфрут, мята, чай ассам, специи · чайник стимер.',
    price: '490', sortOrder: 5 });
  await createBase({ category: 'Чай', name: 'Хвойный чай',
    description: 'Варенье из хвои, мёд, розмарин, лайм, мята, травяной чай · чайник стимер.',
    price: '490', sortOrder: 6 });

  // === Сет-шоты ===
  await createBase({ category: 'Сет-шоты', name: 'Русский шот-сет',
    description: 'Облепиха, мёд, водка · сет 5 шотов, шейк.',
    price: '1200', sortOrder: 10 });
  await createBase({ category: 'Сет-шоты', name: 'Как на Бали',
    description: 'Маракуйя, манго, ром, водка · сет 5 шотов, шейк.',
    price: '1200', sortOrder: 11 });
  await createBase({ category: 'Сет-шоты', name: 'Very Berry Set',
    description: 'Малина, смородина, клубника, водка, джин · сет 5 шотов, шейк.',
    price: '1200', sortOrder: 12 });
  await createBase({ category: 'Сет-шоты', name: 'Б-52',
    description: 'Кофейный ликёр, сливочный ликёр, трипл-сек · шот, лейринг.',
    price: '290', sortOrder: 13 });
  await createBase({ category: 'Сет-шоты', name: 'Б-53',
    description: 'Кофейный ликёр, сливочный ликёр, абсент · шот, лейринг.',
    price: '290', sortOrder: 14 });
  await createBase({ category: 'Сет-шоты', name: 'Опухоль мозга',
    description: 'Самбука, мартини бьянко, гренадин, сливочный ликёр · шот, лейринг.',
    price: '290', sortOrder: 15 });
  await createBase({ category: 'Сет-шоты', name: 'Зелёный мексиканец',
    description: 'Дынный ликёр, текила, супер-джус · шот, лейринг.',
    price: '290', sortOrder: 16 });

  // === Лимонады — конструктор + 5 авторских с выбором размера ===
  await createBase({
    category: 'Лимонады', name: 'Конструктор лимонада',
    description: 'Соберите свой лимонад: пюре → сироп → подсластитель → газация и гарниш.',
    price: '390', sortOrder: 20,
    groups: [
      { name: 'Шаг 1 · Пюре', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [
          { name: 'Клубника', defaultSelected: true },
          { name: 'Маракуйя' }, { name: 'Манго' }, { name: 'Малина' },
          { name: 'Вишня' }, { name: 'Персик' },
          { name: 'Чёрная смородина' }, { name: 'Тархун' },
        ] },
      { name: 'Шаг 2 · Сироп', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [
          { name: 'Без сиропа', defaultSelected: true },
          { name: 'Базилик' }, { name: 'Лаванда' }, { name: 'Бузина' },
          { name: 'Имбирь' }, { name: 'Лемонграсс' },
        ] },
      { name: 'Шаг 3 · Подсластитель', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [
          { name: 'Сахарный сироп', defaultSelected: true },
          { name: 'Мёд' }, { name: 'Кленовый сироп' },
          { name: 'Финиковый сироп' }, { name: 'Стевия' },
          { name: 'Сироп топинамбура' },
        ] },
      { name: 'Шаг 4 · Вода', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [
          { name: 'С газом', defaultSelected: true },
          { name: 'Без газа' },
        ] },
      { name: 'Шаг 5 · Кислотность', required: true, minSelect: 1, maxSelect: 1,
        modifiers: [
          { name: 'Не кислый' },
          { name: 'Баланс', defaultSelected: true },
          { name: 'Кислый' },
        ] },
      { name: 'Шаг 6 · Гарниш', required: false, minSelect: 0, maxSelect: 3,
        modifiers: [
          { name: 'Мята' }, { name: 'Розмарин' }, { name: 'Корица' },
          { name: 'Лимон' }, { name: 'Грейпфрут' }, { name: 'Апельсин' },
        ] },
    ],
  });

  // Авторские лимонады: единая группа размера (хайбол / графин).
  const lemonadeSize = [{
    name: 'Размер', required: true, minSelect: 1, maxSelect: 1,
    modifiers: [
      { name: 'Хайбол · 250 мл', priceDelta: '0', defaultSelected: true },
      { name: 'Графин · 750 мл', priceDelta: '500' },
    ],
  }];
  await createBase({ category: 'Лимонады', name: 'Облепиха-цитрус',
    description: 'Облепиха, мандарин, лимон, апельсин, грейпфрут.',
    price: '390', sortOrder: 21, groups: lemonadeSize });
  await createBase({ category: 'Лимонады', name: 'Яблоко-кокос',
    description: 'Кокос, яблоко, кокосовое молоко, стружка.',
    price: '390', sortOrder: 22, groups: lemonadeSize });
  await createBase({ category: 'Лимонады', name: 'Ягодный взрыв',
    description: 'Малина, смородина, бузина, мята, лимон.',
    price: '390', sortOrder: 23, groups: lemonadeSize });
  await createBase({ category: 'Лимонады', name: 'Малина-маракуйя',
    description: 'Малина, маракуйя, мята, лимон.',
    price: '390', sortOrder: 24, groups: lemonadeSize });
  await createBase({ category: 'Лимонады', name: 'Груша-базилик',
    description: 'Груша, базилик, лимон.',
    price: '390', sortOrder: 25, groups: lemonadeSize });

  // === Коктейли без алкоголя ===
  await createBase({ category: 'Коктейли б/а', name: 'Мохито б/а',
    description: 'Лайм, мята, сахар, содовая · хайбол, мадлен.',
    price: '390', sortOrder: 30 });
  await createBase({ category: 'Коктейли б/а', name: 'Апероль б/а',
    description: 'Сироп апероль, тоник, апельсин · винный бокал, билд.',
    price: '390', sortOrder: 31 });
  await createBase({ category: 'Коктейли б/а', name: 'Малиновый закат',
    description: 'Малина, апельсин, гренадин, тоник · билд.',
    price: '390', sortOrder: 32 });
  await createBase({ category: 'Коктейли б/а', name: 'Пина колада б/а',
    description: 'Сливки, кокос, ананас · харрикейн, шейк.',
    price: '450', sortOrder: 33 });

  // === Коктейли ===
  await createBase({ category: 'Коктейли', name: 'Апероль шприц',
    description: 'Апероль, игристое, содовая, апельсин · винный бокал, билд.',
    price: '590', sortOrder: 40 });
  await createBase({ category: 'Коктейли', name: 'Яблочный дайкири',
    description: 'Ром, яблоко, супер-джус · коктейльная рюмка, шейк.',
    price: '590', sortOrder: 41 });
  await createBase({ category: 'Коктейли', name: 'Лонг-Айленд',
    description: 'Ром, джин, водка, текила, трипл-сек, кола, лайм · хайбол, билд.',
    price: '690', sortOrder: 42 });
  await createBase({ category: 'Коктейли', name: 'Негрони',
    description: 'Джин, биттер, мартини россо, апельсин · рокс, стир.',
    price: '650', sortOrder: 43 });
  await createBase({ category: 'Коктейли', name: 'Эспрессо-мартини',
    description: 'Эспрессо, водка, кофейный ликёр · коктейльная рюмка, шейк.',
    price: '650', sortOrder: 44 });
  await createBase({ category: 'Коктейли', name: 'Виски-сауэр',
    description: 'Виски, сахарный сироп, супер-джус, лимон, BabL Drop · рокс, дабл-шейк.',
    price: '690', sortOrder: 45 });
  await createBase({ category: 'Коктейли', name: 'Фиеро-тоник',
    description: 'Мартини фиеро, тоник, содовая, грейпфрут · винный бокал, билд.',
    price: '590', sortOrder: 46 });
  await createBase({ category: 'Коктейли', name: 'Ягодный слинг',
    description: 'Джин, биттер, ананас, вишня, лимон, супер-джус · хайбол, шейк.',
    price: '650', sortOrder: 47 });
  await createBase({ category: 'Коктейли', name: 'Опен Объект',
    description: 'Фирменный: окхард, мартини фиеро, персик, супер-джус · шале, шейк.',
    price: '690', sortOrder: 48 });
  await createBase({ category: 'Коктейли', name: 'Мэджик Вуду',
    description: 'Текила, ликёр дыня, апельсин, яблоко, блю, кокос, супер-джус · винный бокал, билд.',
    price: '690', sortOrder: 49 });
  await createBase({ category: 'Коктейли', name: 'Дарк Флава',
    description: 'Блю, гренадин, бузина, трипл-сек, лимончелло, игристое · винный бокал, билд.',
    price: '690', sortOrder: 50 });
  await createBase({ category: 'Коктейли', name: 'Барби',
    description: 'Лимончелло, клубника, супер-джус, содовая, лимон · хайбол, шейк.',
    price: '590', sortOrder: 51 });
  await createBase({ category: 'Коктейли', name: 'Мохито',
    description: 'Ром, лайм, мята, сахар, содовая · хайбол, мадлен.',
    price: '590', sortOrder: 52 });

  // === Кофе ===
  await createBase({ category: 'Кофе', name: 'Эспрессо',
    description: '12 г кофе, насыщенный.', price: '180', sortOrder: 60 });
  await createBase({ category: 'Кофе', name: 'Кофе по-восточному',
    description: '8 г кофе, в турке на песке.', price: '220', sortOrder: 61 });
  await createBase({ category: 'Кофе', name: 'Американо',
    description: '12 г кофе, разбавленный горячей водой.', price: '220', sortOrder: 62 });
  await createBase({ category: 'Кофе', name: 'Капучино',
    description: '12 г кофе, 190 г молока.', price: '280', sortOrder: 63 });
  await createBase({ category: 'Кофе', name: 'Раф',
    description: '12 г кофе, 190 г сливки, ванильный сироп.', price: '340', sortOrder: 64 });
  await createBase({ category: 'Кофе', name: 'Айс-латте',
    description: '12 г кофе, 230 г молока, сироп, лёд.', price: '320', sortOrder: 65 });
  await createBase({ category: 'Кофе', name: 'Латте',
    description: '12 г кофе, 230 г молока.', price: '320', sortOrder: 66 });
  await createBase({ category: 'Кофе', name: 'Бамбл',
    description: '18 г кофе, 250 г апельсинового фреша, сироп.', price: '380', sortOrder: 67 });
  await createBase({ category: 'Кофе', name: 'Флэт-уайт',
    description: '18 г кофе, 190 г молока, тонкий слой микропены.', price: '320', sortOrder: 68 });

  // === Фреш и милкшейк ===
  await createBase({ category: 'Фреш и милкшейк', name: 'Фреш апельсиновый',
    description: '100% свежий апельсин · 250 мл.', price: '390', sortOrder: 70 });
  await createBase({ category: 'Фреш и милкшейк', name: 'Фреш грейпфрутовый',
    description: '100% свежий грейпфрут · 250 мл.', price: '390', sortOrder: 71 });
  await createBase({ category: 'Фреш и милкшейк', name: 'Милкшейк',
    description: 'Мороженое, молоко, сливки, топпинг на выбор.', price: '390', sortOrder: 72 });

  // === Напитки (вода, газировка, сок, энергетик) ===
  await createBase({ category: 'Напитки', name: 'Вода с газом',
    description: 'Минеральная, 0,5 л.', price: '180', sortOrder: 80 });
  await createBase({ category: 'Напитки', name: 'Вода без газа',
    description: 'Минеральная, 0,5 л.', price: '180', sortOrder: 81 });
  await createBase({ category: 'Напитки', name: 'Фанта',
    description: 'Газированный напиток · 0,33 л.', price: '200', sortOrder: 82 });
  await createBase({ category: 'Напитки', name: 'Кола',
    description: 'Газированный напиток · 0,33 л.', price: '200', sortOrder: 83 });
  await createBase({ category: 'Напитки', name: 'Кола Zero',
    description: 'Без сахара · 0,33 л.', price: '200', sortOrder: 84 });
  await createBase({ category: 'Напитки', name: 'Тоник',
    description: '0,33 л.', price: '200', sortOrder: 85 });
  await createBase({ category: 'Напитки', name: 'Сок Эль Примо',
    description: 'Соки в ассортименте · 1 л.', price: '350', sortOrder: 86 });
  await createBase({ category: 'Напитки', name: 'Red Bull',
    description: 'Энергетический напиток · 0,25 л.', price: '290', sortOrder: 87 });

  // === Пиво бутылочное ===
  await createBase({ category: 'Пиво бутылочное', name: 'Lacoste Fresca',
    description: 'Бутылочное пиво.', price: '390', sortOrder: 90 });
  await createBase({ category: 'Пиво бутылочное', name: 'Paulaner Weissbier',
    description: 'Немецкое пшеничное · 0,5 л.', price: '490', sortOrder: 91 });
  await createBase({ category: 'Пиво бутылочное', name: 'Крушовице non-alco',
    description: 'Безалкогольное · 0,5 л.', price: '320', sortOrder: 92 });

  // === Пиво розливное ===
  await createBase({ category: 'Пиво розливное', name: 'Балтика Хеллес',
    description: 'Светлое лагерное · 0,5 л.', price: '290', sortOrder: 100 });

  // === Китайский чай ===
  await createBase({ category: 'Китайский чай', name: 'Габа',
    description: 'Тайваньский улун с высоким содержанием ГАМК.', price: '690', sortOrder: 110 });
  await createBase({ category: 'Китайский чай', name: 'Тигуанинь',
    description: 'Знаменитый бирюзовый улун из Аньси.', price: '690', sortOrder: 111 });
  await createBase({ category: 'Китайский чай', name: 'Да Хун Пао',
    description: 'Скальный утёсный улун, «Большой красный халат».', price: '890', sortOrder: 112 });
  await createBase({ category: 'Китайский чай', name: 'Шу пуэр',
    description: 'Выдержанный, плотный, с земляными нотами.', price: '690', sortOrder: 113 });
  await createBase({ category: 'Китайский чай', name: 'Шен пуэр',
    description: 'Молодой, свежий, с травянистым вкусом.', price: '690', sortOrder: 114 });

  // === Снеки — список появится позже ===
  // (когда пришлёте полный перечень с граммовкой и ценами).

  const adminCount = await prisma.staff.count({ where: { role: StaffRole.ADMIN } });
  if (adminCount === 0) {
    await prisma.staff.create({
      data: { name: 'Администратор', role: StaffRole.ADMIN, authorized: true },
    });
  }

  const [tablesN, basesN] = await Promise.all([prisma.table.count(), prisma.base.count()]);
  return NextResponse.json({ ok: true, tables: tablesN, bases: basesN });
}
