// Адаптер r_keeper. Имеет два режима:
// - mock  (по умолчанию): возвращает фиктивный номер чека по детерминированному
//   хэшу orderId. Полностью отрабатывает поток «гость → бот → касса», ничего
//   реально никуда не отправляя.
// - real (Этап 7): заглушка под боевую интеграцию по XML API V7 или Delivery
//   API r_keeper. Активируется через `RKEEPER_MODE=real` в env, когда мы
//   получим credentials и документацию от UCS/партнёра.
//
// Никакая логика бота, заказов и базы не зависит от выбора режима — она
// работает через единый интерфейс RkeeperAdapter ниже.
import type { Order, OrderItem } from '@prisma/client';

export type RkeeperSendResult =
  | { ok: true; receiptId: string }
  | { ok: false; error: string };

export interface RkeeperAdapter {
  /** Отправить принятый заказ на кассу. Возвращает номер чека. */
  sendOrder(
    order: Order & { items: OrderItem[] },
    tableLabel: string,
  ): Promise<RkeeperSendResult>;

  /** Отменить ранее переданный чек (опционально). */
  cancelOrder?(receiptId: string): Promise<RkeeperSendResult>;
}

/* ============================== MOCK ============================== */

class MockAdapter implements RkeeperAdapter {
  async sendOrder(order: Order & { items: OrderItem[] }, _tableLabel: string): Promise<RkeeperSendResult> {
    // Имитация сетевой задержки кассы (~ 200-400 мс).
    await new Promise((r) => setTimeout(r, 200 + Math.floor(Math.random() * 200)));

    // Детерминированный 6-значный номер на основе orderId — у одного и того же
    // заказа всегда одинаковый «чек», повторный вызов отдаст тот же ID.
    const year = new Date().getFullYear();
    const seq = String(Math.abs(hashString(order.id)) % 1_000_000).padStart(6, '0');
    return { ok: true, receiptId: `RK-${year}-${seq}` };
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/* ============================== REAL (заглушка) ============================== */

class RealAdapter implements RkeeperAdapter {
  async sendOrder(): Promise<RkeeperSendResult> {
    // TODO Этап 7: реализовать после получения от партнёра/UCS:
    //   - тип API (XML V7 / Delivery / Cash),
    //   - адрес кассового сервера и креды,
    //   - маппинг наших Base.rkeeperGoodId и Modifier.rkeeperModId,
    //   - запросы CreateOrder + добавление позиций.
    return { ok: false, error: 'real r_keeper adapter is not configured yet — поставьте RKEEPER_MODE=mock' };
  }
}

/* ============================== EXPORT ============================== */

const mode = (process.env.RKEEPER_MODE ?? 'mock').toLowerCase();
export const rkeeper: RkeeperAdapter = mode === 'real' ? new RealAdapter() : new MockAdapter();
export const rkeeperMode = mode;
