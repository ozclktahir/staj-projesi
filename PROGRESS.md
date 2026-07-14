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
  - [x] Kullanıcı Rolleri ve İzin Sınırları
- [ ] **Faz 4: Operasyonel Modüller / Görev Yönetimi** (Projeler, Görevler, Yorumlar, Dosyalar)
  - [x] Task Modülü CRUD İşlemleri
  - [ ] Proje Modülü
  - [ ] Yorumlar
  - [ ] Dosyalar
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

### [14 Temmuz 2026] - Kullanıcı Rolleri ve İzin Sınırları (Faz 3 Tamamlandı)
- `src/auth/decorators/roles.decorator.ts`: `SetMetadata` kullanılarak `@Roles('Admin', 'Member')` şeklinde endpoint bazlı rol tanımlamayı sağlayan dekoratör eklendi.
- `src/auth/guards/workspace-role.guard.ts`: `Reflector` ile `@Roles(...)` metadata'sını okuyan, rol belirtilmemişse `true` dönen, aksi hâlde `request.params.id`/`workspaceId` ve `request.user.id` üzerinden `workspace_members` tablosunu sorgulayarak kullanıcının rolünü izin verilen roller listesiyle karşılaştıran `WorkspaceRoleGuard` oluşturuldu; yetkisiz erişimde `ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.')` fırlatılıyor.
- `workspace.controller.ts`: `POST /workspace/:id/invite` endpoint'i `@Roles('Admin')` ve `@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)` ile korumaya alındı; davet yetkisi artık otomatik olarak sadece o workspace'in Admin'lerine kısıtlanıyor.
- `workspace.service.ts` içindeki manuel Admin rol kontrolü kaldırıldı; bu sorumluluk artık tamamen `WorkspaceRoleGuard`'a devredildi.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; route'ların hatasız kaydedildiği ve guard zincirinin (önce `SupabaseAuthGuard`, sonra `WorkspaceRoleGuard`) doğru çalıştığı canlı testle doğrulandı: token olmadan/geçersiz token ile `/workspace/:id/invite` isteği `401` döndürdü.
- **Faz 3: Temel Modüller tamamen tamamlandı.**

### [14 Temmuz 2026] - Faz 4: Görev Yönetimi (Task Modülü)
- **Task Modülü CRUD İşlemleri tamamlandı.**
- `nest g module/controller/service task` komutlarıyla Task modülü iskeleti oluşturuldu.
- `src/task/dto`: `CreateTaskDto` (`title` zorunlu, `description`/`status`('TODO'|'IN_PROGRESS'|'DONE')/`priority`('LOW'|'MEDIUM'|'HIGH')/`assigned_to`(UUID)/`due_date` opsiyonel) ve `UpdateTaskDto` (`PartialType(CreateTaskDto)` ile türetildi) validasyonlu DTO'lar eklendi.
- `TaskService`: `create` (`workspace_id` ve `created_by` ile `tasks` tablosuna kayıt), `findAll`, `findOne` (bulunamazsa `NotFoundException`), `update` (`updated_at` dahil), `remove` metotları Supabase istemcisiyle uygulandı.
- `TaskController`: `@Controller('workspaces/:workspaceId/tasks')`, `@ApiTags('Tasks')`, `@ApiBearerAuth()`, `@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)` ile korunan `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` endpoint'leri Swagger dekoratörleriyle belgelendi.
- RBAC: `POST`, `PATCH`, `DELETE` endpoint'lerine `@Roles('Admin', 'Member')` eklendi; `GET` endpoint'lerinde rol kısıtlaması yok, böylece `Guest` rolündeki kullanıcılar sadece görevleri okuyabiliyor, değiştiremiyor.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; loglardan tüm route'ların (`/workspaces/:workspaceId/tasks` altında) başarıyla kaydedildiği doğrulandı.
- Guard zinciri canlı olarak test edildi: token olmadan ve geçersiz token ile yapılan `GET`/`POST`/`PATCH` istekleri `401` döndürdü.
