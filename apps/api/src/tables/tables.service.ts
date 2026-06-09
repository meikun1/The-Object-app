import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  // Список столов (для проверки сидов; управление — в админке, Этап 6).
  async list() {
    const tables = await this.prisma.table.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, label: true, kind: true, sortOrder: true },
    });
    return { tables };
  }
}
