import { MailService } from './mail.service';

describe('MailService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('SMTP_HOST tanımlı değilse enabled=false olur ve send() no-op çalışır', async () => {
    delete process.env.SMTP_HOST;
    const service = new MailService();

    expect(service.enabled).toBe(false);

    await expect(
      service.send({ to: 'a@b.com', subject: 'Test', html: '<p>hi</p>' }),
    ).resolves.toBeUndefined();
  });

  it('SMTP_HOST tanımlıysa enabled=true olur', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';

    const service = new MailService();

    expect(service.enabled).toBe(true);
  });
});
