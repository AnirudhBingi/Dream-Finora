import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS for mobile app (allow all origins in development)
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Backend API is running on: http://localhost:${port}`);
  console.log(`✅ Authentication endpoints available at /auth/register and /auth/login`);
}
bootstrap();
