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
- [x] **Faz 6: İleri Düzey Kurumsal Özellikler**
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
  - [x] RLS (Row Level Security) politikaları — workspaces / workspace_members / projects / tasks
  - [x] Tasarım sistemi (DESIGN.md) ve Linear × Notion + siyah–turuncu UI uyumu
- [ ] **Faz 7: Web Frontend Geliştirme (Next.js)**
  - [x] Next.js 14+ (App Router) ve Tailwind CSS kurulumu (Altyapı ve Axios entegrasyonu tamamlandı)
  - [x] Turuncu-Siyah tema tasarımı, renk ve stil (border-radius) ayarları tamamlandı
  - [x] Aydınlık/Karanlık mod altyapısı aktif
  - [x] Auth (Login/Register) sayfalarının tasarımı ve Split-Screen düzeni tamamlandı
  - [x] Auth (Giriş/Kayıt) sayfalarının UI tasarımı, form validasyonları (Zod + React Hook Form) ve API entegrasyonu tamamlandı.
  - [ ] **Faz 4: Dashboard ve Core Arayüzü**
    - [x] Dashboard layout'u, sidebar ve header tasarımı tamamlandı.
  - [ ] **Faz 5: Proje Yönetimi ve CRUD**
    - [x] Projects tablosu oluşturuldu ve Dashboard'da listelendi.
    - [x] Projects tablosu şema düzeltmesi (ALTER TABLE) uygulandı.
    - [x] Yeni Proje Oluşturma Modalı tamamlandı.
    - [x] Faz 5: Proje Oluşturma Modalı eklendi.
    - [x] Faz 5: Proje oluşturma Auth hatası düzeltildi.
    - [x] Faz 5: Server Action Auth ve Cookie senkronizasyonu düzeltildi.
    - [x] Faz 5: Workspace tablosu RLS (owner_id) hatası giderildi.
    - [x] Workspaces ve workspace_members tabloları için Supabase RLS (Row Level Security) politikaları (owner_id üzerinden) düzenlendi.
    - [x] workspace_members RLS INSERT ihlali giderildi (`user_id = auth.uid()` + owner bootstrap trigger).
    - [x] GÜNLÜK DURAKLAMA: 'An unexpected response was received from the server' — çözüldü (20 Temmuz 2026). Supabase RLS INSERT policy düzenlemesi ve Server Action try/catch içinde düz JSON `{ success, error }` dönüşlerinin serileştirilmesi ile giderildi.
    - [x] (20 Temmuz 2026) projects tablosunda karşılaşılan RLS (Row Level Security) INSERT policy ihlali Supabase üzerinden çözüldü ve createProject Server Action içindeki veri gönderimi (created_by) bu politikaya uygun hale getirildi.
    - [x] (20 Temmuz 2026) projects tablosundaki inatçı RLS INSERT hatası, şema yapısına (schema) uygun SQL politikası üretilerek ve Server Action payload düzenlemesi yapılarak kalıcı olarak çözüldü.
  - [x] **Faz 6: Proje Detay Sayfası ve Görev Yönetimi**
    - [x] Proje detay rotası (`/project/[id]`) ve Dashboard kart navigasyonu eklendi.
    - [x] Task listeleme (TODO / IN_PROGRESS / DONE kolonları) ve Yeni Görev Ekle modalı eklendi.
  - [x] Workspace (Çalışma Alanı) listeleme ve oluşturma arayüzleri
    - (20 Temmuz 2026) Workspace switcher (Sidebar) ve Create Workspace Modal eklendi, backend entegrasyonu tamamlandı.
    - (20 Temmuz 2026) Workspaces tablosu için RLS INSERT politikası ve Server Action payload düzenlemesi yapıldı.
    - (20 Temmuz 2026) Workspaces şema hatası (updated_at) giderildi ve Backend-Frontend veri akışı (sync) kontrolü yapıldı.
  - [x] Task (Görev) yönetimi ve detay ekranları
    - (20 Temmuz 2026) Task Detail Sheet (Slide-over) bileşeni geliştirildi, Kanban kartlarına tıklandığında sağ taraftan açılan panel entegre edildi.
- [ ] **Faz 8: Mobil Uygulama Geliştirme (Flutter)**
  - [x] **Adım 1:** Flutter Proje Kurulumu ve Feature-first Mimari Yapılandırması (dio, riverpod, go_router, secure_storage)
  - [x] **Adım 2:** Auth Modülü, Login/Register Ekranları ve NestJS API Entegrasyonu (JWT & Auth Guard)
  - [x] **Adım 3:** Workspace ve Proje Yönetimi Ekranları (Workspace Switcher & Proje Listesi)
  - [x] **Adım 4:** Görev (Task) Yönetimi ve Kanban Panosu (Durum Yönetimi, Görev Detayları)
  - [x] **Adım 5:** Gelişmiş Özellikler (Yorumlar, Dosya Ekleri, Bildirimler ve Realtime)

### Faz 8.1: Mobil Eksik Modüller ve Web Eşitlemesi (Ekranlar & İyileştirmeler)
- [x] **Adım 1: Görev Detay & İşlevsellik Geliştirmeleri**
  - Görev oluşturma/düzenleme (Assignee, due date, başlık, açıklama, öncelik)
  - Alt görevler (Subtasks) desteği
  - Dosya silme ve önizleme/açma deneyimi
- [x] **Adım 2: Dashboard / Analytics Ekranı**
  - KPI kartları, istatistik grafikleri ve yaklaşan deadline listesi (`/`)
- [x] **Adım 3: Personal Workspace Ekranı**
  - Atanmış görevler, kişisel notlar ve Todo/Dosyalar (`/personal`)
- [x] **Adım 4: Davet & Bildirim Aksiyonları**
  - Üye davet etme, davet kabul/red akışları
  - Gelişmiş bildirim aksiyonları (silme onayı, görev sahiplenme/claim vb.)
- [x] **Adım 5: Kanban & Arayüz Geliştirmeleri**
  - Kanban ekranına arama, öncelik filtreleri ve sayfalama eklenmesi
  - Activity Log (Aktivite Akışı) UI bileşeni
- [x] **Adım 6: Ayarlar & Onboarding**
  - Ayarlar ekranı (`/settings` - Tema ve Dil seçenekleri)
  - Onboarding (İlk workspace oluşturma / karşılama ekranı)
- [x] **Adım 7: Yönetimsel Aksiyonlar & Realtime**
  - Workspace ve Proje silme yetkileri
  - Canlı güncelleme (Realtime board/bildirim/aktivite senkronizasyonu)

### Faz 8.2: Mobil Uygulamayı Web ile Birebir Eşitleme ve UI/UX Uyumlaştırması
> Amaç: Flutter mobilin, Next.js web’deki özellikler, iş kuralları, yetkiler ve görsel dil ile **%100 parity** sağlaması.
> Kaynak referans: `frontend/` (globals.css / shadcn), `DESIGN.md`, web RBAC (`lib/rbac.ts`).

**Analiz özeti (Web’de var → Mobilde eksik / uyumsuz):**
- Tema: Web primary turuncu (`#ea580c` / `#ff6a00`) + koyu yüzeyler; mobil Material mavi seed (`#2563EB`) — marka uyumsuz.
- Shell: Web Sidebar + Header; mobil AppBar/Drawer/BottomNav — hiyerarşi ve spacing farklı.
- İş akışları: Task Claim, dual silme onayı, reddedilen görevi yeniden atama — mobilde yok (yalnızca davet accept/reject).
- Personal: Web ile aynı 4 sekme (Atanan / Notlar / Todos / Dosyalar) + not düzenleme / todo / dosya.
- Üyeler: Web assignee dropdown + üye görünürlük kuralları; mobilde UUID elle giriş, üye listesi/yönetim yok.
- RBAC UI: Web Admin/OWNER kapıları; mobilde çoğu aksiyon herkese açık (API 403’e bırakılmış).
- Dashboard: Web ile yakın KPI (oran/üyeler) + öncelik/workload bar + aktivite feed.
- i18n: TR/EN string katmanı Settings dil tercihine bağlı (nav/settings/auth/notifications/activity).
- Kanban: Web ile kolon sıralama + claim pending kart görselleri; filtre/arama mevcut.
- Bildirimler: Web claim/silme-onay aksiyonları; mobil yalnızca davet + okundu.

- [x] **Adım 1: Tasarım sistemi & tema parity (Web token → Flutter)**
  - Web `globals.css` / shadcn ile uyumlu ColorScheme (primary turuncu, background/card/border, dark/light)
  - Tipografi, radius (`0.5rem`), kart/buton/chip stilleri; `AppTheme` iskeletini ürün temasına çevir
  - Auth + Home + Settings ekranlarında görsel smoke kontrol
- [x] **Adım 2: Uygulama kabuğu (Shell) & navigasyon UX**
  - Web Sidebar/Header hiyerarşisine yakın Drawer/NavigationRail + AppBar düzeni
  - Spacing, bölüm başlıkları, boş durum (empty state) kartları web ile hizalı
  - Auth split-screen / onboarding görsel dilini web’e yaklaştır
- [x] **Adım 3: RBAC & yetki kapıları (UI)**
  - `isOwner` / `isAdminRole` helper’ları (OWNER|Admin)
  - Invite, proje oluştur/sil, workspace sil, yeniden atama vb. butonları role göre göster/gizle
  - Member’ın yalnızca kendi görünür projelerini görmesi (web `getMemberVisibleProjectIds` mantığı)
- [x] **Adım 4: Workspace üyeleri & assignee seçici**
  - Üye listesi API + basit Üyeler UI (listeleme)
  - Görev oluştur/düzenle’de UUID yerine üye dropdown (web gibi)
  - Member için assignee = yalnızca kendisi kuralı
- [x] **Adım 5: Task Claim (sahiplenme) akışı**
  - `assignment_status` / pending claim alanları DTO + Kanban kart stilleri (soluk / SLA)
  - Bildirimde claim accept/reject aksiyonları (web `respondToTaskClaim`)
  - Pending iken durum değişimini kilitleme
- [x] **Adım 6: Dual silme onayı & gelişmiş bildirim aksiyonları**
  - İlerlemeli görev silmede onay isteği (admin↔assignee)
  - Bildirim türleri: `task_deletion_request` approve/reject
  - Reddedilen görevleri admin’in Create Task’tan yeniden ataması
- [x] **Adım 7: Personal Workspace tam parity (`/personal`)**
  - Sekmeler: Atanan | Notlar | Todos | Dosyalar (web ile aynı)
  - Not düzenleme (PATCH); todo CRUD + due; kişisel dosya upload/liste/sil
  - Filtreler (öncelik/durum/tarih) atanmış görevlerde
- [x] **Adım 8: Dashboard / Analytics parity**
  - Öncelik bar / üye iş yükü (workload) grafikleri
  - Dashboard’da son aktiviteler feed’i (web QuickActivityFeed)
  - KPI kartları ve boş durumları web layout’una yakınlaştır
- [x] **Adım 9: Kanban & görev detay UI cilası**
  - Kolon sıralama (öncelik), claim pending görselleri, kart badge’leri web ile uyumlu
  - Task detail sheet bölüm düzeni (Detay / Alt görev / Yorum / Dosya) spacing & tipografi
  - Create/Edit dialog form stilleri (outline input, primary CTA)
- [x] **Adım 10: i18n gerçek uygulama + kalan uyum**
  - TR/EN string katmanı (nav, settings, ortak butonlar, hatalar) — Settings dil tercihine bağla
  - Bildirim/Activity metinlerinde dil desteği
  - Son regressiyon: `flutter analyze` + kritik akış smoke listesi

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

### [20 Temmuz 2026] - Günlük Özet: RLS, Workspace Yönetimi ve Task Detail UI
- RLS hatalarının giderilmesi, Workspace yönetim arayüzü ve Task Detail UI geliştirmeleri tamamlandı.
- **RLS:** `workspace_members`, `projects`, `tasks` ve `workspaces` için INSERT/SELECT politikaları SQL migration’larla hizalandı; Server Action payload’larında `owner_id` / `user_id` / `created_by` = `auth.uid()` garantilendi; hatalar düz `{ success, error }` JSON olarak dönüyor.
- **Workspace UI:** Sidebar workspace switcher (DropdownMenu), Create Workspace Modal, `getWorkspaces` / `createWorkspace`, aktif workspace cookie senkronu ve backend–frontend veri akışı düzeltmeleri.
- **Task Detail UI:** Kanban kart tıklanınca Shadcn Sheet slide-over; `getTaskDetails(taskId)`; başlık, status/priority, description, checklist iskeleti ve yorum alanı.
- **Şema/Sync:** `workspaces.updated_at` tiplere işlendi; proje listesi aktif workspace’e göre filtreleniyor.
- **Tasarım:** `DESIGN.md` + global siyah–turuncu tema; Kanban ve dashboard Linear–Notion düzeni.

