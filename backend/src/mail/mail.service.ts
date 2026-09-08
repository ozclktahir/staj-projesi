import { Injectable, Logger } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { createTransport, Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

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
  private readonly smtpHost: string | undefined;
  private readonly from: string;

  constructor() {
    this.smtpHost = process.env.SMTP_HOST;
    this.from = process.env.SMTP_FROM || process.env.SMTP_USER || '';

    if (!this.smtpHost) {
      this.logger.warn(
        'SMTP_HOST tanımlı değil. E-posta bildirimleri devre dışı; yalnızca in-app bildirim kullanılacak.',
      );
    }
  }

  get enabled(): boolean {
    return !!this.smtpHost;
  }

  /**
   * Her gönderimde taze bir transporter kurulur (kalıcı bağlantı tutulmuyor,
   * maliyeti düşük). SMTP host'un IPv4 adresini KENDİMİZ çözüp `host` alanına
   * literal IP olarak veriyoruz: nodemailer'ın kendi DNS mantığı
   * (node_modules/nodemailer/lib/shared/index.js → resolveHostname) hem A
   * hem AAAA kayıtlarını çözüp aralarından RASTGELE seçiyor — Render'ın
   * konteynerlerinde gerçek IPv6 çıkışı olmadığı için AAAA seçilirse
   * "connect ENETUNREACH ...:587" ile anında patlıyor (canlıda doğrulandı).
   * nodemailer'da bunu devre dışı bırakacak bir `family` seçeneği YOK; tek
   * güvenilir çözüm DNS'i önceden kendimiz çözüp IP literal'i vermek. `host`
   * artık IP olduğu için TLS sertifika/SNI doğrulaması `tls.servername` ile
   * gerçek hostname'e sabitleniyor (aksi halde IP'ye karşı sertifika hostname
   * uyuşmazlığından TLS hata verirdi).
   *
   * `dns.lookup()` (OS resolver üzerinden, `getaddrinfo`) kullanılıyor —
   * `dns.resolve4()` (c-ares ile nameserver'a doğrudan sorgu) bazı ağlarda
   * (bu makinede de canlı denendi) `ECONNREFUSED` ile başarısız oluyor;
   * `lookup` çok daha taşınabilir.
   */
  private async createTransporter(): Promise<Transporter> {
    const host = this.smtpHost!;
    let connectHost: string = host;

    try {
      const addresses = await lookup(host, { all: true, family: 4 });
      if (addresses.length > 0) {
        connectHost =
          addresses[Math.floor(Math.random() * addresses.length)].address;
      }
    } catch (error) {
      this.logger.warn(
        `SMTP host için IPv4 adresi çözümlenemedi (${host}), hostname doğrudan kullanılacak ` +
          `(IPv6'ya düşülürse gönderim başarısız olabilir): ${
            error instanceof Error ? error.message : String(error)
          }`,
      );
    }

    return createTransport({
      host: connectHost,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
      tls: { servername: host },
    } as SMTPTransport.Options);
  }

  async send(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.smtpHost) return;

    try {
      const transporter = await this.createTransporter();
      await transporter.sendMail({
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

  /** Kayıt sonrası gerçek e-posta onayı — Supabase admin.generateLink() çıktısı. */
  async sendEmailConfirmationLink(to: string, actionLink: string): Promise<void> {
    await this.send({
      to,
      subject: 'E-posta Adresinizi Onaylayın',
      html:
        `<p>Hesabınızı etkinleştirmek için aşağıdaki bağlantıya tıklayın:</p>` +
        `<p><a href="${actionLink}">${actionLink}</a></p>` +
        `<p>Bu bağlantıyı siz istemediyseniz bu e-postayı yok sayabilirsiniz.</p>`,
    });
  }
}
