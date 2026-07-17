# 🚀 İş Yönetim Sistemi (staj-projesi) - İlerleme Günlüğü

## 🛠 Kullanılacak Teknolojiler
- **Backend API:** Node.js (NestJS) + Swagger (Dokümantasyon)
- **Web Frontend:** Next.js + Tailwind CSS + Shadcn/UI *(öncelikli)*
- **Mobil Uygulama:** Flutter *(web fazı tamamlandıktan sonra)*
- **Veritabanı & Auth:** Supabase (PostgreSQL)
- **Dosya Depolama:** Supabase Storage
- **Gerçek Zamanlı İletişim:** Supabase Realtime / WebSockets
- **Önbellekleme (Cache) & Oturum:** Redis
- **DevOps:** Docker & Docker Compose
- **Versiyon Kontrolü:** Git & GitHub

## 🗺️ Genel Yol Haritası
- [x] **Faz 1: Proje Kurulumu ve Docker Mimarisi** (NestJS inşası, Docker ve Redis entegrasyonu)
- [x] **Faz 2: Supabase ve Swagger Entegrasyonu** (Veritabanı bağlantısı, dokümantasyon altyapısı)
- [x] **Faz 3: Temel Modüller** (Auth, Workspace, Kullanıcı Rolleri)
  - [x] Auth Modülü (Kayıt/Giriş/Çıkış)
  - [x] Kayıt işlemi için User modeline Ad (firstName) ve Soyad (lastName) eklendi ve Frontend'e bağlandı.
  - [x] Workspace Yönetimi ve Rol Yapısı
  - [x] Kullanıcı Rolleri ve İzin Sınırları
- [x] **Faz 4: Operasyonel Modüller / Görev Yönetimi** (Projeler, Görevler, Yorumlar, Dosyalar)
  - [x] Task Modülü CRUD İşlemleri
  - [x] Proje Modülü
  - [x] Yorumlar Modülü
  - [x] Dosyalar Modülü
- [ ] **Faz 5: Sistem Cilası ve Optimizasyon** (Activity Log, Redis Caching, WebSockets)
  - [x] Activity Log (Aktivite Günlüğü) Modülü
  - [x] Task Modülü Arama ve Sayfalama (Pagination)
  - [x] Redis Caching Entegrasyonu
  - [ ] WebSockets
  - [x] Progress Report (İlerleme Raporu) Modülü
  - [x] Notion Tarzı Notlar ve Kişisel Pano Modülü
- [x] **Faz 6: Deployment Hazırlığı ve Canlıya Alma** (Güvenlik, CORS, Healthcheck)
  - [x] CORS Yapılandırması
  - [x] Helmet ile HTTP Güvenlik Başlıkları
  - [x] Healthcheck Modülü
- [ ] **Faz 6: İleri Düzey Kurumsal Özellikler**
  - [x] Görev Geliştirmeleri (Atanan Kişi, Son Teslim Tarihi, Alt Görevler)
  - [x] Kullanıcı Profili (Avatar, Tema)
  - [x] Gerçek Dosya Yükleme (Supabase Storage Entegrasyonu)
  - [x] İstatistiksel Dashboard (Tamamlanan/Geciken Görevler)
  - [x] Soft Delete (Çöp Kutusu / Arşiv Mantığı)
  - [x] Bildirim Sistemi ve WebSockets (Gerçek Zamanlı Güncellemeler).
  - [x] Role Enforcement (Yetki Denetimi ve Güvenlik Sıkılaştırması)
  - [x] Görevlere Dosya (file_url) İlişkilendirmesi
  - [x] Admin Paneli ve İstatistik Uç Noktaları
  - [x] Rotalarda Workspace Üyeliği Zorunluluğu (Global Membership Enforcement)
  - [x] Görev Atama ve Durum Değişikliklerinde Tetiklenen Real-time Bildirim Entegrasyonu
  - [x] Bildirim HTTP Uç Noktaları (Listeleme / Okundu / Tümünü Okundu)
  - [x] Project ↔ Task Hiyerarşisi API Entegrasyonu (projectId Filtreleme)
  - [x] Davet Kabul ve Üye Ekleme Akışı (Invitation Accept)
  - [x] Admin Yetki Korumaları (Kendini Silme & Son Admin Kontrolü)
  - [x] Çöp Kutusundan Görev Kurtarma (Soft Delete Restore)
  - [x] Veritabanı SQL Şema Değişikliklerinin Dokümante Edilmesi