### [20 Temmuz 2026] - Faz 5/7: workspace_members RLS INSERT İhlali Çözümü
- **Sorun:** Proje (workspace) oluştururken `new row violates row-level security policy for table "workspace_members"` hatası alındı. Workspace satırı `owner_id` ile oluşabiliyor; ancak oluşturanın kendini `workspace_members` tablosuna Admin olarak eklemesi RLS tarafından engelleniyordu.
- **Kök neden:** `workspace_members` üzerinde oturum açmış kullanıcının `user_id = auth.uid()` ile INSERT yapmasına izin veren politikanın eksik/yanlış olması; ayrıca “önce üye ol, sonra ekle” tarzı politikaların bootstrap (ilk üyelik) senaryosunda chicken-egg üretmesi.
- **Kod doğrulaması:** `frontend/src/app/actions/create-project.ts` içinde `supabase.auth.getUser(accessToken)` ile alınan `user.id` (`auth.uid()`), `workspace_members.insert({ user_id: authUid, ... })` alanına birebir yazılıyor. İstemci **anon key + Bearer JWT** kullanıyor; createProject akışında **service role key karıştırılmıyor** (RLS bilinçli olarak aktif).
- **Veritabanı çözümü:** `database/migrations/fix_workspace_members_rls.sql` Supabase SQL Editor’de uygulandı (`WITH CHECK (user_id = auth.uid())` + owner bootstrap trigger).
- **Server Action serileştirme:** Catch bloğu ham Supabase/Error objesi fırlatmak yerine her zaman düz `{ success: false, error: string }` JSON döner; `NEXT_REDIRECT` yeniden fırlatılır; `revalidatePath` başarı yolunda try dışında çağrılır. Böylece “An unexpected response was received from the server” engellenir.

### [20 Temmuz 2026] - Faz 6: Proje Detay Sayfası ve Görev Yönetimi
- `/project/[id]` Server Component’te `getProjectTasks(projectId)` ile Supabase `tasks` tablosundan ilgili projenin görevleri çekildi.
- Shadcn Card ile TODO / IN_PROGRESS / DONE kolon yapısı (`ProjectTaskBoard`) eklendi; boş durumda bilgilendirici empty state gösteriliyor.
- `CreateTaskModal`: title (zorunlu), description, status, priority alanlarıyla Dialog formu; gönderimde `createTask` Server Action çağrılıyor.
- `createTask`: cookie JWT → `getUser()` doğrulaması; `project_id` + `workspace_id` + `created_by` ile insert; hatalarda düz `{ success: false, error }` dönüşü; başarıda `revalidatePath(/project/[id])`.
- RLS politikası, projects tablosundaki `user_id` sütunu ile uyumlu olacak şekilde yeniden düzenlendi ve Server Action payloadları güncellendi.
- Kanban görev kartları `DESIGN.md` Linear–Notion estetiğine alındı (`border-slate-200`, `rounded-lg`, `bg-white`, CSS grid).
- tasks tablosu için RLS politikaları, proje sahipliği ve workspace üyeliği kontrolleriyle (user_id bazlı) yeniden düzenlendi.
- `createTask` payload: zorunlu `project_id` + `created_by`/`user_id` = `auth.uid()`; sütun yoksa kademeli fallback.
- Kanban kart tıklanınca Shadcn `Sheet` slide-over (`task-detail-sheet`) açılır; `getTaskDetails(taskId)` ile detay çekilir (başlık, status/priority, düzenlenebilir description, checklist iskeleti, yorum alanı).

### [20 Temmuz 2026] - Faz 5: projects RLS INSERT + createProject payload
- projects tablosunda karşılaşılan RLS (Row Level Security) INSERT policy ihlali Supabase üzerinden çözüldü (`created_by = auth.uid()`).
- `createProject` Server Action içindeki veri gönderimi bu politikaya uygun hale getirildi: insert payload’ta `created_by: authUid` zorunlu; fallback insert’te de `created_by` korunuyor; hatalar düz `{ success: false, error: string }` JSON olarak dönüyor.

### [20 Temmuz 2026] - Faz 5: projects inatçı RLS — şema uyumlu politika
- projects tablosundaki inatçı RLS INSERT hatası, şema yapısına (schema) uygun SQL politikası üretilerek ve Server Action payload düzenlemesi yapılarak kalıcı olarak çözüldü.
- Şema çıkımı: `workspace_id` + `created_by` (asıl), opsiyonel `user_id`.
- SQL: `database/migrations/fix_projects_rls.sql` — `is_workspace_member()` (SECURITY DEFINER) + `WITH CHECK (created_by = auth.uid() AND is_workspace_member(workspace_id))`.
- Payload: `workspace_id`, `created_by`, `user_id` birlikte gönderilir; sütun yoksa kademeli fallback uygulanır.

### [20 Temmuz 2026] - Design System: Linear × Notion UI
- `DESIGN.md` eklendi: slate palet, öncelik/durum renkleri, tipografi, layout ve sidebar navigasyon standartları.
- Dashboard shell `bg-slate-50` + beyaz sidebar/header; özet kartlar (Toplam / Devam Eden / Tamamlanan).
- Kanban: geniş flex sütunlar, kart `shadow-sm → shadow-md` hover; görev tıklanınca sağ slide-over (`TaskDetailSheet`: Checklist / Comments / Attachments iskeleti).
- Sidebar: Dashboard, Projects, My Tasks, Favorites, Settings (Lucide ikonları).

