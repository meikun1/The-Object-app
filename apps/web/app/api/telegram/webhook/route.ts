// Webhook Telegram-бота бармена.
// Команды:
//   /start          — приветствие + подсказка про /login
//   /login ПАРОЛЬ   — авторизация (BOT_ACCESS_PASSWORD из env)
//   /shift_on       — встать на смену
//   /shift_off      — уйти со смены
//   /me             — статус (авторизован / на смене)
//
// Callback queries: order:<orderId>:accept | order:<orderId>:reject
//   Подтверждение/отклонение заказа со страницы /t/[token].
//
// Защита от подделок: проверяем заголовок X-Telegram-Bot-Api-Secret-Token,
// если задан TELEGRAM_WEBHOOK_SECRET в env (выставлен при setWebhook).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { answerCallbackQuery, editMessageText, esc, sendMessage } from '@/lib/telegram';

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
      return NextResponse.json({ ok: true }); // молча игнорируем подделку
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
  const text = (m.text ?? '').trim();
  const fullName = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ') || m.from?.username || `user_${tgUserId}`;

  if (text === '/start' || text.startsWith('/start ')) {
    await sendMessage(
      chatId,
      `<b>THE OBJECT</b> — бот бармена.\n\n` +
        `Войдите, чтобы получать заказы:\n<code>/login ПАРОЛЬ</code>\n\n` +
        `Пароль выдаёт администратор.`,
    );
    return;
  }

  if (text.startsWith('/login ')) {
    const password = text.slice('/login '.length).trim();
    const expected = process.env.BOT_ACCESS_PASSWORD;
    if (!expected) {
      await sendMessage(chatId, 'BOT_ACCESS_PASSWORD не настроен на сервере.');
      return;
    }
    if (password !== expected) {
      await sendMessage(chatId, 'Неверный пароль.');
      return;
    }
    // Привязываем Telegram к записи Staff. Если у этого tgUserId уже есть
    // запись — обновляем chatId и имя. Если нет — создаём BARMAN.
    const existing = await prisma.staff.findUnique({ where: { tgUserId: BigInt(tgUserId) } });
    if (existing) {
      await prisma.staff.update({
        where: { id: existing.id },
        data: { chatId: BigInt(chatId), name: fullName, authorized: true, lastLoginAt: new Date() },
      });
    } else {
      await prisma.staff.create({
        data: {
          name: fullName,
          role: 'BARMAN',
          tgUserId: BigInt(tgUserId),
          chatId: BigInt(chatId),
          authorized: true,
          lastLoginAt: new Date(),
        },
      });
    }
    await prisma.auditLog.create({
      data: { type: 'staff.login', message: `${fullName} вошёл`, meta: { tgUserId } },
    });
    await sendMessage(
      chatId,
      `Вы вошли как <b>${esc(fullName)}</b>.\n\n` +
        `Команды:\n<code>/shift_on</code> — встать на смену\n` +
        `<code>/shift_off</code> — уйти со смены\n<code>/me</code> — статус`,
    );
    return;
  }

  const staff = await prisma.staff.findUnique({ where: { tgUserId: BigInt(tgUserId) } });
  if (!staff || !staff.authorized) {
    if (text.startsWith('/')) {
      await sendMessage(chatId, 'Сначала войдите: <code>/login ПАРОЛЬ</code>');
    }
    return;
  }

  // Поддерживаем chatId в актуальном состоянии — пользователь мог удалить чат и начать заново.
  if (staff.chatId !== BigInt(chatId)) {
    await prisma.staff.update({ where: { id: staff.id }, data: { chatId: BigInt(chatId) } });
  }

  if (text === '/shift_on') {
    await prisma.staff.update({ where: { id: staff.id }, data: { onShift: true } });
    await sendMessage(chatId, '✅ Вы на смене. Заказы будут приходить сюда.');
    return;
  }
  if (text === '/shift_off') {
    await prisma.staff.update({ where: { id: staff.id }, data: { onShift: false } });
    await sendMessage(chatId, '⏸ Смена окончена. Заказы пока не присылаем.');
    return;
  }
  if (text === '/me') {
    await sendMessage(
      chatId,
      `<b>${esc(staff.name)}</b>\nРоль: ${staff.role}\nСмена: ${staff.onShift ? 'на смене' : 'выкл'}`,
    );
    return;
  }
  if (text.startsWith('/')) {
    await sendMessage(chatId, 'Команды: /shift_on /shift_off /me');
  }
}

/* ============================ CALLBACK QUERY ============================ */

async function handleCallback(cb: TgCallback) {
  const tgUserId = cb.from.id;
  const data = cb.data ?? '';
  const match = data.match(/^order:([^:]+):(accept|reject)$/);
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
  if (order.status !== 'PENDING') {
    await answerCallbackQuery(cb.id, `Уже ${order.status === 'ACCEPTED' ? 'принят' : 'обработан'}`);
    return;
  }

  const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      confirmedAt: new Date(),
      confirmedById: staff.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      type: `order.${action}`,
      message: `Заказ ${orderId.slice(-6).toUpperCase()} — ${newStatus}`,
      meta: { orderId, staffId: staff.id },
    },
  });

  await answerCallbackQuery(cb.id, newStatus === 'ACCEPTED' ? '✓ Принят' : '✗ Отклонён');

  // Обновляем сообщение в чате того, кто нажал — без кнопок, с пометкой статуса.
  if (cb.message) {
    const mark = newStatus === 'ACCEPTED'
      ? `\n\n<b>✓ Принят — ${esc(staff.name)}</b>`
      : `\n\n<b>✗ Отклонён — ${esc(staff.name)}</b>`;
    const baseText = (cb.message.text ?? '') + mark;
    try {
      await editMessageText(cb.message.chat.id, cb.message.message_id, baseText);
    } catch (e) {
      console.warn('editMessageText failed', e);
    }
  }
}