- [ ] **Faz 7: Web Frontend Geliştirme (Next.js)**
  - [x] Next.js 14+ (App Router) ve Tailwind CSS kurulumu (Altyapı ve Axios entegrasyonu tamamlandı)
  - [x] Turuncu-Siyah tema tasarımı, renk ve stil (border-radius) ayarları tamamlandı
  - [x] Aydınlık/Karanlık mod altyapısı aktif
  - [x] Auth (Login/Register) sayfalarının tasarımı ve Split-Screen düzeni tamamlandı
  - [x] Auth (Giriş/Kayıt) sayfalarının UI tasarımı, form validasyonları (Zod + React Hook Form) ve API entegrasyonu tamamlandı.
  - [ ] Workspace (Çalışma Alanı) listeleme ve oluşturma arayüzleri
  - [ ] Task (Görev) yönetimi ve detay ekranları
- [ ] **Faz 8: Mobil Uygulama Geliştirme (Flutter)**
  - [ ] Flutter proje kurulumu ve mimari yapılandırma (Web fazı tamamlandıktan sonra başlanacak)
  - [ ] Mobil için Auth, Workspace ve Task ekranlarının geliştirilmesi

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

### [14 Temmuz 2026] - Faz 4: Proje Modülü
- **Proje Modülü tamamlandı.**
- `nest g module/controller/service project` komutlarıyla Project modülü iskeleti oluşturuldu.
- `src/project/dto/create-project.dto.ts`: `name` (zorunlu) ve `description` (opsiyonel) alanları validasyonlu şekilde eklendi.
- `ProjectService`: `create` (`workspace_id` ve `created_by` ile `projects` tablosuna kayıt), `findAll` (workspace'e ait projeleri listeler), `remove` (bulunamazsa `NotFoundException`) metotları Supabase istemcisiyle uygulandı.
- `ProjectController`: `@Controller('workspaces/:workspaceId/projects')`, `@ApiTags('Projects')`, `@ApiBearerAuth()`, `@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)` ile korunan `POST /`, `GET /`, `DELETE /:id` endpoint'leri Swagger dekoratörleriyle belgelendi; oluşturma ve silme işlemlerine `@Roles('Admin', 'Member')` eklendi.
- Task modülü bilinçli olarak izole tutuldu; `tasks` tablosundaki `project_id` alanına şimdilik dokunulmadı.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; loglardan tüm route'ların (`/workspaces/:workspaceId/projects` altında) başarıyla kaydedildiği doğrulandı.
- Guard zinciri canlı olarak test edildi: token olmadan ve geçersiz token ile yapılan `GET`/`POST`/`DELETE` istekleri `401` döndürdü.

### [14 Temmuz 2026] - Faz 4: Yorumlar Modülü
- **Yorumlar Modülü tamamlandı.**
- `nest g module/controller/service comment` komutlarıyla Comment modülü iskeleti oluşturuldu.
- `src/comment/dto/create-comment.dto.ts`: `content` (zorunlu, `IsString`/`IsNotEmpty`) alanı validasyonlu şekilde eklendi.
- `CommentService`: `create` (`task_id` ve `user_id` ile `comments` tablosuna kayıt), `findAll` (ilgili `taskId`'ye ait yorumları `created_at`'e göre sıralı listeler) metotları Supabase istemcisiyle uygulandı. Not: Supabase anon istemcisi `auth.users` şemasına doğrudan erişemediğinden, yorumlar şimdilik `user_id` ile birlikte dönüyor; kullanıcı profil bilgisi ileride bir `profiles` tablosu eklendiğinde join edilebilir.
- `CommentController`: `@Controller('workspaces/:workspaceId/tasks/:taskId/comments')`, `@ApiTags('Comments')`, `@ApiBearerAuth()`, `@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)` ile korunan `POST /` (`@Roles('Admin', 'Member')`) ve `GET /` (rol kısıtlaması yok, herkes okuyabilir) endpoint'leri Swagger dekoratörleriyle belgelendi.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; loglardan `/workspaces/:workspaceId/tasks/:taskId/comments` route'larının başarıyla kaydedildiği doğrulandı.
- Guard zinciri canlı olarak test edildi: token olmadan ve geçersiz token ile yapılan `GET`/`POST` istekleri `401` döndürdü.

### [14 Temmuz 2026] - Faz 4: Dosyalar Modülü (Faz 4 Tamamlandı)
- **Dosyalar Modülü tamamlandı.**
- `nest g module/controller/service file` komutlarıyla File modülü iskeleti oluşturuldu.
- `src/file/dto/create-file.dto.ts`: `file_name`, `file_url` (`IsUrl`), `file_type` alanları zorunlu olarak eklendi.
- `FileService`: `create` (`task_id` ve `user_id` ile `files` tablosuna kayıt), `findAll` (ilgili `taskId`'ye ait dosyaları `created_at`'e göre sıralı listeler), `remove` (`fileId` ile silme, bulunamazsa `NotFoundException`) metotları Supabase istemcisiyle uygulandı.
- `FileController`: `@Controller('workspaces/:workspaceId/tasks/:taskId/files')`, `@ApiTags('Files')`, `@ApiBearerAuth()`, `@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)` ile korunan `POST /`, `GET /`, `DELETE /:fileId` endpoint'leri Swagger dekoratörleriyle belgelendi.
- **Bonus - User Projection:** `CommentService.findAll` güncellendi; yorumlardaki `user_id`'ler üzerinden `profiles` tablosundan eşleşen kayıtlar ayrıca çekilip her yoruma `author` alanı olarak simüle edilmiş bir join ile eklendi (gerçek bir foreign-key join yerine iki ayrı sorgu + `Map` ile eşleştirme kullanıldı, çünkü PostgREST anon istemcisi `auth.users` şemasını doğrudan açmıyor).
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; loglardan `/workspaces/:workspaceId/tasks/:taskId/files` route'larının başarıyla kaydedildiği doğrulandı.
- Guard zinciri canlı olarak test edildi: token olmadan ve geçersiz token ile yapılan `GET`/`POST`/`DELETE` istekleri `401` döndürdü.
- **Faz 4: Operasyonel Modüller (Projeler, Görevler, Yorumlar, Dosyalar) tamamen tamamlandı.**

### [14 Temmuz 2026] - Faz 5: Sistem Cilası ve Optimizasyon Başladı — Activity Log Modülü
- **Activity Log (Aktivite Günlüğü) Modülü tamamlandı.**
- `nest g module/controller/service activity-log` komutlarıyla ActivityLog modülü iskeleti oluşturuldu.
- `src/activity-log/dto/create-activity-log.dto.ts`: `entity_type` (String), `entity_id` (UUID), `action` (String) zorunlu; `details` (opsiyonel JSON/Object) alanları validasyonlu şekilde eklendi.
- `ActivityLogService`: `logAction(workspaceId, userId, dto)` (`workspace_id` ve `user_id` ile `activity_logs` tablosuna kayıt), `findAllByWorkspace(workspaceId)` (`created_at`'e göre en yeniden eskiye/`DESC` sıralı listeler) metotları Supabase istemcisiyle uygulandı.
- `ActivityLogController`: `@Controller('workspaces/:workspaceId/activity-logs')`, `@ApiTags('Activity Logs')`, `@ApiBearerAuth()`, `@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)` ile korunan `POST /` ve `GET /` endpoint'leri, her ikisi de `@Roles('Admin', 'Member')` kısıtlamasıyla (Guest'ler aktivite loglarını göremiyor) Swagger dekoratörleriyle belgelendi.
- `ActivityLogService`, ileride diğer modüllerin (Task, Project, Comment vb.) aksiyonları otomatik loglayabilmesi için `ActivityLogModule`'den `exports` edildi.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; loglardan `/workspaces/:workspaceId/activity-logs` route'larının başarıyla kaydedildiği doğrulandı.
- Guard zinciri canlı olarak test edildi: token olmadan ve geçersiz token ile yapılan `GET`/`POST` istekleri `401` döndürdü.

### [14 Temmuz 2026] - Faz 5: Task Modülü Arama, Filtreleme ve Sayfalama (Pagination)
- **Task Modülü Arama ve Sayfalama (Pagination) tamamlandı.**
- `src/task/dto/get-tasks-filter.dto.ts`: `search` (string), `status`/`priority` (enum, `CreateTaskDto` ile aynı tip tanımları paylaşılıyor), `page`/`limit` (varsayılan sırasıyla `1`/`10`) opsiyonel alanları `class-validator` ile eklendi; `page`/`limit` için `class-transformer`'dan `@Type(() => Number)` kullanılarak query string değerlerinin sayıya çevrilmesi sağlandı.
- `main.ts`: Global `ValidationPipe`'a `transform: true` eklendi; bu sayede `@Type(() => Number)` dekoratörünün gerçekten devreye girip `@Query()` ile gelen DTO alanlarını sayıya çevirmesi garantilendi (önceden sadece `whitelist: true` vardı, transform olmadan tip dönüşümü validasyon aşamasında uygulanıp controller'a orijinal (string) değer geçiyordu).
- `TaskController.findAll`: `@Query() filterDto: GetTasksFilterDto` parametresi eklendi, servise iletildi.
- `TaskService.findAll(workspaceId, filterDto)`: Supabase sorgusu dinamik hâle getirildi — `select('*', { count: 'exact' })` ile başlayıp, `status`/`priority` varsa `.eq(...)`, `search` varsa `.ilike('title', '%...%')` (büyük/küçük harf duyarsız) filtreleri koşullu olarak eklendi; `page`/`limit`'ten hesaplanan `from`/`to` ile `.range(from, to)` uygulanarak sayfalama yapıldı. Yanıt artık `{ data, meta: { total, page, limit, totalPages } }` formatında dönüyor.
- `npm run build` ile derleme testi yapıldı; `isolatedModules` ayarı nedeniyle `TaskStatus`/`TaskPriority` tip importlarının `import type` ile yapılması gerektiği görüldü ve düzeltildi.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; loglardan `/workspaces/:workspaceId/tasks` `GET` route'unun hatasız kaydedildiği doğrulandı.
- Guard zinciri, `search`/`status`/`priority`/`page`/`limit` query parametreleriyle birlikte canlı olarak test edildi: token olmadan ve geçersiz token ile yapılan istekler `401` döndürdü (parametrelerin varlığı guard/pipe akışını bozmadı).