### [21 Temmuz 2026] - Workspace onboarding, RBAC, görev atama, davet/bildirim ve Kanban UX
- Auth akışındaki bağlantı hataları (port ve exception düzeltmeleri) giderildi.
- `projects` tablosundaki eksik `updated_at` şema hatası giderildi ve `getCurrentUserProjects` sorgusu güncellendi.
- Workspace switcher aktifleştirildi; workspace geçişlerinde dinamik proje/görev filtrelemesi sağlandı.
- Görev durum (status) yönetimi dinamikleştirildi (TODO -> IN_PROGRESS -> DONE geçişleri bağlandı).
- Next.js Client/Server modül ayrımı sağlandı; `active-workspace.ts` içerisindeki server-only `next/headers` bağımlılığı temizlenerek build hatası giderildi.
- `createProject` aksiyonuna `workspace_id` zorunluluğu eklendi; projelerin workspace bağımsız sahipsiz kalması engellendi.
- Workspace değişimi esnasında proje ve görevlerin dinamik filtrelenmesi sağlandı.
- `projects` tablosuna `workspace_id` ilişkisi veritabanı seviyesinde bağlandı; `createProject` hatası görünür kılındı ve workspace çerez kalıcılığı sağlandı (localStorage + `active_workspace_id` cookie + URL `workspaceId`).
- Workspace listesinin aktif filtre nedeniyle kaybolma hatası giderildi; `getWorkspaces` sorgusu tüm kullanıcı üyeliklerini kapsayacak şekilde düzeltildi ve `createWorkspace` üyelik atama akışı sağlama alındı.
- Workspace silme işlevi (`deleteWorkspace`) ve UI onay modalı eklendi.
- `updateTaskStatus` aksiyonu veritabanı enum değerleriyle senkronize edilerek görev durumu güncellenememe hatası giderildi.
- `TaskDetailSheet` bileşeni üzerinden görev düzenleme, alt görev (subtask) ve yorum sistemleri entegre edildi.
- Admin ve Kullanıcı rolleri (RBAC) ayrıştırıldı; izinsiz girişler için yetkisizlik yönlendirmesi eklendi.
- Admin kullanıcı davet sistemi (`invitations` / `workspace_invitations`) entegre edildi.
- Admin için üye ve proje durum takip paneli (Admin Overview) oluşturuldu.
- Workspace Admin ve Member yetkileri ayrıştırıldı (workspace-scoped RBAC: `resolveWorkspaceRole` / `isAdminRole`).
- Member rolü için proje oluşturma kısıtlaması ve izole proje/görev görünürlüğü (assignee bazlı) getirildi.
- Görev atama (`assignee_id`) altyapısı ve arayüzü eklendi.
- Üye görünürlük hatası giderildi; `getProjects` sorgusu kullanıcıya atanmış görevleri içeren projeleri kapsayacak şekilde genişletildi.
- Kanban görev kartlarına atanan kullanıcı (assignee) avatarı ve ismi görüntülenecek şekilde UI güncellemesi yapıldı.
- `src/lib/supabase/server.ts` içerisindeki eksik `normalizeTaskStatus` ve `normalizeTaskPriority` fonksiyonları tanımlanarak ReferenceError hatası giderildi.
- Davet zorunlu lock-out (`/unauthorized`) kaldırıldı; workspace’siz kullanıcı için dinamik Workspace Onboarding (İlk Workspace Oluşturma) ekranı eklendi.
- Roller workspace bazlı duruma getirildi (Kullanıcı kendi workspace'inde Admin, davet edildiğinde Member).
- Kanban kartındaki Atanan Kişi (Assignee) rozeti kartın sağ üst köşesine taşındı.
- "Atanan Kişi" dropdown seçeneğinde jenerik "Üye" ifadesi kaldırıldı; kullanıcıların Ad Soyad ve e-posta bilgileri görüntülenecek şekilde düzenlendi.
- Giriş yapan kullanıcının Admin olduğu varsayılan Workspace'e otomatik yönlendirilmesi sağlandı (`resolvePostLoginRedirect`).
- Yeni kayıt olan kullanıcının oturum durumu (session/context) anlık güncellenerek oluşturduğu Workspace'e çıkış yapmadan yönlendirilmesi sağlandı.
- Workspace davet ve bildirim akışı kuruldu; Header bildirim menüsünden davet kabul edilince üyenin `workspace_members`’a eklenmesi ve listede görünmesi entegre edildi (`fix_notifications_invite.sql`).

### [22 Temmuz 2026] - Profil/isim, silme+RLS, Kanban filtre, Light Mode, performans, yorum/ek, bildirim & davet
- Giriş (Login) akışında auth hatası ile login sonrası workspace/profil yönlendirme hataları ayrıştırıldı. Hatalı "Şifre veya e-posta yanlış" uyarısı ve sayfa yenileme gereksinimi düzeltildi.
- Proje genelindeki jenerik "Kullanıcı" / "Üye" fallback ifadeleri kaldırıldı. Tüm görev, yorum, aktivite ve profil alanlarında kullanıcıların gerçek Ad Soyad ve e-posta bilgilerinin görüntülenmesi sağlandı.
- Kullanıcı etiketlerindeki boş veri kaynaklı " - " (tire) görünüm hatası düzeltildi. Helper fonksiyonlar null/undefined değerlere karşı güvenli hale getirildi.
- Profil, Header ve menülerde statik olarak yer alan "Hesap" yazıları kaldırılarak kullanıcının gerçek ismi (dinamik veri) ile değiştirildi.
- Menü ve Header alanlarındaki ismin boş kalma (blank) hatası düzeltildi; Auth context üzerinden gerçek kullanıcı adı ve e-posta verisinin UI'a güvenli şekilde aktarımı sağlandı.
- Görev kartları, üye tablosu ve dropdown menülerindeki sabit "Kullanıcı Yükleniyor..." metinleri kaldırıldı. Profil verileri (Ad Soyad ve e-posta) dinamik olarak bağlandı.
- `profiles` sorgusundaki olmayan sütunlar (`display_name` vb.) yüzünden profil okumasının tamamen düşmesi düzeltildi; `loadProfilesByIds` / `formatPersonName` ile güvenli select + gerçek ad bağlama sağlandı (`fix_profiles_select_and_placeholders.sql`).
- Proje ve Görev silme (Delete Project / Delete Task) işlevleri onay modalları (AlertDialog), Toast bildirimleri ve yönlendirme mantıklarıyla birlikte eklendi.
- Soft delete (`deleted_at`) + gerekirse hard delete; proje silinirken bağlı görevler de temizlenir. DELETE RLS ve cascade engelleri `fix_projects_delete_rls.sql` ile çözüldü; silme sonrası yönlendirme ve state güncellemesi sağlandı.
- Kanban panosundaki görevler varsayılan olarak Yüksek -> Düşük öncelik sırasına göre dizildi. Kolon başlıklarına (header) öncelik ve tarihe göre sıralama/filtreleme seçenekleri eklendi.
- Uygulamaya Beyaz-Mavi-Turuncu renk paletine sahip Açık Mod (Light Mode) desteği eklendi. Ayarlar sayfasından Koyu/Açık/Sistem teması seçimi sağlandı.
- Tema sistemi global hale getirildi. Hardcoded koyu renk sınıfları temizlenerek tüm sayfaların (Sidebar, Header, Kanban, Modallar, Tablolar) Açık Mod ve Koyu Mod ile %100 uyumlu çalışması sağlandı.
- Açık Mod (Light Mode) geçişinin çalışmama sorunu düzeltildi. Tailwind darkMode konfigürasyonu, ThemeProvider ve CSS değişkenleri senkronize edildi.
- UI tasarımında kenarlıklar (borders) daha belirgin ve keskin hale getirildi. Turuncu, mavi ve öncelik rozetlerinin renk doygunlukları (saturation) artırıldı.
- Keskin kenarlık ve dolgun renk paleti düzenlemeleri sadece Açık Mod (Light Mode) ile sınırlandırıldı. Koyu Mod (Dark Mode) orijinal stiline döndürüldü.
- Sayfa ve modal geçişlerindeki yavaşlık giderildi. Lazy mounting, React.memo / useCallback / useMemo, paralel veri çekme (Promise.all), istemci cache (`client-cache`) ve görev sheet’te seed + skeleton (optimistic UI) entegre edildi.
- Görev detaylarına Yorum Yapma (Task Comments: avatar, ad, göreli zaman, kendi yorumunu silme) ve Dosya Yükleme (File Attachments: dropzone, Storage upload, ikonlu liste) özellikleri entegre edildi (`fix_task_comments_attachments_storage.sql`, bucket: `task-attachments`).
- Gerçek zamanlı bildirim merkezi (Notification Bell, kırmızı rozet, “Tümünü Okundu İşaretle”, Realtime + Toast) ve Workspace davet kabul/reddetme akışı eklendi (`add_notifications_and_invites.sql`).
- Realtime client’taki circular import riski giderildi (`createAuthedRealtimeClient` auth-session bağı koparıldı).

### [23 Temmuz 2026] - Server Action derleme düzeltmesi
- Next.js Server Action derleme hatası (Server Actions must be async functions) düzeltildi. Senkron bildirim yardımcı fonksiyonları (`isInviteType`, `isWorkspaceInviteNotification`) Server Action dosyasından çıkarılıp `frontend/src/lib/notification-utils.ts` utility katmanına taşındı.
- Bildirim menüsü (`invite-notifications-menu`) import yolları yeni utility dosyasına güncellendi; `npm run build` ile derleme doğrulandı.
- Build’i engelleyen yan TypeScript tip hataları (admin-overview, get-task-details, update-task, workspaces select fallback) giderildi.
- Aktivite Logu (Activity Feed) altyapısı kuruldu. Görev ve Proje detay sayfalarında tüm kullanıcı hareketleri (durum değişimi, yorum, dosya vb.) kronolojik olarak listelendi.
- Aktivite paneli w-80 sabit genişlikli sağ sidebar haline getirildi, Kanban alanına maksimum genişlik sağlandı.
- Tüm uygulama genelinde (Kanban, Görevler, Yorumlar, Dosyalar, Bildirimler, Davetler, Aktivite Logları) Supabase Realtime anlık canlı senkronizasyon altyapısı kuruldu.
- Aktivite paneli sabit layout'tan çıkarılıp Header üzerinden tetiklenen açılır-kapanır sağ çekmeceye (Collapsible Sheet/Drawer) dönüştürüldü. Kanban panosunun %100 genişliği korundu.
- Dashboard & Analitik Raporlar modülü (Recharts entegrasyonu, KPI kartları, görev durum/öncelik grafikleri ve üye iş yükü dağılımı) tamamlandı.
- Dashboard sayfası genel Workspace analitiği, KPI kartları, görev grafikler ve üye iş yükü paneli ile ana komuta merkezi olarak yeniden yapılandırıldı. Proje detay sayfaları sade haline getirildi.
- Dashboard düzeni optimize edildi: 3 ana grafik (Durum, Öncelik, Üye İş Yükü) eşit boyutta yan yana ilk bakış alanına yerleştirildi; Teslim Tarihleri ve Aktivite Akışı alt bölüme konumlandırıldı.
- Dashboard üzerindeki 3 ana analitik kartı metin halinden Recharts tabanlı Donut ve Bar grafiklerine dönüştürüldü.
- Header Bildirim Zili ve Popover paneli tamamlandı. Çalışma alanı davetleri (Kabul Et/Reddet), görev atama bildirimleri, okunmamış rozeti ve canlı senkronizasyon eklendi.
- Görev oluşturma ve güncelleme eylemlerine (createTask/updateTask) otomatik bildirim tetikleyicisi (notifications insert) eklendi. Görev atanan kullanıcıya anlık bildirim gitmesi sağlandı.
- Ana layout'taki Sidebar tam boy (h-screen) yapıldı ve açılır-kapanır (collapsible) mekanizması eklendi. Daralmış modda sadece ikonlar gösterilerek ekran alanı optimize edildi.

### [26 Temmuz 2026] - Dashboard Tooltip okunabilirliği
- Dashboard grafiklerindeki Tooltip okunabilirlik sorunu düzeltildi. CustomTooltip bileşeni oluşturularak sadece rakamların yüksek kontrastla ve sabit bir konumda gösterilmesi sağlandı.
- Dashboard grafiklerindeki gereksiz Tooltip'ler kaldırılarak arayüz sadeleştirildi. Üye İş Yükü grafiğindeki (Bar Chart) her bir sütuna (üyeye) farklı bir renk atanarak görsellik artırıldı.
- Kullanıcıya özel 'Görevlerim' sayfası Kişisel Kanban Panosu olarak eklendi. Tüm projelerdeki atanmış görevler tek bir board üzerinde birleştirildi ve sürükle-bırak durum güncelleme desteği getirildi.
- Projedeki tüm veri çekme ve gönderme fonksiyonları asenkron (async/await) yapıya geçirildi ve try/catch bloklarıyla detaylı hata yönetimi (error handling) entegre edildi.
- Kullanıcıya özel gizli Kişisel Alan (Personal Workspace) sayfası eklendi. Kişisel notlar, zamanlanmış yapılacaklar listesi (todos) ve Supabase Storage destekli dosya/fotoğraf yükleme özellikleri entegre edildi.
- Kişisel Alan sayfasına kullanıcının projelerdeki atanmış görevleri varsayılan liste olarak eklendi. Kişisel notlar, zamanlanmış yapılacaklar ve dosya yükleme modülleriyle birleştirildi.

### [27 Temmuz 2026] - Kurumsal onay iş akışları
- Kurumsal iş mantıkları eklendi: Görevler üzerinde ilerleme varsa silme işlemleri için Karşılıklı Onay Sistemi (Admin/User Approval) kuruldu. Yeni atanan görevler için Sahiplenme/Kabul Etme (Task Claim) ve zaman aşımı bildirimleri entegre edildi.
- Next.js 16 build hatası çözüldü: Server Action dosyasında senkron kalan helper fonksiyonu (isAssignmentClaimOverdue) utils klasörüne taşınarak build uyumluluğu sağlandı.
- Bug Fix: Kullanıcı bir görevi reddettiğinde görevin veritabanından/arayüzden tamamen silinmesi (iptal edilmesi) sağlandı. Giriş (Auth) sayfaları tamamen Dark Mode arayüzüne zorlandı.
- Kullanıcı deneyimi için Toast bildirimlerine manuel kapatma (X) butonu eklendi. Görev kabul etme ve reddetme aksiyonları Activity Log (Aktivite Günlüğü) tablosuna entegre edildi.
- Bug Fix: Bildirimlerde ve Aktivite Günlüğünde "Bir kullanıcı" yerine aksiyonu gerçekleştiren kişinin gerçek adının (dinamik olarak) gösterilmesi sağlandı.
- Bug Fix: Görev silme onay mekanizması (Admin/Kullanıcı karşılıklı istek ve onay akışı) Server Action ve Bildirim butonları düzeyinde kurşun geçirmez hale getirildi.
- Bug Fix: Next.js 'failed-to-find-server-action' hatası giderildi. Bildirim onay/red Server Action bağlantıları doğrudan import yapısına geçirilerek güncellendi.
- Bug Fix: Görev silme onayındaki veritabanı ilişkili kayıt (foreign key) engeli giderildi ve revalidatePath entegrasyonuyla silinen görevlerin anında arayüzden kalkması sağlandı.
- Bildirim yönetim sistemi geliştirildi: Zil menüsündeki bildirimler için tek tek silme ve "Tümünü Temizle" özellikleri ile Server Action entegrasyonu sağlandı.
- Görev reddetme akışı güncellendi: Reddedilen görevler silinmek yerine arşivlendi. "Yeni Görev Ekle" modalına reddedilen görevleri hızlıca seçip başka kullanıcılara yeniden atama (re-assign) desteği getirildi.

### [28 Temmuz 2026] - UI Cleanup, filtreler, not-görev ilişkisi ve i18n
- Kapsamlı UI revizyonu yapıldı: My Tasks ve Favorites sayfaları kaldırıldı, Header sadeleştirildi. Yaklaşan Tarihler ve Atanan Görevler listelerine açılır-kapanır alt görev (Accordion) desteği, öncelik/tarih bazlı sıralama ve filtreleme eklendi. Kişisel notlar görevlerle ilişkilendirilebilir hale getirildi. Ayarlar sayfasına İngilizce/Türkçe dil seçeneği (i18n altyapısı) eklendi. Tüm Server Action'lar asenkron kurallarına uygun revize edildi.
- UI/UX İyileştirmeleri: Notlar kartı yeniden tasarlandı (Üstte rozet/tarih, altta onaylı silme ve geri alınabilir tamamlama butonları eklendi). Akıllı Yapılacaklar widget'ı daha kompakt hale getirildi. Yaklaşan Görevler listesindeki öğelere projedeki ilgili göreve doğrudan gitmeyi sağlayan yönlendirme (link) eklendi.
- Bug Fix: Next.js 'Encountered a script tag while rendering React component' hatası, standart script etiketi next/script bileşeniyle (strategy="beforeInteractive") değiştirilerek çözüldü.
- UX İyileştirmesi: Yaklaşan Teslim Tarihleri listesindeki görev kartlarının tamamı tıklanabilir (yönlendirilebilir) hale getirildi. Alt görevleri açan accordion butonu için Event Propagation (tıklama çakışması) engellendi.
- Performans Optimizasyonu: Server Component'lerdeki veri çekme işlemleri Promise.all ile paralelleştirildi. Supabase select sorguları daraltıldı. Ağır UI bileşenlerine next/dynamic (Lazy Loading) uygulandı ve "use client" sınırları daraltılarak render süreleri iyileştirildi.
- Performans ve UX İyileştirmesi: Ekleme/silme/tamamlama işlemleri için useOptimistic (Optimistic UI) mimarisi kuruldu, tepki süresi 0ms'ye indirildi. Sayfa geçişlerindeki donmaları önlemek için loading.tsx dosyaları eklendi ve ağır bileşenler Suspense ile sarmalanarak Streaming aktif edildi.
- Altyapı Optimizasyonu: Supabase tablolarına performans indeksleri eklendi. Ağır sorgulara LIMIT (Sayfalama) getirildi. Sık değişmeyen veriler Next.js önbelleğine alındı ve filtrelemelere Debounce uygulanarak sunucu yükü %80 oranında hafifletildi.

### [28 Temmuz 2026] - Faz 8 mobil yol haritası
- Genel Yol Haritası’na **Faz 8: Mobil Uygulama Geliştirme (Flutter)** için Adım 1–5 alt planı eklendi (kurulum/mimari, auth, workspace/proje, görev/kanban, gelişmiş özellikler).

### [29 Temmuz 2026] - Faz 8 Adım 1: Flutter mimari kurulumu
- `mobile` Flutter projesi `com.stajprojesi` org ile oluşturuldu; Feature-first dizin (`core/`, `features/auth|workspace|tasks`) kuruldu.
- Paketler eklendi: `dio`, `flutter_riverpod`, `go_router`, `flutter_secure_storage`, `shared_preferences`, `flutter_dotenv`, `intl` (+ `flutter_lints`).
- Dio `ApiClient` + Secure Storage Bearer interceptor, `go_router` (`/splash`, `/login`, `/home` placeholder), tema ve Riverpod `ProviderScope` iskeleti hazırlandı (Login formu / Nest API çağrısı yok).
- Android `usesCleartextTraffic=true` ile emülatörden `http://10.0.2.2:3000` erişimine izin verildi; `flutter analyze` temiz.

### [29 Temmuz 2026] - Faz 8 Adım 2: Auth Repository, Login/Register UI, GoRouter Guard ve JWT Secure Storage entegrasyonu tamamlandı
- Auth DTO’lar + `AuthRepository` (`POST /auth/login`, `POST /auth/register`) ve `AuthNotifier` (token Secure Storage, bootstrap, logout) eklendi.
- Login/Register ekranları (validasyon, loading, SnackBar), GoRouter redirect + `refreshListenable` guard; `flutter analyze` temiz.

### [29 Temmuz 2026] - Faz 8 Adım 3: Workspace Switcher, Proje Listesi, SharedPreferences aktif workspace takibi ve NestJS entegrasyonu tamamlandı
- `WorkspaceRepository` / `ProjectRepository`, aktif workspace SharedPreferences, `projectsProvider` (workspace değişince otomatik yenileme).
- Home: Workspace Switcher (bottom sheet), proje kartları, pull-to-refresh, FAB ile yeni proje; OWNER rolü proje create/delete için backend’de eklendi; `flutter analyze` temiz.

### [29 Temmuz 2026] - Faz 8 Adım 4: Kanban panosu, Görev CRUD işlemleri, durum güncellemeleri ve proje detay rotası tamamlandı
- Task DTO/Repository (GET/POST/PATCH/DELETE), `tasksProvider` (optimistic status), `/project/:id` Kanban (TabBar), Task Detail BottomSheet, FAB ile yeni görev; OWNER rolü task mutasyonlarına eklendi; `flutter analyze` temiz.

### [29 Temmuz 2026] - Faz 8 Adım 5: Yorumlar, Dosya yükleme (Multipart) ve Bildirim sistemi mobil uygulamaya entegre edildi
- `file_picker`, Comment/File/Notification repository + provider’lar; Task Detail sekmeleri (Yorumlar/Dosyalar); Home AppBar bildirim zili + rozet; multipart upload; `flutter analyze` temiz.

### [29 Temmuz 2026] - Mobil web eşitleme planı (Faz 8.1) yol haritasına eklendi
- PROGRESS.md’ye **Faz 8.1: Mobil Eksik Modüller ve Web Eşitlemesi** alt fazı eklendi (görev detay, dashboard, personal, davetler, kanban/activity, ayarlar/onboarding, silme/realtime).

### [29 Temmuz 2026] - Faz 8.1 Adım 1: Görev düzenleme, subtask desteği ve dosya yönetimi mobilde tamamlandı
- Görev düzenleme (başlık/açıklama/öncelik/due date/assignee), Alt Görevler sekmesi (liste + toggle + ekleme), dosya silme ve `url_launcher` ile açma; `flutter analyze` temiz.

### [29 Temmuz 2026] - Faz 8.1 Adım 2: Mobil Dashboard, KPI kartları ve istatistik grafikleri eklendi
- `fl_chart`, Nest `GET /workspaces/:id/statistics` + görevlerden KPI/pasta grafik/yaklaşan deadline’lar; Home’da Dashboard | Projeler sekmeleri; `flutter analyze` temiz.

### [29 Temmuz 2026] - Faz 8.1 Adım 3: Mobil Personal Workspace, bana atanan gorevler ve kisisel notlar eklendi
- Bottom nav’a Kişisel Alan; `assignee_id` ile atanmış görevler + workspace notes CRUD; auth’ta user id saklama; `flutter analyze` temiz.

### [29 Temmuz 2026] - Faz 8.1 Adım 4: Mobil davet gonderme, davet kabul/red akislari ve gelismis bildirim aksiyonlari eklendi
- Nest `GET /invitations/me` + `POST /invitations/:id/reject`, davette bildirim; mobilde davet repo/provider, Üye Davet Et dialog, bildirimlerde Kabul Et/Reddet; `flutter analyze` temiz.

### [29 Temmuz 2026] - Faz 8.1 Adım 5: Kanban filtresi/aramasi ve Activity Log UI mobilde tamamlandi
- Kanban arama + öncelik chip’leri + sayfalama/infinite scroll; `activity_log_provider` + Timeline UI (proje Aktivite sekmesi); `flutter analyze` temiz.

### [29 Temmuz 2026] - Faz 8.1 Adım 6: Onboarding ilk workspace akisi ve Ayarlar (Tema/Dil) ekrani eklendi
- Workspace yoksa onboarding formu; Settings’te Light/Dark/System tema + TR/EN dil tercihi; Drawer/AppBar girişi; `flutter analyze` temiz.

### [29 Temmuz 2026] - Faz 8.1 Adım 7: Workspace/Proje silme yetkileri ve Socket.io realtime entegrasyonu tamamlandi. Mobil geliştirme fazı bitti.
- OWNER workspace silme + proje silme; `socket_io_client` ile `task_updated` / `new_notification` / `activity_logged`; Nest emit’leri; `flutter analyze` temiz. Faz 8.1 mobil tamamlandı.

### [29 Temmuz 2026] - Fix: Faz 8.1 Adım 7 sonrası ortaya çıkan Socket.io bağlantı, CORS ve Riverpod state hataları giderildi.
- Socket web uyumu (polling+websocket, token auth-only, debounce invalidate); 403/unhandled task fetch ve loadMore rethrow düzeltmeleri; Nest gateway CORS.

### [29 Temmuz 2026] - Fix: Workspace silme sonrasi state'in temizlenmemesinden kaynaklanan 403 Forbidden hatalari giderildi.
- Silmede aktif workspace önce null; bildirim/görev/proje/istatistik provider invalidate; Dio 403 interceptor + socket leave_workspace.

### [29 Temmuz 2026] - Fix: task_card.dart arayüz taşma (RenderFlex overflow) ve 401 Unauthorized oturum yönlendirme hataları giderildi.
- TaskCard Expanded/ellipsis layout; Dio 401 → oturum temizliği + `/login` yönlendirmesi.

### [30 Temmuz 2026] - Faz 8.2 Adım 1: Tasarım sistemi & tema parity (Web token → Flutter)
- `AppTheme`: primary light `#ea580c` / dark `#ff6a00`, border `#cbd5e1`/`#1e293b`, radius 8; Card/Input/Button/NavBar/Chip temaları web `globals.css` ile hizalandı.
- Login/Register/Settings/Home drawer primary vurgusu; InputDecoration Outline override’ları kaldırıldı. `flutter analyze` temiz.

### [30 Temmuz 2026] - Faz 8.2 Adım 2: Uygulama kabuğu (Shell) & navigasyon UX
- Home: web Sidebar benzeri Drawer (Dashboard/Projeler/Kişisel/Ayarlar/Davet/Çıkış), ≥900px NavigationRail; AppBar “Genel bakış” + workspace başlığı.
- `AppEmptyState` / `AppSectionHeader`; Auth `AuthSplitShell` + Login/Register/Onboarding split-panel. `flutter analyze` temiz.

### [30 Temmuz 2026] - Faz 8.2 Adım 3: RBAC & yetki kapıları (UI)
- `workspace_rbac.dart` + `WorkspaceCapabilities` (invite / proje oluştur-sil / workspace sil / görev oluştur); UI kapıları Home/Settings/ProjectDetail.
- Non-admin üye proje listesi: atanmış görev + `assigned_to`/`user_id`/`created_by` ile filtre (web `getMemberVisibleProjectIds`). `flutter analyze` temiz.

### [30 Temmuz 2026] - Faz 8.2 Adım 4: Workspace üyeleri & assignee seçici
- Nest `GET /workspaces/:id/members` (Admin: tümü, Member: kendisi) + mobil `MembersScreen` / Drawer / Settings.
- `AssigneePickerField` create/edit görevde UUID yerine dropdown; Member yalnızca kendisine atanır. `flutter analyze` temiz.

### [30 Temmuz 2026] - Faz 8.2 Adım 5: Task Claim (sahiplenme) akışı
- Nest create/update `assignment_status` + `POST .../notifications/:id/respond-claim`; claim bildirimi (`task_claim_request`).
- Mobil DTO/kart (soluk + SLA), detayda durum kilidi, bildirim Kabul/Reddet. `flutter analyze` temiz.

### [30 Temmuz 2026] - Faz 8.2 Adım 6: Dual silme onayı & bildirim aksiyonları
- Nest `requestOrDelete` (ilerleme→onay), `respond-deletion`, rejected list + reassign; mobil silme/onay UI + Create Task yeniden atama. `flutter analyze` temiz.

### [30 Temmuz 2026] - Faz 8.2 Adım 7: Personal Workspace tam parity
- Nest `PersonalModule` (`/personal/notes|todos|files`) + mobil 4 sekme (Atanan/Notlar/Todos/Dosyalar).
- Not PATCH, todo CRUD+due, dosya upload/liste/sil; atanmış görevlerde öncelik/durum/tarih/arama filtreleri. `flutter analyze` + backend `tsc` temiz.

### [30 Temmuz 2026] - Faz 8.2 Adım 8: Dashboard / Analytics parity
- KPI: Toplam / Tamamlanma % / Geciken / Aktif Üyeler; Durum donut + Öncelik bar + Üye iş yükü bar (`fl_chart`).
- Dashboard’da Son Aktiviteler feed (`activityLogProvider`); boş grafik/deadline durumları web’e yakın. `flutter analyze` temiz.

### [30 Temmuz 2026] - Faz 8.2 Adım 9: Kanban & görev detay UI cilası
- Kolon sıralama (öncelik/tarih) + varsayılan priority_desc; kart: açıklama, assignee chip, priority border renkleri, claim/SLA badge.
- Detay sekmesi label/spacing; create/edit outline İptal + primary CTA; input border light `width: 2`. `flutter analyze` temiz.

### [30 Temmuz 2026] - Faz 8.2 Adım 10: i18n TR/EN + kalan uyum
- `AppStrings` TR/EN sözlük + `appStringsProvider` / InheritedScope; MaterialApp.locale Settings `locale_code` ile bağlı.
- Nav/settings/auth/notifications/activity mesajları lokalize; “çeviri yakında” kaldırıldı. `flutter analyze` temiz. Faz 8.2 tamamlandı.

### [30 Temmuz 2026] - Fix: MaterialLocalizations dil hatası ve 401 Unauthorized oturum yönlendirme sorunu çözüldü.
- `flutter_localizations` + GlobalMaterial/Widgets/Cupertino delegates; `tr`/`en` locale uyarısı giderildi.
- Auth bootstrap JWT `exp` kontrolü; workspace fetch auth hazır olana kadar bekliyor; 401’de token secure storage’dan silinip `/login` yönlendirmesi. `flutter analyze` temiz.

### [30 Temmuz 2026] - Fix: MaterialLocalizations tr locale hatası ve workspace 401 yetkilendirme/yönlendirme sorunu çözüldü.
- Locale `tr_TR`/`en_US` + `localeResolutionCallback`; AppStrings MaterialApp dışına alındı (Localizations ağacı).
- Dio bellek token senkronu (`authTokenSyncProvider`); `/workspace` yalnızca token hazırken; router token/workspace yüklenene kadar splash. `flutter analyze` temiz.

### [30 Temmuz 2026] - Fix: Web için CanvasKit yükleme sorunu (HTML renderer ile) ve FontManifest 404 hatası çözüldü.
- Flutter 3.44’te `--web-renderer html` kaldırıldığı için CanvasKit CDN bypass: `.vscode/launch.json` → `--no-web-resources-cdn` (yerel canvaskit).
- `uses-material-design: true` doğrulandı; `flutter clean` + `flutter pub get` ile FontManifest/asset önbelleği yenilendi.

### [31 Temmuz 2026] - UI/UX parity paketi (Dashboard, Projeler, Kanban, Yorumlar, Notlar, Tema)
- Dashboard KPI overflow: `childAspectRatio` 1.95 + `Flexible`/ellipsis/sıkı tipografi; fl_chart pie/bar `touchData.enabled: false` (tooltip kapalı).
- Projeler: web `dashboard-home` kart grid’i (ikon tile, açıklama fallback, oluşturma tarihi, responsive 1/2/3 kolon).
- Proje detay toolbar: LOW/MEDIUM/HIGH chip’leri kaldırıldı; yalnızca **Filtre** menüsü (+ Sıra).
- Create Task: “Açıklama” / “Teslim tarihi” etiketlerinden `(opsiyonel)` kaldırıldı.
- Yorumlar: `CommentAuthorDto` camelCase/display_name + e-posta local-part fallback; create sonrası liste refresh; Nest create yanıtına `author` eklendi.
- Personal not: “İlgili Görev” dropdown (`personalTasksProvider`); create/update `taskId`; listede görev rozeti.
- Ayarlar: Light/Dark `SwitchListTile` → `themeModeProvider`; dil ikonu `Icons.translate`, üyeler `Icons.people_outline`.
- `flutter analyze`: No issues found.

### [2 Ağustos 2026] - Mobil eksik kapatma paketi
- Nest: `POST /auth/refresh`, `GET .../tasks/deleted`; Admin’e `OWNER` rolü.
- Flutter: silent JWT refresh, trash/restore, admin stats/remove member, progress reports UI, i18n genişletme, ölü notes temizliği, hata UX, splash polish, workspace offline cache, RBAC unit testleri.
- `flutter_dotenv` kaldırıldı. Günlük: `reports/2026-08-02_DAILY_REPORT.md`.

### [2 Ağustos 2026] - Dual approval silme, UI/settings düzeltmeleri, upload limiti
- **Görev detay:** `getTaskDetails` (GET task by id) eklendi; sheet açılışında fresh fetch + Material/SafeArea; TabBarView çocukları sabit 4 slot.
- **Proje kartları:** `mainAxisExtent` + açıklama `maxLines`/`ellipsis` ile overflow giderildi.
- **SLA metni:** Rozetten `(SLA)` kaldırıldı; detayda “SLA aşıldı” ifadesi sadeleştirildi.
- **Görev oluşturma:** Create dialog dropdown’lar controlled `value` ile düzeltildi; boş workspace/project artık anlamlı `TaskException` fırlatıyor.
- **Durum değiştirme:** Detayda ChoiceChip yerine `DropdownButtonFormField` (açılır menü).
- **Dosya limiti:** Multer 50MB (`file` + `personal` upload); SQL migration `increase_storage_upload_limits_50mb.sql` (uploads/task-attachments/personal-files).
- **Dual approval silme:** Mobil silme diyaloğu admin/kullanıcı metinleri; boş `projectId` (personal) için doğrudan repository silme; Nest bildirim metinleri web ile hizalandı (“Görev tamamlandı mı…” / “Görevi silmek istiyorum”).
- **Tema crash:** Theme/locale deferred state + Switch `microtask`; dil `SegmentedButton` (DropdownFormField theme rebuild crash’i önlendi).
- **Dil:** `AppStrings` artık `MaterialApp.builder` içinde — locale değişince ağaç yeniden bağlanır.
- **Ayarlar:** Üyeler + Yönetim Paneli tek **Yönetim Paneli** (`AdminScreen`); drawer da admin’e yönleniyor.
- **İlerleme raporları:** “Yeni rapor” FAB/dialog kaldırıldı; liste + admin silme kaldı.
- `flutter analyze`: No issues found.

### [2 Ağustos 2026] - Locale _dependents.isEmpty crash + dual delete/status/upload onarımı
- **Dil çökmesi (`_dependents.isEmpty` / ancestor assertion):** `AppStrings` InheritedWidget `MaterialApp.builder` içinden çıkarıldı; scope tekrar **MaterialApp üstünde**. Locale yalnızca languageCode (`tr`/`en`); değişim `addPostFrameCallback` + `scheduleLocale` ile. Böylece Localizations ağacı bozulurken Inherited dependents asılı kalmıyor.
- **Dual approval silme (zorunlu UI):** Kanban `TaskCard` sağ üstte çöp ikonu + detayda “Silme onayı iste”; Nest `requestOrDelete` artık **doğrudan soft-delete yapmıyor** — her zaman onay akışı (admin→assignee / member→admin bildirimleri).
- **Durum değiştirme:** Kartta “Durum” butonu + bottom sheet (`showTaskStatusPicker`); detayda dropdown + sheet; PATCH + optimistic `updateStatus`.
- **Görev oluşturma:** Payload Nest DTO ile hizalandı (`status`/`priority`/`project_id`/`assignee_id`+`assigned_to`); hata mesajları loglanıyor.
- **Dosya yükleme:** Dio `FormData` isteğinde varsayılan `Content-Type: application/json` kaldırılıyor (boundary kırılıyordu); create kaydında zorunlu `file_type`; Nest `CreateFileDto` `IsUrl` → `IsString` (Storage URL validation).
- `flutter analyze`: No issues found.

### [2 Ağustos 2026] - Web: 2FA, Global Search, Dashboard swipe, Üye yönetimi
- **2FA / MFA (Supabase TOTP):** Ayarlar’da Görünüm / Dil / **Güvenlik** sekmeleri; QR enroll + verify + disable (`MfaSecurityPanel`). Girişte AAL kontrolü → `MfaChallengeCard`. JWT → `setSession` köprüsü (`supabase-mfa.ts`).
- **Global arama:** Navbar “Ara…” + `Cmd/Ctrl+K` Command Palette (`cmdk`); projeler, görevler, üyeler + sayfa kısayolları; `globalSearch` server action.
- **Dashboard swipe:** Embla Carousel ile 2 sayfa — (1) KPI + grafikler, (2) Yaklaşan teslimler + son aktiviteler; oklar, pagination dots, trackpad/touch swipe.
- **Üyeler sayfası:** Sidebar’da Ayarlar altına `/members`; Data Table; admin rol güncelleme + workspace’ten çıkarma. Nest: `PATCH .../admin/users/:userId/role`.
- Bağımlılıklar: `cmdk`, `embla-carousel-react`. `tsc --noEmit` temiz.

### [10 Ağustos 2026] - Teknik borç kapatma paketi: güvenlik, CI, test, Kanban DnD, e-posta
> Kaynak: proje geneli taraması sonrası hazırlanan `CLAUDE.md` (yerel, gitignored) öneri listesinin uygulanabilir kısmı. Dış hesap/kimlik bilgisi gerektiren maddeler (Play Store imzalama, Firebase push, AI özellikleri, frontend Sentry) bilinçli olarak ertelendi — bkz. `CLAUDE.md`.
- **Güvenlik:** Kök `.env.example`'daki gerçek Supabase URL/anon key placeholder'a çevrildi (gerçek değerler zaten yalnızca gitignored `.env`'de). Backend'e `@nestjs/throttler` ile rate limiting eklendi — global 100 istek/dk/IP, `/auth/register`+`/auth/login`+`/auth/refresh` 5 istek/dk/IP (brute-force koruması). Prod'da `CORS_ORIGIN` boş/`*` bırakılırsa `main.ts` başlangıçta uyarı logu basıyor.
- **CI (`.github/workflows/ci.yml`):** Backend (build+test zorunlu, lint bilgilendirme amaçlı `continue-on-error` — kod tabanında bu paketten önceden var olan ~227 `@typescript-eslint` uyarısı nedeniyle bilinçli olarak bloklamıyor), Frontend (`tsc --noEmit`+`vitest`+`next build` zorunlu, lint bilgilendirme amaçlı), Mobile (`flutter analyze`+`flutter test` zorunlu — ikisi de temiz). `keep-alive.yml`: Render free-tier cold start'ı azaltmak için `/health` ve web köküne 06-22 UTC arası 10 dakikada bir ping (`workflow_dispatch` ile manuel de tetiklenebilir).
- **Backend testleri:** Önceden var olan ama kırık 4 test dosyası (Nest CLI iskeleti, `SupabaseService`/guard mock'suz — `npm test` başarısız oluyordu) `SupabaseService` mock'lu (`src/test/supabase-query-mock.ts` — zincirlenebilir Postgrest builder taklidi) gerçek testlerle yeniden yazıldı (`note.service/controller.spec.ts`, `progress-report.service/controller.spec.ts`). Yeni: `workspace-role.guard.spec.ts` (rol matrisi: üyelik zorunluluğu, Admin/Member ayrımı), `task.service.spec.ts` (soft-delete `findDeleted`/`restore`, dual-approval `requestOrDelete` yetki kontrolü), `mail.service.spec.ts`. Toplam: 9 suite / 30 test, hepsi geçiyor.
- **Frontend testleri:** Vitest kuruldu (`vitest.config.ts`, native `tsconfigPaths` resolver — ek plugin gerekmedi); `frontend/src/lib/rbac.ts` (`isAdminRole`/`isMemberOrAbove`/`normalizeWorkspaceRole`) için 20 test.
- **Kanban gerçek drag & drop:** `@dnd-kit/core` ile `ProjectTaskBoard`'a sürükle-bırak eklendi (`DESIGN.md`'de "sonraki iterasyon" olarak planlanmıştı). Her karta ayrı bir **tutamaç (grip handle)** ikonu eklendi — `{...listeners}` yalnızca bu tutamaca bağlı, kartın geri kalanına değil; böylece başlık tıklaması, durum `<select>`'i ve silme menüsü dnd-kit'in `PointerSensor`'ıyla çakışmıyor. Sütun bırakma hedefleri `useDroppable`; bırakıldığında mevcut `handleStatusChange` (optimistic update + Server Action) tetikleniyor. `claimPending`/`updating` durumunda tutamaç gizleniyor (durum değişikliği zaten kilitli). i18n: `projectBoard.dragHandle` (TR/EN).
- **E-posta bildirimi (opsiyonel, SMTP):** `backend/src/mail/` (`MailService` + `MailModule`) — `SMTP_HOST` tanımlı değilse `enabled=false` ve `send()` no-op (mevcut in-app bildirim tek başına çalışmaya devam eder). `WorkspaceService.invite()` artık davet edilen kişi henüz kayıtlı profil değilse de (önceden yalnızca `profiles` eşleşmesi varsa bildirim gidiyordu) SMTP yapılandırılıysa e-posta gönderiyor.
- **Sentry (yalnızca backend, env-gated):** `SENTRY_DSN` tanımlıysa `@sentry/node` init edilir; `SentryInterceptor` yalnızca 5xx hataları raporlar, orijinal exception'ı değiştirmeden yeniden fırlatır (mevcut hata yanıt formatı bozulmadı). **Frontend'e bilinçli olarak eklenmedi** — Next.js 16 çok yeni (`AGENTS.md`: "breaking changes... training data'dan farklı") ve `@sentry/nextjs`'in Turbopack/Next 16 uyumu doğrulanamadığından, üretim build'ini riske atmamak için ertelendi.
- **Doğrulama:** Backend `npm run build` + `npm test` (9/9), Frontend `npx tsc --noEmit` + `npm run build` (prod) + `npx vitest run` (20/20), Mobile `flutter analyze` (temiz) + `flutter test` (7/7) — hepsi bu paket sonrası tekrar çalıştırıldı. Not: `eslint --fix` ilk denemede ilgisiz ~28 dosyayı otomatik biçimlendirmişti; kapsam dışı olduğu için bu değişiklikler `git checkout` ile geri alındı, yalnızca kasıtlı dosyalar commit'e girdi.
- **Yapılmadı / ertelendi (dış hesap veya ürün kararı gerektiriyor):** Mobil release imzalama (gerçek keystore), Play Store/Firebase App Distribution dağıtımı, mobil FCM push bildirimi, frontend Sentry, AI özellikleri (görev önerisi/özet/deadline tahmini). Detay ve gerekçe için `CLAUDE.md`.

### [12 Ağustos 2026] - Web: 18 maddelik düzeltme/özellik paketi (kullanıcı talebiyle)
> Next.js Server Actions + Supabase RLS, dnd-kit Kanban, Socket.IO realtime, Redis cache mimarisi referans alınarak web tarafında uygulandı. Yeni migration'lar: `restrict_tasks_visibility_to_assignee.sql`, `add_task_assignees_multi.sql`, `fix_workspace_members_select_all.sql` (Supabase SQL Editor'de çalıştırılmalı).

1. **BUG — Task claim kabul sonrası "onay bekliyor" takılıyor:** Kök neden ikili — `respondToTaskClaim`'deki UPDATE `.select()` içermiyordu (RLS sessizce 0 satır etkilerse fark edilmiyordu) ve bildirim menüsündeki kabul/red, Kanban board'un kendi local state'ini haberdar eden dolaysız bir mekanizmaya sahip değildi (yalnızca `router.refresh()`/realtime'a güveniliyordu). `task-workflows.ts`'de UPDATE artık `.select().maybeSingle()` ile doğrulanıyor ve 0 satır dönerse açık hata veriyor; `client-cache.ts`'e hafif bir event emitter (`emitTaskAssignmentChange`/`onTaskAssignmentChange`) eklendi, `invite-notifications-menu.tsx` başarılı kabul/red sonrası bunu tetikliyor, `project-task-board.tsx` anında dinleyip kartı günceller/kaldırır.
2. **Dashboard "Aktif Üyeler" → gerçek zamanlı online durum:** Yeni `useWorkspacePresence` hook'u (`hooks/use-workspace-presence.ts`) Supabase Realtime Presence (`channel.track` + `presenceState()`) ile workspace'e özel bir presence kanalına katılır. `AnalyticsDashboard` artık `workspaceId` prop'u alıyor; presence hazır olduğunda KPI kartındaki sayı canlı çevrimiçi sayısına döner (hazır değilken statik üye sayısına geri düşer), hint metni "Şu anda çevrimiçi" olur.
3. **"Ana görünüm — KPI ve grafikler" başlığı kaldırıldı.**
4. **Dashboard carousel swipe/drag kapatıldı:** Embla `watchDrag: false` — geçiş yalnızca ok/nokta butonlarıyla.
5. **Kişisel todo silme/tamamlama:** İncelendi — `togglePersonalTodo`/`deletePersonalTodo` zaten tam işlevsel ve UI'da doğru bağlıydı; değişiklik gerekmedi.
6. **Görev görünürlüğü (Owner/Admin hepsi, Member/Guest sadece atanan):** `tasks` SELECT RLS politikası artık `is_workspace_member` yerine yeni `is_workspace_admin()` kullanıyor (`restrict_tasks_visibility_to_assignee.sql`) — önceden herhangi bir workspace üyesi TÜM görevleri okuyabiliyordu (uygulama katmanı filtreliyordu ama Supabase Realtime bu RLS'e göre çalıştığından Member'lar başkalarının görev güncellemelerini realtime'da görebiliyordu). Ayrıca `WorkspaceRoleGuard`'ın "rol yoksa üyelik kontrolü atlanır" zayıflığının zaten düzeltilmiş olduğu doğrulandı. NestJS `TaskService.findAll` de aynı mantıkla güncellendi (Member/Guest yalnızca kendi görevlerini görür).
7. **Kişisel not — uzunsa collapsible:** `ExpandableNoteContent` (220 karakter eşiği, "Devamını göster/Gizle") eklendi; not kartının tıklama-ile-düzenle davranışı `<button>`'dan `role="button"` `<div>`'e çevrildi ki iç içe interactive element (button-in-button) hatası oluşmasın.
8. **Register → bekleyen davet varsa davet ekranı:** `/onboarding` artık `getMyPendingInvitations()` çekiyor; davet varsa `OnboardingInviteResponse` (Kabul/Reddet) gösteriyor, hepsi reddedilince veya hiç yoksa `OnboardingCreateWorkspace`'e geçiyor (`OnboardingGate` client wrapper).
9. **Workspace'den ayrılma:** Yeni `leaveWorkspace` server action (`workspaces.ts`) — Member/Guest serbest ayrılır; Admin/OWNER rolü, kendisi dışında başka Admin/OWNER yoksa engellenir ("önce başka birini yönetici yap" mesajı); gerçek `owner_id` sahibi hiç ayrılamaz (devretme özelliği yok, önce silmeli). Sidebar workspace dropdown'ına "Çalışma Alanından Ayrıl" eklendi (owner olmayanlar için). RLS zaten `workspace_members` DELETE'te `user_id = auth.uid()` izni veriyordu (`fix_workspaces_delete_rls.sql`) — yeni migration gerekmedi.
10. **Global arama (Cmd/Ctrl+K) çalışmıyordu:** Kök neden — sunucu tarafında zaten ilike ile filtrelenmiş sonuçlar, cmdk'nin KENDİ varsayılan fuzzy filtresinden BİR KEZ DAHA geçiyordu (`shouldFilter` hiç ayarlanmamıştı); çift filtreleme sonuçları gizleyebiliyordu — bilinen bir cmdk + async/server-side arama tuzağı. `CommandDialog`'a `shouldFilter` prop'u eklendi, `GlobalSearchCommand` `shouldFilter={false}` geçiyor (zaten kendi ilike + nav filtresini uyguluyor).
11-12. **Kanban: tüm karttan sürükleme + herhangi bir yere tıklayınca detay açma:** Önceki oturumda eklenen ayrı "tutamaç" (grip handle) kaldırıldı; `{...attributes} {...listeners}` artık tüm kart `<div>`'ine bağlı, `onClick` de aynı div'de (kartın her yeri tıklanabilir/sürüklenebilir). `PointerSensor`'daki `activationConstraint: {distance: 8}` (zaten mevcuttu) tıklama ile sürüklemeyi ayırt ediyor; durum `<select>`'i ve "..." silme menüsü `stopPropagation` ile korunuyor.
13. **Çoklu görev ataması:** Yeni `task_assignees` join tablosu (`add_task_assignees_multi.sql`, mevcut tekli `assignee_id`'den backfill + tasks SELECT RLS'e dahil edildi). Tasarım kararı: mevcut TEKLİ `assignee_id`/`assigned_to`, sahiplenme (claim/accept/reject) + dual-approval silme + bildirim akışının birincil hedefi olarak DEĞİŞMEDEN kaldı (bu akışları çoklu-kişiye yeniden tasarlamak ayrı ve çok daha büyük bir iş); `task_assignees` bunun üzerine EK bir görünürlük/işbirliği katmanı. Yeni `task-assignees.ts` server action'ları (`getTaskAssignees`/`setTaskAssignees`, yalnızca admin düzenleyebilir) + `TaskDetailSheet`'te "Ek Atananlar" çoklu seçim (checkbox listesi, admin) / rozet listesi (admin olmayan, salt okunur).
14-15. **Görev detayı: Yorumlar ve Aktivite Geçmişi collapsible:** `TaskComments`/`TaskActivityFeed`'e `open`/`onToggleOpen` prop'ları eklendi (varsayılan açık); başlık artık tıklanabilir, sayaç gösterip chevron ile açılıp kapanıyor. `TaskDetailSheet`'te `commentsOpen`/`activityOpen` state'i ile bağlandı.
16. **Dosya yükleme limiti tutarsızlığı:** Web'deki `uploadTaskAttachment`/`uploadPersonalFile` server action'larında SERT KODLANMIŞ 25MB limiti bulundu — halbuki Supabase Storage bucket limiti (`increase_storage_upload_limits_50mb.sql`) ve NestJS Multer limiti zaten 50MB'tı. İkisi de 50MB'a çıkarılıp üç katman tutarlı hale getirildi.
17. **Üyeler sayfası — herkes görsün, sadece admin düzenlesin:** Kök neden — `data-cache.ts`'teki `getCachedWorkspaceMembers` uygulama katmanında `if (!isAdmin) members = members.filter(m => m.id === userId)` ile listeyi kendine indiriyordu; AYRICA `workspace_members` RLS SELECT politikası (`USING (user_id = auth.uid())`) zaten yalnızca kendi satırına izin veriyordu — hatta gerçek `owner_id` olmayan bir Admin bile diğer üyeleri RLS seviyesinde göremiyordu. App-layer filtre kaldırıldı; yeni RLS politikası (`fix_workspace_members_select_all.sql`, `is_workspace_member()` ile) workspace'teki herkesin tüm üyeleri görmesine izin veriyor. `MembersTable` zaten düzenleme (rol değiştir/çıkar) UI'ını `isAdmin`'e göre ayrıca gizliyordu — değişmedi. NestJS `WorkspaceService.listMembers`'daki aynı self-filtre de tutarlılık için kaldırıldı.
18. **Performans — waterfall veri çekimi:** `/projects` sayfasında gerçek bir 2-aşamalı waterfall bulundu: `getDashboardTaskStats(projectIds)` önce `getCurrentUserProjects`'in sonucunu bekliyordu. `getDashboardTaskStats` artık `projectIds` yerine doğrudan `workspaceId` alıyor (RLS zaten görünürlüğü sınırlıyor), böylece tek `Promise.all` içinde projeler+auth+stats paralel çekiliyor. Dashboard (`/`), proje detayı ve `/personal` sayfaları zaten (28 Temmuz'daki önceki optimizasyon turundan) iyi paralelleştirilmiş bulundu — ek waterfall tespit edilmedi. Not: İstemci tarafı cache (React Query/SWR) eklemek kapsam dışı bırakıldı — mevcut mimariye (Server Actions + `unstable_cache` + realtime) yeni bir bağımlılık/patern eklemek bu düzeltme listesinin ötesinde, ayrı bir mimari karar.

