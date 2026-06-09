// Шлёт новый заказ всем сотрудникам на смене с inline-кнопками
// «Принять» / «Отклонить». Возвращает количество доставленных сообщений.
import type { Order, OrderItem } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendMessage } from '@/lib/telegram';
import { orderCard, orderInlineKeyboard } from '@/lib/bot-ui';

type OrderForNotify = Order & { items: OrderItem[] };

export async function notifyShiftAboutOrder(
  order: OrderForNotify,
  tableLabel: string,
  guestName: string,
): Promise<number> {
  const onShift = await prisma.staff.findMany({
    where: { authorized: true, onShift: true, chatId: { not: null } },
  });
  if (onShift.length === 0) return 0;

  const text = orderCard(order, tableLabel, guestName);
  const keyboard = orderInlineKeyboard(order.id, order.status);

  let delivered = 0;
  for (const s of onShift) {
    try {
      await sendMessage(Number(s.chatId), text, keyboard ? { reply_markup: keyboard } : undefined);
      delivered++;
    } catch (e) {
      console.error(`notify staff ${s.id} failed`, e);
    }
  }
  return delivered;
}
