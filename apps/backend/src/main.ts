import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
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
  // Use an explicit callback for clarity and to match Express CORS docs
  app.enableCors({
    origin: (_origin, callback) => {
      callback(null, true); // Reflect request origin in development
    },
    credentials: true,
  });

  // Serve static files (avatars)
  // When running from apps/backend, process.cwd() is apps/backend
  // So uploads folder is at process.cwd()/uploads
  const uploadsPath = join(process.cwd(), 'uploads');
  console.log(`📁 Serving static files from: ${uploadsPath}`);
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Backend API is running on: http://localhost:${port}`);
  console.log('✅ Auth endpoints: /auth/register, /auth/login');
  console.log('✅ Profile endpoints available at /profile');
}

bootstrap().catch((error) => {
  // Ensure unhandled rejections are visible and fail fast
  console.error('❌ Failed to start backend API', error);
  process.exit(1);
});
