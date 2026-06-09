// Webhook Telegram-бота бармена.
// Команды: /start /login /shift_on /shift_off /me /orders /stats /help
// Reply-клавиатура снизу — основные действия в одно касание.
// Callback queries: order:<id>:accept | order:<id>:reject | order:<id>:ready
//
// Защита от подделок: проверяем заголовок X-Telegram-Bot-Api-Secret-Token,
// если задан TELEGRAM_WEBHOOK_SECRET в env (выставлен при setWebhook).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { answerCallbackQuery, editMessageText, esc, sendMessage } from '@/lib/telegram';
import {
  HELP_TEXT,
  WELCOME_GUEST,
  orderCard,
  orderInlineKeyboard,
  staffKeyboard,
} from '@/lib/bot-ui';
import { rkeeper } from '@/lib/rkeeper';
import type { Staff } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };
type TgMessage = { message_id: number; from?: TgUser; chat: { id: number }; text?: string };
type TgCallback = { id: string; from: TgUser; message?: TgMessage; data?: string };
type TgUpdate = { message?: TgMessage; callback_query?: TgCallback };

export async function POST(req: Request) {
  const wantSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (wantSecret) {
    const got = req.headers.get('x-telegram-bot-api-secret-token');
    if (got !== wantSecret) {
      return NextResponse.json({ ok: true });
    }
  }

  let upd: TgUpdate;
  try {
    upd = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    if (upd.message) await handleMessage(upd.message);
    else if (upd.callback_query) await handleCallback(upd.callback_query);
  } catch (e) {
    console.error('telegram webhook error', e);
  }

  return NextResponse.json({ ok: true });
}

/* ============================== СООБЩЕНИЯ ============================== */

async function handleMessage(m: TgMessage) {
  const tgUserId = m.from?.id;
  if (!tgUserId) return;
  const chatId = m.chat.id;
  const raw = (m.text ?? '').trim();
  const text = normalizeButtonText(raw);
  const fullName = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ')
    || m.from?.username || `user_${tgUserId}`;

  // /login доступен всегда — авторизация.
  if (text.startsWith('/login')) {
    return handleLogin(chatId, tgUserId, fullName, raw);
  }

  const staff = await prisma.staff.findUnique({ where: { tgUserId: BigInt(tgUserId) } });

  // Не вошли — приветствуем и просим войти.
  if (!staff || !staff.authorized) {
    if (text === '/start') {
      await sendMessage(chatId, WELCOME_GUEST);
    } else if (text === '/help') {
      await sendMessage(chatId, WELCOME_GUEST);
    } else if (text.startsWith('/')) {
      await sendMessage(chatId, 'Сначала войдите: <code>/login ПАРОЛЬ</code>');
    }
    return;
  }

  // chatId мог измениться — поддерживаем актуальным.
  if (staff.chatId !== BigInt(chatId)) {
    await prisma.staff.update({ where: { id: staff.id }, data: { chatId: BigInt(chatId) } });
    staff.chatId = BigInt(chatId);
  }

  // === Маршрутизация команд / нажатий клавиатуры ===
  switch (text) {
    case '/start':
    case '/menu':
      return showMenu(chatId, staff);
    case '/help':
      return sendMessage(chatId, HELP_TEXT, { reply_markup: staffKeyboard(staff) });
    case '/shift_on':
      return toggleShift(chatId, staff, true);
    case '/shift_off':
      return toggleShift(chatId, staff, false);
    case '/me':
      return showMe(chatId, staff);
    case '/orders':
      return showActiveOrders(chatId, staff);
    case '/stats':
      return showStats(chatId, staff);
    default:
      if (raw.startsWith('/')) {
        await sendMessage(chatId, 'Не понял команду. Откройте меню: /start', {
          reply_markup: staffKeyboard(staff),
        });
      }
  }
}

/** Маппинг текста с reply-клавиатуры в команды. */
function normalizeButtonText(t: string): string {
  switch (t) {
    case '🟢 Встать на смену': return '/shift_on';
    case '🔴 Уйти со смены':   return '/shift_off';
    case '📋 Активные':        return '/orders';
    case '📊 Моя смена':       return '/stats';
    case 'ℹ️ Помощь':           return '/help';
    default: return t;
  }
}

/* ============================== ХЭНДЛЕРЫ ============================== */