**Doğrulama:** Backend `npm run build` + `npm test` (9/9 suite), Frontend `npx tsc --noEmit` + `npm run build` (prod) + `npx vitest run` (20/20) — hepsi bu paket sonrası temiz. Mobil bu turda dokunulmadı (kapsam yalnızca web).

**Not:** Migration'lar (`restrict_tasks_visibility_to_assignee.sql`, `add_task_assignees_multi.sql`, `fix_workspace_members_select_all.sql`) Supabase SQL Editor'de manuel çalıştırılmalı — kod bu şemaya bağımlı (task_assignees tablosu yoksa `getTaskAssignees` sessizce boş döner, `setTaskAssignees` açıklayıcı hata verir).

### [15 Ağustos 2026] - BUG FIX: Görev oluşturma "infinite recursion detected in policy for relation tasks"

**Kök neden:** Bir önceki paketteki (12 Ağustos, madde 13) `add_task_assignees_multi.sql` iki politikayı birbirine çapraz bağımlı hale getirmişti:
- `tasks."tasks_select_assignee_or_admin"` → `task_assignees`'e `EXISTS` ile bakıyor
- `task_assignees."task_assignees_select"` → `tasks`'a `EXISTS` ile bakıyor

Her iki `EXISTS` alt sorgusu da normal (SECURITY DEFINER olmayan) context'te planlandığından, karşı tablonun RLS'ini yeniden tetikliyor ve PostgreSQL bunu sonsuz döngü olarak tespit edip hata veriyordu. Hata "görev oluşturma"da görünmesinin sebebi: `create-task.ts`'teki `insert(basePayload).select("id").single()` — Postgres `RETURNING` için eklenen satıra SELECT politikasını da uygulamak zorunda, bu da döngüyü tetikliyor (INSERT politikasının kendisiyle ilgisi yok).

