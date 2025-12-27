import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Backend API is running on: http://localhost:${port}`);
  console.log(`✅ Hello World! Backend is working`);
}
bootstrap();
