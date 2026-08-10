import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SentryInterceptor } from './common/sentry.interceptor';

// SENTRY_DSN tanımlıysa hata izleme aktifleşir; tanımlı değilse SDK init
// edilmez ve SentryInterceptor sessizce no-op olur (bkz. CLAUDE.md).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

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

  const corsRaw = process.env.CORS_ORIGIN?.trim();
  if (process.env.NODE_ENV === 'production' && (!corsRaw || corsRaw === '*')) {
    console.warn(
      '[SECURITY] CORS_ORIGIN prod ortamında boş/"*" — tüm origin\'lere izin veriliyor. ' +
        "Render Dashboard'da CORS_ORIGIN'i web servisinin gerçek URL'sine kısıtlamanız önerilir.",
    );
  }
  app.enableCors({ origin: resolveCorsOrigin(), credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new SentryInterceptor());

  const config = new DocumentBuilder()
    .setTitle('staj-projesi API')
    .setDescription(
      'İş ve Çalışma Alanı Yönetim Sistemi (staj-projesi) API Dokümantasyonu',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
