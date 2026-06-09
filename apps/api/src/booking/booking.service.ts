import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type { BookingRequest } from './booking.controller';

@Injectable()
export class BookingService {
  private readonly log = new Logger('Booking');

  async handle(d: BookingRequest) {
    // honeypot: тихо «ок», но в бот не шлём
    if (d.company) return { ok: true };

    if (!d.name || !d.phone) {
      throw new BadRequestException('name и phone обязательны');
    }

    const lines = [
      '🍸 Новая бронь — THE OBJECT',
      `Имя: ${d.name}`,
      `Телефон: ${d.phone}`,
      `Дата: ${d.date || '-'}   Время: ${d.time || '-'}`,
      `Гостей: ${d.guests ?? '-'}`,
    ];
    if (d.note) lines.push(`Пожелания: ${d.note}`);
    const text = lines.join('\n');

    const token = process.env.BOT_TOKEN;
    const chatId = process.env.BOOKING_CHAT_ID;
    if (!token || !chatId) {
      // Без секретов — заявку принимаем (для разработки), но в Telegram не шлём.
      this.log.warn('BOT_TOKEN/BOOKING_CHAT_ID не заданы — бронь принята локально:\n' + text);
      return { ok: true, delivered: false };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) {
      this.log.error(`Telegram sendMessage упал: ${res.status}`);
      throw new InternalServerErrorException('Telegram недоступен');
    }
    return { ok: true, delivered: true };
  }
}
