import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Гостевое web-приложение ходит сюда из браузера — разрешаем CORS.
  app.enableCors({ origin: true, credentials: true });
  const port = Number(process.env.API_PORT) || 4000;
  await app.listen(port);
  console.log(`API запущен: http://localhost:${port} (health: /health)`);
}
bootstrap();