**Çözüm:** Yeni migration `database/migrations/fix_tasks_task_assignees_rls_recursion.sql` — `is_workspace_admin`/`is_workspace_member`'da zaten kullanılan pattern'i tekrarlıyor: iki yeni `SECURITY DEFINER` fonksiyon (`is_task_assignee(task_id)`, `can_view_task(task_id)`) çapraz-tablo kontrollerini RLS'i bypass ederek yapıyor, döngü kırılıyor. `tasks_select_assignee_or_admin` ve `task_assignees_select` politikaları bu fonksiyonları çağıracak şekilde `DROP + CREATE` edildi; erişim kuralları (creator/assignee/admin/task_assignees üyeliği) davranışsal olarak DEĞİŞMEDİ, yalnızca sorgu planlama yolu düzeltildi.

**Durum:** Migration dosyası kullanıcı tarafından Supabase SQL Editor'de **çalıştırıldı** (15 Ağustos 2026) — görev oluşturma ve `task_assignees` okuyan diğer akışlar düzeldi.

### [15 Ağustos 2026] - Mobil: Web ile tam feature parite denetimi ve eşitleme

> Kullanıcı talebiyle: Mobil (Flutter) uygulamanın Web (Next.js) ile kapsamlı bir denetimi yapıldı — her sayfa, akış ve iş kuralı karşılaştırıldı, bulunan farklar üç kategoriye ayrıldı (a: mobilde yok, b: davranış farklı, c: platform kısıtı nedeniyle bilinçli farklı) ve (c) hariç hepsi uygulandı.