async function handleLogin(chatId: number, tgUserId: number, fullName: string, raw: string) {
  const password = raw.replace(/^\/login(@\w+)?\s*/, '').trim();
  const expected = process.env.BOT_ACCESS_PASSWORD;
  if (!expected) {
    await sendMessage(chatId, '⚠️ BOT_ACCESS_PASSWORD не настроен на сервере.');
    return;
  }
  if (!password) {
    await sendMessage(chatId, 'Использование: <code>/login ПАРОЛЬ</code>');
    return;
  }
  if (password !== expected) {
    await sendMessage(chatId, '🚫 Неверный пароль.');
    return;
  }

  const existing = await prisma.staff.findUnique({ where: { tgUserId: BigInt(tgUserId) } });
  let staff: Staff;
  if (existing) {
    staff = await prisma.staff.update({
      where: { id: existing.id },
      data: { chatId: BigInt(chatId), name: fullName, authorized: true, lastLoginAt: new Date() },
    });
  } else {
    staff = await prisma.staff.create({
      data: {
        name: fullName, role: 'BARMAN',
        tgUserId: BigInt(tgUserId), chatId: BigInt(chatId),
        authorized: true, lastLoginAt: new Date(),
      },
    });
  }
  await prisma.auditLog.create({
    data: { type: 'staff.login', message: `${fullName} вошёл`, meta: { tgUserId } },
  });

  await sendMessage(
    chatId,
    `🎉 Вы вошли как <b>${esc(staff.name)}</b>.\n\n` +
      `Нижняя клавиатура — основные действия. Команды: /help.`,
    { reply_markup: staffKeyboard(staff) },
  );
}

async function showMenu(chatId: number, staff: Staff) {
  const head = `<b>THE OBJECT</b>\nЗдравствуйте, ${esc(staff.name)}.`;
  const status = staff.onShift ? '🟢 Вы <b>на смене</b>' : '⏸ Смена выключена';
  const hint = staff.onShift
    ? 'Заказы будут приходить сюда автоматически.'
    : 'Нажмите «🟢 Встать на смену», чтобы получать заказы.';
  await sendMessage(chatId, `${head}\n${status}\n\n${hint}`, {
    reply_markup: staffKeyboard(staff),
  });
}

async function toggleShift(chatId: number, staff: Staff, on: boolean) {
  if (staff.onShift === on) {
    await sendMessage(chatId, on ? 'Вы уже на смене.' : 'Смена уже выключена.', {
      reply_markup: staffKeyboard(staff),
    });
    return;
  }
  const upd = await prisma.staff.update({ where: { id: staff.id }, data: { onShift: on } });
  const msg = on
    ? '🟢 <b>Вы на смене.</b>\nЗаказы будут приходить сюда.'
    : '⏸ <b>Смена окончена.</b>\nЗаказы пока не присылаем.';
  await sendMessage(chatId, msg, { reply_markup: staffKeyboard(upd) });
}

async function showMe(chatId: number, staff: Staff) {
  const lines = [
    `<b>${esc(staff.name)}</b>`,
    `Роль: ${staff.role === 'ADMIN' ? 'Администратор' : 'Бармен'}`,
    `Смена: ${staff.onShift ? '🟢 на смене' : '⏸ выкл'}`,
  ];
  if (staff.lastLoginAt) {
    lines.push(`Последний вход: ${fmtDateTime(staff.lastLoginAt)}`);
  }
  await sendMessage(chatId, lines.join('\n'), { reply_markup: staffKeyboard(staff) });
}

async function showActiveOrders(chatId: number, staff: Staff) {
  const orders = await prisma.order.findMany({
    where: { status: { in: ['PENDING', 'ACCEPTED'] } },
    orderBy: { createdAt: 'asc' },
    include: { items: true, session: { include: { table: true } } },
    take: 15,
  });
  if (orders.length === 0) {
    await sendMessage(chatId, '✨ Активных заказов нет.', {
      reply_markup: staffKeyboard(staff),
    });
    return;
  }
  await sendMessage(chatId, `<b>Активных заказов: ${orders.length}</b>`, {
    reply_markup: staffKeyboard(staff),
  });
  const staffMap = await staffNameMap(orders.map((o) => o.confirmedById).filter(Boolean) as string[]);
  for (const o of orders) {
    const guest = await firstGuestName(o.sessionId);
    await sendMessage(
      chatId,
      orderCard(o, o.session.table.label, guest, staffMap),
      { reply_markup: orderInlineKeyboard(o.id, o.status) },
    );
  }
}

async function showStats(chatId: number, staff: Staff) {
  const since = startOfToday();
  const [acceptedByMe, readyByMe, rejectedByMe, totalToday] = await Promise.all([
    prisma.order.count({ where: { confirmedById: staff.id, status: 'ACCEPTED', confirmedAt: { gte: since } } }),
    prisma.order.count({ where: { confirmedById: staff.id, status: 'READY', confirmedAt: { gte: since } } }),
    prisma.order.count({ where: { confirmedById: staff.id, status: 'REJECTED', confirmedAt: { gte: since } } }),
    prisma.order.aggregate({
      where: { confirmedById: staff.id, status: { in: ['ACCEPTED', 'READY'] }, confirmedAt: { gte: since } },
      _sum: { total: true },
    }),
  ]);
  const sum = totalToday._sum.total?.toString() ?? '0';
  const lines = [
    `<b>📊 Сегодняшняя смена</b>`,
    '',
    `Принято: <b>${acceptedByMe + readyByMe}</b>`,
    `↳ Готовых: <b>${readyByMe}</b>`,
    `Отклонено: <b>${rejectedByMe}</b>`,
    `Сумма принятых: <b>${sum} ₽</b>`,
  ];
  await sendMessage(chatId, lines.join('\n'), { reply_markup: staffKeyboard(staff) });
}