### [14 Temmuz 2026] - Faz 5: Redis Caching Entegrasyonu
- **Redis Caching Entegrasyonu tamamlandı.**
- `@nestjs/cache-manager`, `cache-manager` ve `cache-manager-redis-yet` paketleri backend'e kuruldu. Not: `cache-manager-redis-yet@5.1.5` sadece `cache-manager@5.x` ile uyumlu olduğundan (v6+ artık Keyv tabanlı çalışıyor), paketler `@nestjs/cache-manager@2.3.0` + `cache-manager@5.7.6` + `cache-manager-redis-yet@5.1.5` üçlüsüyle uyumlu sürümlere sabitlendi.
- `@nestjs/cache-manager@2.3.0`'ın peer bağımlılığı henüz NestJS 11'i resmi olarak listelemediğinden (`^9.0.0 || ^10.0.0`), kurulum ve Docker build'lerinde tutarlı davranış için `backend/.npmrc` dosyasına `legacy-peer-deps=true` eklendi; `Dockerfile`'daki `COPY package*.json ./` satırı `.npmrc`'yi de kopyalayacak şekilde güncellendi.
- `app.module.ts`: `CacheModule.registerAsync({ isGlobal: true, useFactory: ... })` eklendi; `useFactory` içinde `cache-manager-redis-yet`'ten `redisStore({ url: process.env.REDIS_URL || 'redis://redis:6379' })` ile Redis store yapılandırıldı (mevcut `docker-compose.yml`'daki `redis:6379` servisine bağlanıyor).
- `project.controller.ts`: Sık okunup nadiren değişen bir kaynak olması nedeniyle `GET /workspaces/:workspaceId/projects` (`findAll`) endpoint'i `@UseInterceptors(CacheInterceptor)` ve `@CacheTTL(60000)` (60 saniye) ile önbelleğe alındı.
- `npm run build` ile derleme testi hatasız tamamlandı.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; loglardan `CacheModule dependencies initialized` mesajının başarıyla geldiği ve Redis bağlantısında hata oluşmadığı doğrulandı.
- Guard zinciri canlı olarak test edildi: `CacheInterceptor` eklenmesine rağmen token olmadan ve geçersiz token ile yapılan `GET /workspaces/:workspaceId/projects` istekleri `401` döndürdü (guard'lar interceptor'dan önce çalıştığı için önbellekleme guard akışını bozmadı).