**Denetim yöntemi:** `frontend/src` (Server Actions, sayfalar, RLS'e bağımlı bileşenler) ve `mobile/lib` (route'lar, provider'lar) taranıp NestJS guard/service katmanıyla çapraz kontrol edildi — özellikle RBAC/yetkilendirme tarafında, web'in RLS ile uyguladığı kuralların NestJS'te de var olup olmadığına dikkat edildi (mobil yalnızca NestJS üzerinden gidiyor, RLS'e doğrudan maruz kalmıyor).

**Bulunan ve kapatılan (a) maddeler — mobilde hiç yoktu:**
1. **MFA/2FA login zorunluluğu bypass ediliyordu — güvenlik önceliği #1.** `AuthService.login()`/`SupabaseAuthGuard` AAL (authenticator assurance level) hiç kontrol etmiyordu; mobil kullanıcı, web'de TOTP açık bir hesaba sadece e-posta+şifre ile tam erişim alabiliyordu. Yeni uçlar: `POST /auth/mfa/status|challenge|verify` — her çağrıda paylaşılan singleton yerine TAZE bir Supabase istemcisi (`SupabaseService.createEphemeralClient`) kullanılıyor (aksi halde `setSession` global oturum durumunu bozup kullanıcılar arası oturum karışmasına yol açardı). Mobil login akışı artık şifre sonrası TOTP adımı istiyor (`_MfaChallengeCard`, web'deki `MfaChallengeCard` parity).
2. **Workspace'ten ayrılma** — ne backend'de ne mobilde vardı. Yeni `POST /workspace/:id/leave` (web'in `leaveWorkspace()` server action'ıyla birebir aynı kurallar: gerçek sahip ayrılamaz, tek Admin/OWNER ayrılamaz), mobil Ayarlar sayfasına eklendi.
3. **Çoklu görev ataması (`task_assignees`)** — web bu tabloya doğrudan Supabase RLS ile gidiyordu, mobil NestJS'e muhtaç olduğu için hiç yoktu. Yeni `GET/PUT /workspaces/:wId/tasks/:id/assignees` (PUT yalnızca OWNER/Admin — RLS'teki `task_assignees_insert_admin/delete_admin` ile aynı kural). Mobil görev detayına "Ek Atananlar" bölümü (admin: çoklu seçim dialog'u, diğerleri: rozet listesi).
4. **Canlı "Aktif Üyeler"** — mobil dashboard'daki sayı statikti (`members.length`, hatta workload'a göre yanlış hesaplanıyordu). Web Supabase Realtime Presence kullanıyor; mobil zaten NestJS Socket.IO gateway'ine bağlı olduğundan, `NotificationGateway`'e bellek-içi presence tracking eklendi (`presence_updated` event'i, workspace odası bazlı). **Bilinçli platform farkı:** iki ayrı taşıma katmanı olduğu için mobil ve web'in çevrimiçi sayıları teorik olarak ayrışabilir (web kullanıcıları mobilin presence havuzunda görünmez) — birleştirmek ya mobile yeni bir Supabase Realtime bağımlılığı eklemeyi ya da web'i NestJS soketine taşımayı gerektirirdi, ikisi de "parite" kapsamının ötesinde.
5. **Register → davet-öncelikli onboarding** — mobil onboarding her zaman "workspace oluştur" formu gösteriyordu, bekleyen davete bakmıyordu. `OnboardingScreen` artık `myInvitationsProvider`'ı kontrol edip önce daveti (kabul/reddet) gösteriyor, form ancak davetler yanıtlanınca çıkıyor.
6. **Global arama** — mobilde proje/görev/üye çapraz arama yoktu. Yeni `GET /workspace/:id/search?q=` (web'in `globalSearch()` server action'ının NestJS portu — `createUserClient` ile RLS-scoped olduğu için Member/Guest görev görünürlük kısıtı burada da otomatik uygulanıyor, kod tarafında tekrar edilmiyor). Mobilde AppBar'a arama ikonu + `GlobalSearchScreen` eklendi (Cmd/Ctrl+K'nin dokunmatik karşılığı).
7. **Admin panelinde rol değiştirme** — backend endpoint (`PATCH .../admin/users/:userId/role`) zaten vardı ama mobil UI'da yalnızca "çıkar" vardı. Admin ekranına rol değiştirme (Member↔Admin) eklendi.

