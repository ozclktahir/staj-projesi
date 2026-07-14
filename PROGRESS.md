# 🚀 İş Yönetim Sistemi (staj-projesi) - İlerleme Günlüğü

## 🛠 Kullanılacak Teknolojiler
- **Frontend:** Flutter
- **Backend API:** Node.js (NestJS) + Swagger (Dokümantasyon)
- **Veritabanı & Auth:** Supabase (PostgreSQL)
- **Dosya Depolama:** Supabase Storage
- **Gerçek Zamanlı İletişim:** Supabase Realtime
- **Önbellekleme (Cache) & Oturum:** Redis
- **DevOps:** Docker & Docker Compose
- **Versiyon Kontrolü:** Git & GitHub

## 🗺️ Genel Yol Haritası
- [x] **Faz 1: Proje Kurulumu ve Docker Mimarisi** (NestJS inşası, Docker ve Redis entegrasyonu)
- [x] **Faz 2: Supabase ve Swagger Entegrasyonu** (Veritabanı bağlantısı, dokümantasyon altyapısı)
- [x] **Faz 3: Temel Modüller** (Auth, Workspace, Kullanıcı Rolleri)
  - [x] Auth Modülü (Kayıt/Giriş/Çıkış)
  - [x] Workspace Yönetimi ve Rol Yapısı
- [ ] **Faz 4: Operasyonel Modüller** (Projeler, Görevler, Yorumlar, Dosyalar)
- [ ] **Faz 5: Gelişmiş Özellikler** (Redis Caching, WebSockets, Time Tracking)
- [ ] **Faz 6: Frontend (Flutter) Hazırlığı** (Mimari kurulum, state management)
- [ ] **Faz 7: Frontend Entegrasyonu** (Tüm backend servislerinin UI ile bağlanması)
- [ ] **Faz 8: Test, Optimizasyon ve Sunum**

### 🔮 Gelecek Planları (Zaman Kalırsa eklenecekler)
- [ ] AI ile görev önerileri, özeti ve deadline tahmini.

---
## 📑 Günlük Loglar ve İlerleme

### [13 Temmuz 2026] - Başlangıç ve Dockerizasyon
- Proje gereksinimleri analiz edildi, mimari plan çıkartıldı.
- NestJS projesi ayağa kaldırıldı.
- Dockerfile ve docker-compose.yml entegrasyonu tamamlandı.
- Redis cache servisi docker üzerinde başarıyla çalıştırıldı.
- İlk git commit'i atıldı.

### [14 Temmuz 2026] - Supabase ve Swagger Entegrasyonu
- `@nestjs/swagger`, `swagger-ui-express`, `@supabase/supabase-js` ve `@nestjs/config` paketleri backend'e kuruldu.
- `main.ts` içerisine Swagger dokümantasyonu entegre edildi; dokümantasyon `/api` path'inde yayınlanmaya başlandı (Başlık: `staj-projesi API`, Versiyon: `1.0`).
- `src/supabase` altında `SupabaseModule` ve `SupabaseService` oluşturuldu; `ConfigService` üzerinden `SUPABASE_URL` ve `SUPABASE_KEY` değerleri güvenli bir şekilde okunarak `createClient` ile Supabase istemcisi başlatıldı ve `getClient()` getter'ı ile dışarıya sunuldu.
- `app.module.ts` güncellendi: `ConfigModule.forRoot({ isGlobal: true })` ile `.env` değişkenleri projenin her yerinde erişilebilir hâle getirildi, `SupabaseModule` uygulamaya dahil edildi.
- `npm run build` ile derleme testi yapıldı, hatasız şekilde tamamlandı.

### [14 Temmuz 2026] - Faz 3: Temel Modüller
- **Auth Modülü (Kayıt/Giriş) tamamlandı.**
- `class-validator` ve `class-transformer` paketleri kuruldu; `main.ts`'e `app.useGlobalPipes(new ValidationPipe({ whitelist: true }))` ile global validasyon eklendi.
- `src/auth` altında `RegisterDto` ve `LoginDto` (`@ApiProperty`, `IsEmail`, `IsString`, `MinLength(6)` ile), `AuthService` (Supabase `auth.signUp`, `auth.signInWithPassword`, `auth.admin.signOut` entegrasyonu) ve `AuthController` (`/auth/register`, `/auth/login`, `/auth/logout`, Swagger `@ApiTags`/`@ApiOperation`/`@ApiResponse` ile belgelenmiş) oluşturuldu.
- `AuthModule`, `SupabaseModule`'ü import ederek `app.module.ts`'e dahil edildi.
- Gerçek Supabase proje bilgileri (`SUPABASE_URL`, `SUPABASE_KEY`) `.env` dosyasına işlendi.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; loglarda daha önce görülen "SUPABASE_URL veya SUPABASE_KEY tanımlı değil" uyarısının kaybolduğu ve `Supabase istemcisi başarıyla başlatıldı.` mesajının geldiği doğrulandı.
- `/auth/register` ve `/auth/login` endpoint'leri canlı olarak test edildi: geçersiz e-posta formatında `400` (validasyon), geçersiz kimlik bilgileriyle `401` (Supabase Auth) yanıtı alındı.

### [14 Temmuz 2026] - Workspace Yönetimi ve Rol Yapısı
- `src/auth/guards/supabase-auth.guard.ts`: `Authorization` başlığındaki Bearer token'ı `supabase.auth.getUser` ile doğrulayan `SupabaseAuthGuard` oluşturuldu; geçerli istekte `request.user` dolduruluyor, aksi hâlde `UnauthorizedException` fırlatılıyor.
- `src/auth/decorators/get-user.decorator.ts`: `request.user`'ı controller metotlarına enjekte eden `@GetUser()` parametre dekoratörü eklendi.
- `nest g module/controller/service workspace` komutlarıyla Workspace modülü iskeleti oluşturuldu.
- `src/workspace/dto`: `CreateWorkspaceDto` (`name` zorunlu, `description` opsiyonel) ve `InviteMemberDto` (`email`, `role: 'Admin' | 'Member' | 'Guest'`) validasyonlu DTO'lar eklendi.
- `WorkspaceService`: `create` (workspace oluşturup oluşturan kullanıcıyı `workspace_members`'a Admin olarak ekliyor), `findAll` (kullanıcının üye olduğu workspace'leri `workspace_members` üzerinden getiriyor), `invite` (davet edenin Admin olup olmadığını kontrol edip `workspace_invitations`'a kayıt açıyor, değilse `ForbiddenException`) metotları Supabase istemcisiyle uygulandı.
- `WorkspaceController`: `@ApiTags('Workspace')`, `@ApiBearerAuth()` ve `@UseGuards(SupabaseAuthGuard)` ile korunan `POST /workspace`, `GET /workspace`, `POST /workspace/:id/invite` endpoint'leri Swagger `@ApiOperation`/`@ApiResponse` dekoratörleriyle belgelendi.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; route'ların (`/workspace`, `/workspace/:id/invite`) başarıyla kaydedildiği loglardan doğrulandı.
- Guard canlı olarak test edildi: token olmadan ve geçersiz token ile yapılan `GET`/`POST /workspace` istekleri `401` döndürdü.
