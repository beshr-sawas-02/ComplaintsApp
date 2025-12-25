import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ تمكين الوصول للصور والملفات داخل مجلد uploads
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // Global Prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({origin: true,Credential:true});

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 التطبيق يعمل على: http://localhost:${port}/api`);
  console.log(`🖼️ الملفات متاحة على: http://localhost:${port}/uploads`);
}

bootstrap();
