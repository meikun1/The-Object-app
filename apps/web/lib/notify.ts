// Шлёт новый заказ всем сотрудникам на смене с inline-кнопками
// «Принять» / «Отклонить». Возвращает количество доставленных сообщений.
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { esc, sendMessage } from '@/lib/telegram';

type OrderForNotify = {
  id: string;
  total: Prisma.Decimal;
  items: { guestName: string; summary: string; qty: number; lineTotal: Prisma.Decimal }[];
};

export async function notifyShiftAboutOrder(
  order: OrderForNotify,
  tableLabel: string,
  guestName: string,
): Promise<number> {
  const onShift = await prisma.staff.findMany({
    where: { authorized: true, onShift: true, chatId: { not: null } },
  });

  if (onShift.length === 0) return 0;

  const text = [
    `🛎 <b>Новый заказ</b>`,
    `Стол: <b>${esc(tableLabel)}</b>`,
    `Гость: <b>${esc(guestName)}</b>`,
    '',
    ...order.items.map((i) => `• ${i.qty}× ${esc(i.summary)} — ${i.lineTotal} ₽`),
    '',
    `Итого: <b>${order.total} ₽</b>`,
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✓ Принять', callback_data: `order:${order.id}:accept` },
        { text: '✗ Отклонить', callback_data: `order:${order.id}:reject` },
      ],
    ],
  };

  let delivered = 0;
  for (const s of onShift) {
    try {
      await sendMessage(Number(s.chatId), text, { reply_markup: keyboard });
      delivered++;
    } catch (e) {
      console.error(`notify staff ${s.id} failed`, e);
    }
  }
  return delivered;
}
