import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

/**
 * Opsiyonel SMTP e-posta gönderimi. SMTP_HOST tanımlı değilse `enabled=false`
 * olur ve `send` çağrıları sessizce no-op'tur — mevcut in-app bildirim akışı
 * (workspace daveti vb.) tek başına çalışmaya devam eder. Gerçek bir SMTP
 * sağlayıcısı (Gmail, Resend SMTP, SendGrid SMTP...) bağlanmak isteyen,
 * backend/.env.example'daki SMTP_* değişkenlerini doldurmalıdır.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor() {
    this.from = process.env.SMTP_FROM || process.env.SMTP_USER || '';

    if (!process.env.SMTP_HOST) {
      this.logger.warn(
        'SMTP_HOST tanımlı değil. E-posta bildirimleri devre dışı; yalnızca in-app bildirim kullanılacak.',
      );
      return;
    }

    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  async send(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.transporter) return;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
    } catch (error) {
      // E-posta gönderimi başarısız olsa da asıl işlemi (davet/kayıt) bozmamalı.
      this.logger.warn(
        `E-posta gönderilemedi (to=${params.to}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
