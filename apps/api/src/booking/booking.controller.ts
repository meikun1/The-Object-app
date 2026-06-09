import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { BookingService } from './booking.service';

export type BookingRequest = {
  name?: string;
  phone?: string;
  date?: string;
  time?: string;
  guests?: string | number;
  note?: string;
  // honeypot — заполняется только ботом
  company?: string;
};

@Controller('booking')
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Post()
  @HttpCode(200)
  async create(@Body() body: BookingRequest) {
    return this.booking.handle(body);
  }
}
