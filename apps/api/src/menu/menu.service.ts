import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  // Полное меню конструктора: основы → группы → модификаторы.
  // Возвращаем только доступные позиции, отсортированные.
  async getMenu() {
    const bases = await this.prisma.base.findMany({
      where: { available: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        groups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            modifiers: {
              where: { available: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    return { bases };
  }
}