/* ============================ CALLBACK QUERY ============================ */

async function handleCallback(cb: TgCallback) {
  const tgUserId = cb.from.id;
  const data = cb.data ?? '';
  const match = data.match(/^order:([^:]+):(accept|reject|ready)$/);
  if (!match) {
    await answerCallbackQuery(cb.id, 'Неизвестное действие');
    return;
  }
  const [, orderId, action] = match;

  const staff = await prisma.staff.findUnique({ where: { tgUserId: BigInt(tgUserId) } });
  if (!staff || !staff.authorized) {
    await answerCallbackQuery(cb.id, 'Сначала войдите через /login');
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, session: { include: { table: true } } },
  });
  if (!order) {
    await answerCallbackQuery(cb.id, 'Заказ не найден');
    return;
  }

  // Валидация перехода статусов.
  const ok =
    (action === 'accept' && order.status === 'PENDING') ||
    (action === 'reject' && order.status === 'PENDING') ||
    (action === 'ready'  && order.status === 'ACCEPTED');
  if (!ok) {
    await answerCallbackQuery(cb.id, `Уже ${humanStatus(order.status)}`);
    return;
  }

  const newStatus =
    action === 'accept' ? 'ACCEPTED' :
    action === 'reject' ? 'REJECTED' :
                          'READY';

  let updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      confirmedAt: new Date(),
      confirmedById: action === 'ready' ? order.confirmedById ?? staff.id : staff.id,
    },
    include: { items: true, session: { include: { table: true } } },
  });

  // При «Принять» отправляем заказ в кассу (mock или real в зависимости от
  // RKEEPER_MODE). Если касса вернёт номер чека — сохраняем в rkeeperOrderId
  // и используем в карточке. Ошибка кассы не отменяет приём заказа барменом.
  if (action === 'accept') {
    try {
      const r = await rkeeper.sendOrder(updated, updated.session.table.label);
      if (r.ok) {
        updated = await prisma.order.update({
          where: { id: updated.id },
          data: { rkeeperOrderId: r.receiptId },
          include: { items: true, session: { include: { table: true } } },
        });
        await prisma.auditLog.create({
          data: {
            type: 'rkeeper.sent',
            message: `Чек ${r.receiptId} — заказ ${orderId.slice(-6).toUpperCase()}`,
            meta: { orderId, receiptId: r.receiptId },
          },
        });
      } else {
        console.error('rkeeper sendOrder failed', r.error);
        await prisma.auditLog.create({
          data: {
            type: 'rkeeper.fail',
            message: `Касса вернула ошибку: ${r.error}`,
            meta: { orderId, error: r.error },
          },
        });
      }
    } catch (e: any) {
      console.error('rkeeper sendOrder threw', e);
    }
  }

  await prisma.auditLog.create({
    data: {
      type: `order.${action}`,
      message: `Заказ ${orderId.slice(-6).toUpperCase()} — ${newStatus}`,
      meta: { orderId, staffId: staff.id },
    },
  });

  await answerCallbackQuery(cb.id,
    newStatus === 'ACCEPTED' ? (updated.rkeeperOrderId ? `✓ Принят · чек ${updated.rkeeperOrderId}` : '✓ Принят') :
    newStatus === 'READY'    ? '🍹 Готов' :
                               '✗ Отклонён');

  if (cb.message) {
    const guest = await firstGuestName(updated.sessionId);
    const staffMap = await staffNameMap(updated.confirmedById ? [updated.confirmedById] : []);
    try {
      await editMessageText(
        cb.message.chat.id,
        cb.message.message_id,
        orderCard(updated, updated.session.table.label, guest, staffMap),
        { reply_markup: orderInlineKeyboard(updated.id, updated.status) },
      );
    } catch (e) {
      console.warn('editMessageText failed', e);
    }
  }
}

/* ============================== УТИЛИТЫ ============================== */

async function firstGuestName(sessionId: string): Promise<string> {
  const g = await prisma.guest.findFirst({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
  return g?.name ?? 'Гость';
}

async function staffNameMap(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const list = await prisma.staff.findMany({
    where: { id: { in: Array.from(new Set(ids)) } },
    select: { id: true, name: true },
  });
  return new Map(list.map((s) => [s.id, s.name]));
}

function startOfToday(): Date {
  const tz = process.env.TZ || 'Europe/Moscow';
  const now = new Date();
  // Грубая локализация — достаточно для статистики смены.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  return new Date(`${parts}T00:00:00`);
}

function fmtDateTime(d: Date): string {
  const tz = process.env.TZ || 'Europe/Moscow';
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}

function humanStatus(s: string): string {
  switch (s) {
    case 'ACCEPTED': return 'принят';
    case 'READY':    return 'готов';
    case 'REJECTED': return 'отклонён';
    default:         return s.toLowerCase();
  }
}