### [14 Temmuz 2026] - Faz 6: Deployment Hazırlığı ve Canlıya Alma
- **CORS Yapılandırması, Helmet ile HTTP Güvenlik Başlıkları ve Healthcheck Modülü tamamlandı.**
- `helmet` paketi backend'e kuruldu.
- `main.ts`: `app.use(helmet())` ile HTTP yanıt başlıkları (Content-Security-Policy, X-Content-Type-Options, X-Frame-Options vb.) güvene alındı; `app.enableCors({ origin: true, credentials: true })` ile ileride bağlanacak Flutter/web istemcilerinden gelecek isteklere (kimlik bilgileriyle birlikte) izin verildi.
- `nest g module/controller health` komutlarıyla Health modülü iskeleti oluşturuldu; `HealthController` içindeki `GET /health` endpoint'i bilinçli olarak herhangi bir guard'a bağlanmadı (public), sadece `{ status: 'ok', timestamp: new Date().toISOString() }` döndürüyor — bu endpoint ileride bir orkestrasyon/monitoring aracının (Docker healthcheck, uptime monitor vb.) servis canlılığını kontrol etmesi için kullanılabilir.
- `backend/.env.example` dosyası oluşturuldu; `PORT`, `SUPABASE_URL`, `SUPABASE_KEY`, `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT` değişkenleri değerleri boş bırakılarak referans amacıyla eklendi (gerçek secret'lar `.env`'de kalıyor, repoya girmiyor).
- `npm run build` ile derleme testi hatasız tamamlandı.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; loglardan `HealthController {/health}` ve `Mapped {/health, GET}` route'larının başarıyla kaydedildiği doğrulandı.
- Canlı olarak test edildi: `GET /health` tokensız `200` ile `{ status: 'ok', timestamp: ... }` döndürdü; yanıt başlıklarında Helmet'in eklediği `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` başlıkları doğrulandı; korumalı `GET /workspaces/:workspaceId/projects` endpoint'i token olmadan hâlâ `401` döndürerek mevcut guard zincirinin bozulmadığı teyit edildi.
- Yol haritasındaki fazlar yeniden numaralandırıldı: Deployment Hazırlığı Faz 6 olarak eklendiği için Frontend Hazırlığı Faz 7'ye, Frontend Entegrasyonu Faz 8'e, Test/Optimizasyon/Sunum Faz 9'a kaydırıldı.

