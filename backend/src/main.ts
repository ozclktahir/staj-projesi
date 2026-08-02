import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

function resolveCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === '*') {
    // Deploy sırasında frontend URL henüz yoksa tüm origin'lere izin ver
    return true;
  }
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return true;
  if (list.length === 1) return list[0];
  return list;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      // Flutter web (farklı port) tarayıcıdan API okuyabilsin
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors({ origin: resolveCorsOrigin(), credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('staj-projesi API')
    .setDescription(
      'İş ve Çalışma Alanı Yönetim Sistemi (staj-projesi) API Dokümantasyonu',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
