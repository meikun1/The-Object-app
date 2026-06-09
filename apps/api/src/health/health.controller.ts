import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    // Проверяем, что БД отвечает.
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: 'the-object-api', time: new Date().toISOString() };
  }
}