### [16 Temmuz 2026] - Faz 5: Progress Report (İlerleme Raporu) Modülü
- **Progress Report Modülü tamamlandı.**
- `nest g module/controller/service progress-report` komutlarıyla ProgressReport modülü iskeleti oluşturuldu; `ProgressReportModule`, diğer modüllerle aynı desene uygun olarak `SupabaseModule`'ü import edecek şekilde güncellendi.
- `src/progress-report/dto/create-progress-report.dto.ts`: `report_type` (`'DAILY' | 'WEEKLY' | 'MONTHLY'` enum, `@IsIn`), `title` ve `content` (`@IsString`/`@IsNotEmpty`) zorunlu alanları eklendi.
- `src/progress-report/dto/get-reports-filter.dto.ts`: Task modülündeki `GetTasksFilterDto` ile aynı desende, opsiyonel `report_type` (enum), `user_id` (UUID) ve `page`/`limit` (varsayılan sırasıyla `1`/`10`, `@Type(() => Number)` ile dönüştürülen) sayfalama alanları eklendi.
- `ProgressReportService`: `create` (`workspace_id` ve `user_id` ile `progress_reports` tablosuna kayıt), `findAll` (Task modülündeki gibi `count: 'exact'` ile başlayıp `report_type`/`user_id` filtrelerini koşullu uygulayan, `created_at`'e göre en yeniden eskiye sıralı, `{ data, meta: { total, page, limit, totalPages } }` formatında dönen sayfalanmış sorgu), `findOne` (bulunamazsa `NotFoundException`), `remove` (şimdilik sadece `id` ile silme; "sadece oluşturan kişi veya Workspace Admin silebilir" iş kuralı için `userId` parametresi imzada tutuldu, ileride genişletilecek) metotları Supabase istemcisiyle uygulandı.
- `ProgressReportController`: `@Controller('workspaces/:workspaceId/progress-reports')`, `@ApiTags('Progress Reports')`, `@ApiBearerAuth()`, `@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)` ile korunan `POST /`, `GET /` (`@Query() filterDto` ile filtre/sayfalama), `GET /:id`, `DELETE /:id` endpoint'leri Swagger dekoratörleriyle belgelendi.
- `npm run build` ile derleme testi hatasız tamamlandı.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; loglardan `/workspaces/:workspaceId/progress-reports` altındaki tüm route'ların (`POST`, `GET`, `GET /:id`, `DELETE /:id`) başarıyla kaydedildiği doğrulandı.
- Guard zinciri canlı olarak test edildi: token olmadan yapılan `POST`/`GET`/`GET /:id`/`DELETE /:id` istekleri hepsi `401` döndürdü.

### [16 Temmuz 2026] - Faz 5: Notion Tarzı Notlar ve Kişisel Pano (Dashboard) Modülü
- **Notion Tarzı Notlar ve Kişisel Pano Modülü tamamlandı.**
- `nest g module/controller/service note` komutlarıyla Note modülü iskeleti oluşturuldu; `NoteModule`, diğer modüllerle aynı desende `SupabaseModule`'ü import edecek şekilde güncellendi.
- `src/note/dto/create-note.dto.ts`: `title` (`@IsNotEmpty`/`@IsString`, zorunlu) ve `content` (`@IsOptional`/`@IsObject`, JSONB olarak saklanacak zengin metin/blok yapısı) alanları eklendi; `update-note.dto.ts`, `PartialType(CreateNoteDto)` ile türetildi.
- `NoteService`: `create`/`findAll`/`findOne`/`update`/`remove` standart CRUD metotları, notların kişisel olması nedeniyle her sorguda `workspace_id` ile birlikte `user_id`'ye göre de filtrelenecek şekilde (kullanıcı sadece kendi notlarını görüp değiştirebiliyor) Supabase istemcisiyle uygulandı.
- **Killer Feature — `getUserDashboard(workspaceId, userId)`:** `Promise.all` ile eşzamanlı olarak (a) kullanıcının `updated_at DESC` sıralı en son 5 notu, (b) workspace'teki en fazla 5 proje ve (c) `status` değeri `TODO`/`IN_PROGRESS` olan en güncel 10 görev çekildi. `tasks` tablosunda bir `user_id` kolonu bulunmadığı (görevler `created_by`/`assigned_to` ile ilişkilendiriliyor) tespit edildiğinden, görev sorgusu talep edildiği şekilde kullanıcıya özel filtre yerine workspace bazlı çalışacak şekilde kurgulandı. Sonuç `{ recentNotes, activeProjects, currentTasks }` biçiminde tek bir nesne olarak dönüyor.
- `NoteController`: `@Controller('workspaces/:workspaceId/notes')`, `@ApiTags('Notes')`, `@ApiBearerAuth()`, `@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)` ile korunan endpoint'ler eklendi. `GET /dashboard/me` route'u, Express/Nest router'ın `dashboard` değerini `:id` parametresi olarak yakalamasını önlemek amacıyla bilinçli olarak `GET /:id`'den **önce** tanımlandı; kullanıcı kimliği mevcut `@GetUser()` dekoratörü (`request.user`, Supabase `auth.getUser` sonucu) üzerinden alındı. Standart CRUD endpoint'leri (`POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`) Swagger dekoratörleriyle belgelendi.
- `npm run build` ile derleme testi hatasız tamamlandı.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; loglardan `Mapped {/workspaces/:workspaceId/notes/dashboard/me, GET}` route'unun `Mapped {/workspaces/:workspaceId/notes/:id, GET}`'ten **önce** kaydedildiği (route çakışmasının önlendiği) doğrulandı.
- Guard zinciri canlı olarak test edildi: token olmadan yapılan `POST`/`GET`/`GET /dashboard/me`/`GET /:id`/`PATCH /:id`/`DELETE /:id` istekleri hepsi `401` döndürdü.

### [16 Temmuz 2026] - Faz 6: İleri Düzey Kurumsal Özellikler — Görev Geliştirmeleri
- Yol haritasına **Faz 6: İleri Düzey Kurumsal Özellikler** ana başlığı eklendi; alt maddeler: Görev Geliştirmeleri ve Kullanıcı Profili tamamlandı olarak işaretlendi; Gerçek Dosya Yükleme, İstatistiksel Dashboard, Soft Delete, Zaman Takibi ve Bildirim/WebSockets bekleyen maddeler olarak bırakıldı.
- `CreateTaskDto`: Opsiyonel `assignee_id` (UUID) ve `parent_task_id` (UUID) alanları eklendi; mevcut `due_date` (`IsDateString`) alanı korundu.
- `GetTasksFilterDto`: Opsiyonel `assignee_id` ve `parent_task_id` filtre alanları eklendi.
- `TaskService.findAll`: `assignee_id` ve `parent_task_id` varsa Supabase sorgusuna sırasıyla `.eq('assignee_id', ...)` ve `.eq('parent_task_id', ...)` koşulları dinamik olarak eklendi.
- Docker imajı yeniden build edilip konteynerler ayağa kaldırıldı; değişikliklerin canlıya yansıdığı doğrulandı.

### [16 Temmuz 2026] - Faz 6: Gerçek Dosya Yükleme (Supabase Storage)
- **Gerçek Dosya Yükleme (Supabase Storage Entegrasyonu) tamamlandı.**
- `multer` ve `@types/multer` paketleri kuruldu (`@nestjs/platform-express` zaten mevcuttu).
- `SupabaseService.uploadFile(file, path)` eklendi: `storage.from('uploads').upload(...)` ile dosyayı yükleyip `getPublicUrl` üzerinden public URL döndürüyor.
- Mevcut File modülü (görev dosya metadata CRUD'u) korundu; üzerine `POST .../files/upload` endpoint'i eklendi. `FileInterceptor('file', { storage: memoryStorage() })` ile buffer üzerinden yükleme yapılıyor; yanıt `{ url, file_name, file_type, path }` formatında.
- Not: `nest g module/controller/service file` yeniden çalıştırılmadı — File modülü Faz 4'ten beri mevcuttu; mevcut yapı genişletildi.

### [16 Temmuz 2026] - Faz 6: İstatistiksel Dashboard (PostgreSQL RPC)
- **İstatistiksel Dashboard tamamlandı.**
- `nest g module/controller/service dashboard` ile `DashboardModule` oluşturuldu; `SupabaseModule` import edildi.
- `DashboardService.getWorkspaceStats(workspaceId)`: Supabase `.rpc('get_workspace_statistics', { p_workspace_id: workspaceId })` çağrısıyla workspace istatistiklerini (tamamlanan/geciken görevler vb.) getiriyor.
- `DashboardController`: `GET /workspaces/:workspaceId/statistics` endpoint'i `@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)` ile korundu.
- Kişisel pano (`GET .../notes/dashboard/me`) Note modülünde bırakıldı; istatistiksel dashboard ayrı bir modül olarak konumlandırıldı.

### [16 Temmuz 2026] - Faz 6: Soft Delete (Çöp Kutusu / Arşiv Mantığı)
- **Soft Delete tamamlandı.**
- `TaskService.findAll`: sorgulara `.is('deleted_at', null)` eklendi; arşivlenmiş görevler listeden hariç tutuluyor.
- `TaskService.remove`: hard delete yerine `update({ deleted_at: new Date().toISOString() })` ile soft delete uygulandı.
- `ProjectService.findAll` ve `remove` aynı soft delete deseniyle güncellendi.

### [16 Temmuz 2026] - Faz 7: Web Frontend (Next.js) — Auth UI ve Tema
- Next.js App Router frontend kuruldu; `dev` script `3001` portuna alındı; Axios `api-client` + JWT Bearer interceptor eklendi.
- Shadcn/UI (New York / Slate), turuncu–siyah tema (`--primary: 24 100% 50%`, `--radius: 0.5rem`) ve `next-themes` ile aydınlık/karanlık mod altyapısı tamamlandı.
- Login/Register sayfaları Split Screen mimarisiyle tasarlandı (`(auth)/login`, `(auth)/register`); Shadcn Card/Input/Label/Button kullanıldı (UI-only).