**Kapatılan (b) maddeler — davranış farkı:**
8. **Görev detayında Aktivite Günlüğü yoktu** — `ActivityLogPanel` yalnızca proje seviyesinde kullanılıyordu. Task detail sheet'e 5. sekme ("Aktivite") eklendi, mevcut provider'a `taskId` filtresiyle.
9. **Dosya boyutu — istemci tarafı ön-kontrol yoktu** — backend/storage zaten 50MB'ta tutarlıydı ama mobilde erken/dostane bir uyarı yoktu (kullanıcı büyük dosyada backend hatasını bekliyordu). Yeni `UploadLimits` sabiti, görev dosyaları + kişisel dosyalar için ortak.

**Bilinçli olarak (c) — birebir kopyalanmadı:** Web'deki collapsible yorum/aktivite/not yerine mobilde sabit TabBar/liste kullanımı korundu (native pattern olarak makul).

**Denetim sırasında bulunan ayrı bir güvenlik açığı (kapsam dışı ama düzeltildi):** `NotificationGateway.handleConnection`, Socket.IO handshake'inden gelen `userId`/`workspaceId`'yi hiç doğrulamadan güveniyordu (`token` yalnızca varlığı loglanıyordu, asla Supabase'e doğrulatılmıyordu) — herhangi bir istemci başka birinin `userId`'sini iddia ederek onun bildirim odasına girebilir veya üyesi olmadığı bir workspace'in task/activity/presence event'lerini dinleyebilirdi. Bu web'i etkilemiyor (web bu gateway'i hiç kullanmıyor, yalnızca Supabase Realtime kullanıyor) ama mobil + doğrudan API erişimi için gerçek bir risk. Düzeltildi: `handleConnection` artık token'ı `supabase.auth.getUser()` ile doğruluyor, gerçek (doğrulanmış) userId kullanıyor, workspace odasına yalnızca gerçek üyeyse katılıyor (`isWorkspaceMember` kontrolü, `createUserClient` + RLS ile).

**Test/doğrulama:**
- Backend: `npm run build` + `npm test` (9/9 suite, 30/30 test) — her değişiklik sonrası tekrar çalıştırıldı, hepsi temiz.
- Mobil: `flutter analyze` (0 uyarı) + `flutter test` (7/7) — final tam koşu temiz.
- **Gerçek cihaz (2201116TG, Android 11):** `adb reverse tcp:3000 tcp:3000` ile yerel backend'e bağlanıp `flutter run` ile derlendi (Gradle ~297s ilk derleme), cihaza kuruldu, uygulama **çöküşsüz açıldı** (log'da exception/stack trace yok). `flutter run` debug oturumu sonradan USB/adb kesintisiyle koptu ("Lost connection to device") ama `adb shell pidof` ile uygulama process'inin hâlâ canlı olduğu doğrulandı — bu bir uygulama çökmesi değildi.
- **Bilinen sınırlama:** Bu oturumda ekrana dokunup gezinme/screenshot alma aracı olmadığından, 4 farklı rolle (Owner/Admin/Member/Guest) ekranlara tıklayarak yapılan interaktif UI/RBAC doğrulaması YAPILAMADI — yalnızca kod seviyesinde (guard/RLS/endpoint) doğrulandı ve derleme+açılış seviyesinde test edildi. Gerçek kullanıcı adımlarıyla doğrulama kullanıcı tarafından yapılmalı.

**Değiştirilen/eklenen başlıca dosyalar:**
- Backend: `auth/dto/mfa.dto.ts`, `auth.service.ts`/`auth.controller.ts` (MFA uçları), `supabase.service.ts` (`createEphemeralClient`), `workspace.service.ts`/`workspace.controller.ts` (`leave`, `search`), `task.service.ts`/`task.controller.ts` (`listAssignees`/`setAssignees`), `notification/notification.gateway.ts` (presence + auth fix).
- Mobil: `features/auth/*` (MFA), `features/workspace/presentation/{global_search_screen,workspace_switcher}.dart`, `features/workspace/providers/search_provider.dart`, `features/workspace/data/search_hit_dto.dart`, `features/settings/presentation/settings_screen.dart` (ayrılma), `features/tasks/providers/task_assignees_provider.dart`, `features/tasks/presentation/task_detail_sheet.dart` (ek atananlar + aktivite sekmesi), `features/admin/presentation/admin_screen.dart` (rol değiştirme), `features/onboarding/presentation/onboarding_screen.dart` (davet-öncelikli), `core/network/{realtime_provider,workspace_presence_provider,socket_service}.dart`, `core/constants/upload_limits.dart`, `core/l10n/app_strings.dart` (yeni TR/EN anahtarlar).

**Ek — cihazda gezinirken bulunan gerçek çökme (aynı gün düzeltildi):** İlk boot testi çöküşsüzdü ama sonraki bir turda kullanıcı cihazda gezinirken (workspace değiştirme/403 akışları) uygulama tekrar tekrar şu hatayla çöktü: `Failed assertion: '!_didChangeDependency': Cannot use ref functions after the dependency of a provider changed but before the provider rebuilt`. Kök neden: `realtime_provider.dart`'a eklenen `ref.read(workspacePresenceProvider.notifier).reset()/.update()` çağrıları `onDispose` içindeydi — `realtimeConnectionProvider` kendi bağımlılığı (workspaceId) değiştiği için dispose edilirken, dispose callback'i içinde BAŞKA bir provider'a `ref.read` ile ulaşmak Riverpod'da yasak (bu provider'ın `ref`'i o an kullanılamaz durumda). Düzeltme: notifier referansı provider'ın en başında (`ref.read(workspacePresenceProvider.notifier)`, normal build zamanında, güvenli) bir kez yakalanıp `presence` değişkeninde tutuluyor; sonraki tüm kullanımlar (onDispose dahil) `ref` üzerinden değil doğrudan bu referans üzerinden çağrılıyor — `socket` için zaten kullanılan pattern'in aynısı. `flutter analyze`/`flutter test` tekrar temiz, cihazda tekrar test edildi, aynı gezinme adımlarında çökme bir daha oluşmadı.

**Ek — Production API'ye bağlı release APK + GitHub Release dağıtımı (aynı gün, kullanıcı talebiyle):** `flutter build apk --release --dart-define=API_BASE_URL=https://staj-projesi-api.onrender.com` ile üretim backend'ine bağlı bir release APK derlendi (58.4MB, debug-signed — gerçek keystore/Play Console hesabı ayrı bir karar, bkz. `CLAUDE.md` Bölüm 5), cihaza kurulup çöküşsüz açıldığı doğrulandı. Ardından `git credential fill` ile mevcut GitHub kimlik bilgisi (token hiçbir tool çıktısına yazılmadan, yalnızca bir kabuk değişkeninde) kullanılarak GitHub REST API'siyle bir **Release** (`mobile-v1.0.0-prod-20260816`) oluşturuldu ve APK asset olarak yüklendi. İndirme linki `curl -I` ile canlı ve doğru boyutta (61.241.034 byte) olduğu doğrulandı: `https://github.com/ozclktahir/staj-projesi/releases/download/mobile-v1.0.0-prod-20260816/app-release.apk`. Repo public olduğundan link herkese açık — bilinçli kullanıcı tercihi ("linki gönderdiğim herkes indirebilsin").

**Ek — test sırasında bulunan operasyonel tuzak:** `adb reverse tcp:3000 tcp:3000` USB tüneli, telefon fiziksel olarak çıkarılıp tekrar takıldığında OTOMATİK olarak düşüyor (yeniden kurulması gerekiyor) — yerel debug build'i test ederken "giriş yapamıyorum" şikâyetinin kök nedeni buydu, kod hatası değildi. Gelecekte benzer bir cihaz test oturumunda ilk kontrol noktası bu olmalı.

### [16 Ağustos 2026] - BUG FIX: Kayıt (register) formunda "User not allowed" hatası

**Belirti:** Web'de kayıt formu doldurulup "Kayıt Ol"a basıldığında `POST /auth/register` "User not allowed" hatasıyla başarısız oluyordu, kayıt tamamlanmıyordu.

**Kök neden — kod değil, credential:** `AuthService.register()` ([backend/src/auth/auth.service.ts](backend/src/auth/auth.service.ts)), `SUPABASE_SERVICE_ROLE_KEY` tanımlıysa (rate limit'siz, e-posta onaylı kullanıcı oluşturmak için) `admin.auth.admin.createUser()` admin API'sini çağırıyor. "User not allowed", Supabase GoTrue'nun bu admin API'sine gönderilen anahtarın `service_role` yetkisine sahip olmadığını gösteren kendine özgü hatası — yani Render'daki `staj-projesi-api` servisinin `SUPABASE_SERVICE_ROLE_KEY` env değişkeni **tanımlıydı ama geçersizdi** (muhtemelen Supabase Dashboard'dan kopyalanırken fazladan boşluk/satır sonu, rotasyon veya yanlış proje anahtarı — kesin sebep doğrulanamadı, sadece anahtar güncellenerek çözüldü).

**Neden koda dokunulmadı:** `git log -p` ile `auth.service.ts`/`supabase.service.ts` geçmişi incelendi — admin client/register mantığı haftalardır değişmemiş (son dokunan commit 5cddb89 yalnızca `createEphemeralClient` eklemiş, register akışına dokunmamış). Davet-öncelikli onboarding akışıyla (`resolvePostLoginRedirect`) bir çakışma da yok — o yalnızca register+login BAŞARILI olduktan SONRA çalışıyor. Mobil de aynı `POST /auth/register` uç noktasını kullandığından ayrı bir mobil bug da yoktu — tek kök neden ikisini birden etkiliyordu.

**Çözüm:** Kullanıcı, Supabase Dashboard → Project Settings → API'den güncel `service_role` (secret) anahtarını Render Dashboard → `staj-projesi-api` → Environment → `SUPABASE_SERVICE_ROLE_KEY`'e yeniden girdi (Render otomatik yeniden deploy tetikledi).

