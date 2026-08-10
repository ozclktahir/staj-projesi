import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Observable, catchError, throwError } from 'rxjs';

/**
 * Yalnızca beklenmeyen (5xx) hataları Sentry'ye raporlar; orijinal exception'ı
 * değiştirmeden yeniden fırlatır ki Nest'in varsayılan hata yanıt formatı
 * (mevcut istemci davranışı) bozulmasın. SENTRY_DSN tanımlı değilse
 * Sentry.captureException no-op'tur (SDK init edilmemiş olur).
 */
@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        const status =
          error instanceof HttpException ? error.getStatus() : 500;
        if (status >= 500) {
          Sentry.captureException(error);
        }
        return throwError(() => error);
      }),
    );
  }
}
