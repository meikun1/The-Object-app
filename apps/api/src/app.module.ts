import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { MenuModule } from './menu/menu.module';
import { TablesModule } from './tables/tables.module';
import { BookingModule } from './booking/booking.module';

@Module({
  imports: [PrismaModule, MenuModule, TablesModule, BookingModule],
  controllers: [HealthController],
})
export class AppModule {}