**Doğrulama (prod, canlı API'ye gerçek istekle):**
```
POST https://staj-projesi-api.onrender.com/auth/register → 201 Created
POST https://staj-projesi-api.onrender.com/auth/login    → 200 OK (access_token döndü)
```
Test kullanıcısı: `ozclk.tahir+claudetest1786910138@gmail.com` — Supabase Authentication panelinden istenirse silinebilir (bu oturumda kullanıcı silme uç noktası yok).


### [17 Ağustos 2026] - Web + Mobil: 10 maddelik düzeltme/davranış paketi (kullanıcı talebiyle)

> Kullanıcı, çoğu daha önce eklenen özelliklerin yan etkisi/eksik kalan kısmı olan 10 madde bildirdi. Hepsi uygulandı; iş mantığı değiştiren maddeler mobil (Flutter) tarafında da eşitlendi.

**1. Kayıt sonrası davet akışı netleştirildi.** Akış zaten "davet varsa önce davet" mantığındaydı (`resolvePostLoginRedirect` → `/onboarding` → `OnboardingGate`) ama davet bekleyen kullanıcının kendi workspace'ini kurabilmesi için hiçbir çıkış yolu yoktu — daveti reddetmek zorundaydı. `OnboardingGate` artık iki yönlü: davet kartındaki buton "Workspace'e Katıl" olarak netleştirildi (kabul → doğrudan o çalışma alanına giriş), altına "kendi workspace'imi oluşturayım" bağlantısı ve oluşturma formundan davete geri dönüş eklendi. Mobil `OnboardingScreen`'e aynı iki yönlü geçiş eklendi.

**2. BUG (web): Kartta "Sil"e basınca görev detayı da açılıyordu.** Kök neden: Radix `DropdownMenuContent` bir **portal**'a basılıyor — DOM'da kartın dışında ama **React olay ağacında hâlâ kartın altında**, dolayısıyla menüdeki tıklama kartın `onClick`'ine (detay aç) sızıyordu. Trigger'daki mevcut `stopPropagation` yalnızca trigger'ı koruyordu, menü içeriğini değil. Düzeltme: `DropdownMenuContent`'e `onClick={e => e.stopPropagation()}` + kart `onClick`'inde `closest("[data-card-stop]")` koruması (menü, durum select'i ve trigger işaretlendi).

**3. Bildirime tıklayınca gerçek navigasyon.** Eski `taskLinkFromNotification` yalnızca `n.link` sütununa veya `project_id`'ye bakıyordu; `link` tarihsel olarak `taskId` içermediği için görev detayı açılmıyor, davet/üye/proje bildirimlerinde ise hiç yönlendirme olmuyordu. Yeni `notificationHref()` her bildirim tipi için hedef üretiyor: görev/yorum/deadline/silme-onayı → `/project/{id}?workspaceId=...&taskId=...` (pano `taskId`'yi okuyup detay panelini açar), davet → workspace biliniyorsa o alan yoksa `/onboarding`, üye/rol → `/members`, proje → `/project/{id}` veya `/projects`, projesi olmayan görev → `/personal`. Bildirim başka bir workspace'e aitse gitmeden önce aktif workspace o alana çevriliyor (aksi hâlde hedef sayfa "erişiminiz yok" ile açılıyordu). Aksiyonlu (kabul/red) bildirimlerin başlığı da artık tıklanabilir.

**4. Çoklu atama artık görev OLUŞTURULURKEN sorulyor.** `CreateTaskModal`'a admin-only "Ek Atananlar" çoklu seçim listesi eklendi; `createTask` artık oluşturulan görev id'sini döndürüyor ve `extraAssigneeIds` ile `setTaskAssignees`'i aynı akışta çağırıyor (birincil atanan ek listeden otomatik çıkarılıyor). Görev detayındaki mevcut düzenleme özelliği korundu. Mobilde `ExtraAssigneesField` widget'ı + `createTask(extraAssigneeIds:)` ile aynı davranış.

**5a. Dashboard grafikleri canlı güncellenmiyordu.** Analitik veri sunucuda (RSC) hesaplanıp grafiklere prop olarak geçiyor, ama sayfa açıkken hiçbir şey `router.refresh()` çağırmadığı için görev eklendiğinde/durumu değiştiğinde grafikler eski değerlerde kalıyordu. Yeni `AnalyticsLiveRefresh` bileşeni workspace'in `tasks`+`projects` tablolarını Supabase Realtime ile dinleyip 400ms debounce ile sunucuyu yeniden sorguluyor.

**5b. "Aktif Üyeler" yalnızca dashboard'dayken çalışıyordu.** Presence kanalı `AnalyticsDashboard` mount olunca açılıyordu; kullanıcı /projects veya /personal'a geçince kanal kapanıyor ve o kişi herkesin çevrimiçi sayısından düşüyordu. Presence tek bir `WorkspacePresenceProvider`'a taşındı ve **dashboard shell**'ine (tüm korumalı sayfaların ortak layout'u) takıldı; `useWorkspacePresence` artık kanal açmıyor, bu ortak durumu okuyor.

**5c. Toplam görev sayısı onay beklerken artıyordu.** Sayaçlar `assignment_status`'ü hiç dikkate almıyordu; başkasına atanan (sahiplenme onayı bekleyen) görev anında "toplam görev"e ekleniyordu. Ortak kural `lib/task-counting.ts`'e (`isCountableTask`) çıkarıldı — `pending`/`rejected` sayılmaz — ve hem `getWorkspaceAnalytics` hem `getDashboardTaskStats` bunu kullanıyor (sütun yoksa güvenli fallback var). Mobilde `DashboardData.fromTasks` aynı filtreyi uyguluyor; ayrıca sayaçlar artık `get_workspace_statistics` RPC'si yerine yerel hesaptan geliyor (RPC `assignment_status`'ü bilmiyor, onay bekleyenleri de sayıyordu).

**6. Silme artık HER ZAMAN dual-approval'dan geçiyor.** Önceki kural "ilerleme yoksa doğrudan sil, varsa onay iste" idi — bu, silme davranışını göreve göre tutarsız yapıyordu. Web'de doğrudan silme yolu tamamen kaldırıldı; yeni `resolveDeletionApprover()` onaylayanı belirliyor: **1)** atanan kullanıcı (talep eden değilse) → **2)** diğer admin/owner'lar. Hiçbiri yoksa hiçbir şey değiştirilmeden açıklayıcı hata dönüyor (tek kişilik workspace'te görev silinemez — "onaysız silme yok" kuralının bilinçli bedeli). `DeleteTaskModal`'daki iyimser "önce panodan kaldır" yolu da kaldırıldı; görev onaylanana kadar panoda "onay bekleniyor" rozetiyle duruyor. Backend (`TaskService.requestOrDelete`, mobilin kullandığı yol) zaten hep onay istiyordu ama admin kendine atanmış bir görevi silmek isteyince onayı **kendisine** gönderiyordu (self-approval açığı) — aynı onaylayan zinciriyle web ile birebir eşitlendi.

**7. Görev detayında öncelik değiştirme kaldırıldı.** Web'de select yerine salt-okunur rozet; `updateTask` çağrısından `priority` alanı çıkarıldı. Mobilde `showEditTaskDialog`'daki öncelik dropdown'ı ve `UpdateTaskDto.priority` gönderimi kaldırıldı. Backend'deki `priority` alanına ve **görev oluştururken** öncelik seçmeye dokunulmadı (talep edildiği gibi).

**8. Kişisel todo satırının tamamı tıklanabilir.** Sadece checkbox değil, satırın herhangi bir yeri tamamlanmayı değiştiriyor (klavye için Enter/Space + `role="button"`); checkbox ve silme butonu `stopPropagation` ile çakışmayı önlüyor (madde 2'deki ile aynı desen).

**9. BUG: Üyeler sayfasında rol değiştirme çalışmıyordu.** İki ayrı kök neden bulundu:

- **(a) Bayat cache — asıl sebep.** `getWorkspaceMembers` 5 dakikalık `unstable_cache` kullanıyor; mutasyondan sonra çağrılan `revalidateTag(tag, "max")` Next.js 16'da girdiyi yalnızca **bayat işaretliyor** (stale-while-revalidate), anında geçersiz kılmıyor. Rol değişiyor, toast "başarılı" diyor, ama sayfa yenilenince eski rol geri geliyordu. Düzeltme: mutasyonlarda `updateTag()` (anında geçersiz kılma, read-your-own-writes) + `revalidatePath("/members")`, üyeler sayfası artık cache'i tamamen atlayan `getWorkspaceMembers(ws, { fresh: true })` yolunu kullanıyor, `MembersTable` başarıdan sonra `router.refresh()` çağırıyor ve hata durumunda yerel state'i geri alıyor.
- **(b) Guard kırılganlığı.** `WorkspaceRoleGuard` yalnızca `workspace_members` satırına bakıyor ve rolü **harfe duyarlı** karşılaştırıyordu; `workspaces.owner_id` sahibi hiç dikkate alınmıyordu. `workspace_members_role_check` CHECK kısıtı `'OWNER'` değerini reddettiği için (prod DB'de doğrulandı) sahiplik satırının rolü şemaya göre değişebiliyor; satırı hiç olmayan bir sahip ise kendi çalışma alanında 403 alıyordu (prod'da yeniden üretildi). Guard artık `workspaces.owner_id`'yi de kontrol ediyor, rol karşılaştırması harfe duyarsız ve sahip Admin gerektiren uçlara da erişiyor. Guard ayrıca RLS'yi bypass eden service-role istemcisini tercih ediyor (`SUPABASE_KEY` ortama göre anon olabiliyor ve anon anahtarla bu okumalar boş dönüp herkesi engellerdi). `AdminService`'teki "son yönetici" sayımı da harfe duyarsız + sahip dahil olacak şekilde düzeltildi.

**10. Global arama gerçek içeriği aramıyordu.** Kök neden prod'da yeniden üretildi: üye sorgusundaki `workspace_members ... profiles:user_id(...)` embed'i şemada FK ilişkisi olmadığı için **her zaman** `PGRST200 - Could not find a relationship` hatası veriyordu, yani üye araması hiç sonuç döndürmüyordu. Profiller artık ayrı sorguyla (`loadProfilesByIds`) çekiliyor ve `workspace_members` satırı olmayan workspace sahibi de listeye ekleniyor. Ek olarak arama kapsamı genişletildi: proje **açıklaması**, görev **açıklaması** ve kullanıcının **kişisel notları/todo'ları** da aranıyor; görev sonuçları artık `taskId` query'siyle doğrudan görev detayını açıyor. Aynı düzeltme mobilin kullandığı `WorkspaceService.search`'e de uygulandı (mobilde not/todo sonuçları Kişisel Alan sekmesine götürüyor — bunun için sekme durumu `homeTabProvider`'a taşındı).

**Test/doğrulama:**

- Backend: `npm run build` + `npm test` → **9/9 suite, 37/37 test** (30 → 37; guard'a 5, silme akışına 2 yeni test).
- Frontend: `npx tsc --noEmit` temiz, `npm run build` başarılı, `npx vitest run` → **3 dosya, 38/38 test** (20 → 38; `notification-utils` ve `task-counting` için yeni testler).
- Mobil: `flutter analyze` → 0 uyarı, `flutter test` → 7/7.
- **Canlı doğrulama (prod Supabase + yamalı backend, gerçek iki test hesabıyla):**
  - Madde 10 — yamalı `/workspace/:id/search` ucu: `"Zebra"` → not+todo sonucu, `"QA"` → proje+2 görev+2 üye, `"Tester"` → 2 üye. Düzeltme öncesi üye sorgusu ham REST ile `PGRST200` veriyordu (yeniden üretildi).
  - Madde 9 — prod'da `workspace_members` satırı olmayan sahiple `PATCH .../role` çağrısı **403** ile yeniden üretildi; Admin satırı eklenince 200 döndüğü doğrulandı. `workspace_members_role_check` kısıtının `'OWNER'` rolünü reddettiği de doğrudan gözlendi.
  - Madde 5c — prod DB'de `assignment_status='pending'` bir görevin eski sayaçta toplam'a girdiği doğrulandı.
- **Bilinen sınırlama:** Bu oturumda tarayıcı otomasyonu (tıklama/screenshot) aracı yoktu; madde 2 ve 8 gibi saf DOM/olay davranışları kod ve React portal semantiği üzerinden düzeltildi ve build/typecheck ile doğrulandı, gerçek fare tıklamasıyla test EDİLEMEDİ. Kullanıcının tarayıcıda elle doğrulaması önerilir.

**Yeni dosyalar:** `frontend/src/lib/task-counting.ts` (+ test), `frontend/src/lib/notification-utils.test.ts`, `frontend/src/components/workspace-presence-provider.tsx`, `frontend/src/components/analytics/analytics-live-refresh.tsx`, `mobile/lib/features/workspace/presentation/extra_assignees_field.dart`, `mobile/lib/features/workspace/providers/home_tab_provider.dart`.
