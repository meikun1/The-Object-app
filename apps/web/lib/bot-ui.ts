// UI-хелперы Telegram-бота: reply-клавиатуры по ролям/состояниям,
// inline-кнопки для заказов, форматирование карточек.
import type { Order, OrderItem, Staff } from '@prisma/client';
import { esc, InlineKeyboard, ReplyKeyboard } from './telegram';

/* ============================ КЛАВИАТУРЫ ============================ */

/** Постоянная reply-клавиатура снизу чата по состоянию сотрудника. */
export function staffKeyboard(staff: Pick<Staff, 'onShift' | 'role'>): ReplyKeyboard {
  const shift = staff.onShift ? '🔴 Уйти со смены' : '🟢 Встать на смену';
  const row1 = staff.onShift ? [{ text: shift }, { text: '📋 Активные' }] : [{ text: shift }];
  const row2 = [{ text: '📊 Моя смена' }, { text: 'ℹ️ Помощь' }];
  return { keyboard: [row1, row2], resize_keyboard: true, is_persistent: true };
}

/** Inline-кнопки для конкретного заказа по его статусу. */
export function orderInlineKeyboard(
  orderId: string,
  status: 'PENDING' | 'ACCEPTED' | 'READY' | 'REJECTED',
): { inline_keyboard: InlineKeyboard } | undefined {
  if (status === 'PENDING') {
    return {
      inline_keyboard: [[
        { text: '✓ Принять', callback_data: `order:${orderId}:accept` },
        { text: '✗ Отклонить', callback_data: `order:${orderId}:reject` },
      ]],
    };
  }
  if (status === 'ACCEPTED') {
    return {
      inline_keyboard: [[
        { text: '🍹 Готов', callback_data: `order:${orderId}:ready` },
      ]],
    };
  }
  return undefined;
}

/* ============================ КАРТОЧКИ ============================ */

type OrderWithItems = Order & { items: OrderItem[] };

const short = (id: string) => id.slice(-6).toUpperCase();

/** Полный текст карточки заказа с актуальным статусом и пометками.
 *  Позиции группируются по имени гостя, если в заказе их несколько. */
export function orderCard(
  order: OrderWithItems,
  tableLabel: string,
  guestName: string,
  staffNameMap?: Map<string, string>,
): string {
  const lines: string[] = [];
  const head = statusHeadline(order.status, order.id);
  lines.push(head);
  lines.push('');
  lines.push(`🪑 Стол: <b>${esc(tableLabel)}</b>`);

  const byGuest = new Map<string, typeof order.items>();
  for (const it of order.items) {
    const arr = byGuest.get(it.guestName) ?? [];
    arr.push(it);
    byGuest.set(it.guestName, arr);
  }

  if (byGuest.size <= 1) {
    lines.push(`👤 Гость: <b>${esc(guestName)}</b>`);
    lines.push('');
    for (const it of order.items) {
      lines.push(`▸ <b>${it.qty}×</b> ${esc(it.summary)}  <i>${it.lineTotal} ₽</i>`);
    }
  } else {
    lines.push(`👥 Гостей: <b>${byGuest.size}</b>`);
    for (const [name, items] of byGuest) {
      lines.push('');
      lines.push(`<b>${esc(name)}</b>:`);
      for (const it of items) {
        lines.push(`▸ <b>${it.qty}×</b> ${esc(it.summary)}  <i>${it.lineTotal} ₽</i>`);
      }
    }
  }

  lines.push('');
  lines.push(`💰 Итого: <b>${order.total} ₽</b>`);

  if (order.status === 'ACCEPTED' || order.status === 'READY' || order.status === 'REJECTED') {
    lines.push('');
    const who = order.confirmedById ? staffNameMap?.get(order.confirmedById) ?? '—' : '—';
    const when = order.confirmedAt ? fmtTime(order.confirmedAt) : '';
    if (order.status === 'ACCEPTED') lines.push(`✅ Принял: <b>${esc(who)}</b> · ${when}`);
    else if (order.status === 'READY') lines.push(`🍸 Готов: ${when}`);
    else lines.push(`🚫 Отклонил: <b>${esc(who)}</b> · ${when}`);
  }
  return lines.join('\n');
}

function statusHeadline(status: string, id: string): string {
  const ord = `Заказ <code>#${short(id)}</code>`;
  switch (status) {
    case 'PENDING':  return `🛎 <b>Новый заказ</b> · ${ord}`;
    case 'ACCEPTED': return `✅ <b>Принят</b> · ${ord}`;
    case 'READY':    return `🍸 <b>Готов</b> · ${ord}`;
    case 'REJECTED': return `🚫 <b>Отклонён</b> · ${ord}`;
    default:         return ord;
  }
}

function fmtTime(d: Date): string {
  const tz = process.env.TZ || 'Europe/Moscow';
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit', minute: '2-digit', timeZone: tz,
    }).format(d);
  } catch {
    return d.toISOString().slice(11, 16);
  }
}

/* ============================ ТЕКСТЫ ============================ */

export const HELP_TEXT =
  `<b>THE OBJECT</b> — бот бармена\n\n` +
  `Нижняя клавиатура — основные действия. Команды:\n` +
  `<code>/start</code> — главное меню\n` +
  `<code>/orders</code> — активные заказы\n` +
  `<code>/stats</code> — итоги смены\n` +
  `<code>/shift_on</code>, <code>/shift_off</code> — смена\n` +
  `<code>/me</code> — мой статус\n\n` +
  `На каждом заказе кнопки <b>✓ Принять</b> / <b>✗ Отклонить</b>. ` +
  `После Принять появится <b>🍹 Готов</b>.`;

export const WELCOME_GUEST =
  `<b>THE OBJECT</b> — бот бармена.\n\n` +
  `Войдите, чтобы получать заказы:\n` +
  `<code>/login ПАРОЛЬ</code>\n\n` +
  `Пароль выдаёт администратор.`;

export const COMMANDS = [
  { command: 'start',     description: 'Главное меню' },
  { command: 'orders',    description: 'Активные заказы' },
  { command: 'stats',     description: 'Итоги смены' },
  { command: 'shift_on',  description: 'Встать на смену' },
  { command: 'shift_off', description: 'Уйти со смены' },
  { command: 'me',        description: 'Мой статус' },
  { command: 'help',      description: 'Помощь' },
];
