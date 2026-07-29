# staj-projesi — Backend Teknik Röntgen Raporu

| Alan | Değer |
|------|--------|
| **Proje** | İş ve Çalışma Alanı Yönetim Sistemi (`staj-projesi`) |
| **Katman** | NestJS 11 Backend API |
| **Veri & Auth** | Supabase (PostgreSQL + Auth + Storage) |
| **Önbellek** | Redis (`cache-manager` + `cache-manager-redis-yet`) |
| **Gerçek zamanlı** | Socket.IO (`@nestjs/websockets` + `@nestjs/platform-socket.io`) |
| **Dokümantasyon** | Swagger / OpenAPI (`/api`) |
| **Orkestrasyon** | Docker Compose (`nestjs_api` + `redis_cache`) |
| **Rapor Tarihi** | 16 Temmuz 2026 |
| **Kapsam** | `backend/src` altındaki tüm modüller, guard’lar, DTO’lar, servisler ve kod üzerinden çıkarılan veritabanı şeması |

---

## 1. Yönetici Özeti

Sistem, çok kiracılı (multi-tenant) bir **çalışma alanı (workspace)** modeli üzerinde projeler, görevler, yorumlar, dosyalar, notlar, ilerleme raporları, aktivite günlükleri ve gerçek zamanlı bildirimleri barındıran bir NestJS API’sidir. Kimlik doğrulama Supabase JWT üzerinden yapılır; yetkilendirme ise workspace üyeliği ve rol (`Admin` / `Member` / `Guest`) meta verisine dayanan `WorkspaceRoleGuard` ile uygulanır.

Şema DDL dosyaları depoda bulunmamaktadır; tablolar ve kolonlar NestJS servis katmanındaki Supabase istemci çağrıları (`from`, `insert`, `update`, `rpc`) üzerinden **çıkarım (inference)** yöntemiyle belgelenmiştir. Fiziksel şema Supabase projesinde yaşamaktadır.

### 1.1 Mimari Katmanlar

```
İstemci (HTTP / WebSocket)
        │
        ▼
┌───────────────────────────────┐
│  NestJS HTTP Pipeline         │
│  Helmet → CORS → Validation   │
│  Swagger (/api)               │
└───────────────┬───────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
 SupabaseAuthGuard   WorkspaceRoleGuard
 (JWT doğrulama)     (rol / üyelik)
        │                │
        └───────┬────────┘
                ▼
        Controller → Service
                │
        ┌───────┼────────┐
        ▼       ▼        ▼
   PostgreSQL  Redis   Socket.IO
   (Supabase) (cache)  (bildirim)
        │
        ▼
   Storage bucket: uploads
```

### 1.2 Modül Envanteri

| Modül | Sorumluluk |
|-------|------------|
| `auth` | Kayıt, giriş, çıkış; JWT guard & rol dekoratörleri |
| `supabase` | Supabase istemcisi + Storage yükleme |
| `workspace` | Çalışma alanı CRUD / davet |
| `project` | Proje yönetimi + soft delete + Redis cache |
| `task` | Görev CRUD, filtreleme, sayfalama, alt görev, `file_url` |
| `comment` | Görev yorumları + `profiles` projeksiyonu |
| `file` | Dosya metadata + Storage upload |
| `activity-log` | Workspace aktivite kaydı |
| `note` | Kişisel notlar + kişisel dashboard |
| `progress-report` | Günlük/haftalık/aylık ilerleme raporları |
| `dashboard` | RPC tabanlı istatistiksel dashboard |
| `admin` | Admin istatistikleri ve üye çıkarma |
| `notification` | WebSocket gateway + bildirim servisi |
| `health` | Public sağlık kontrolü |

---

## 2. Çıkarılan Veritabanı Şeması (Kod Tabanlı)

Aşağıdaki ilişkisel model, uygulama kodunda referans edilen tablo ve kolonlardan türetilmiştir:

```
workspaces
  ├── workspace_members          (workspace_id, user_id, role)
  ├── workspace_invitations      (workspace_id, email, role, invited_by)
  ├── projects                   (workspace_id, created_by, deleted_at, …)
  ├── tasks                      (workspace_id, created_by, parent_task_id,
  │                               assignee_id/assigned_to, file_url, deleted_at, …)
  │     ├── comments             (task_id, user_id, content)
  │     └── files                (task_id, user_id, file_name, file_url, file_type)
  ├── notes                      (workspace_id, user_id, title, content)
  ├── progress_reports           (workspace_id, user_id, report_type, …)
  ├── activity_logs              (workspace_id, user_id, entity_*, action, details)
  └── notifications              (workspace_id, user_id, type, title, message, is_read)

profiles                         (id ≈ auth.users.id, name)  — yorum yazarı projeksiyonu
auth.users                       (Supabase Auth — PostgREST üzerinden doğrudan sorgulanmaz)
Storage: uploads                 (object path: {workspaceId}/{taskId}/{timestamp}-{name})
RPC: get_workspace_statistics(p_workspace_id)
```

---

## 3. Özellik Bazlı Teknik Analiz

---

### [Supabase JWT Auth & User Profile Entegrasyonu]

**Amacı:**  
Bu özellik, API’nin kimlik doğrulama omurgasını oluşturur. Kullanıcıların güvenli şekilde kayıt olup oturum açmasını, her korumalı istekte JWT’nin doğrulanmasını ve NestJS request bağlamına (`request.user`) Supabase kullanıcı nesnesinin bağlanmasını sağlar. Böylece sonraki tüm iş kuralları (oluşturan kişi, üyelik, rol) tutarlı bir kimlik kaynağına dayanır. `profiles` tablosu ise `auth.users` şemasına PostgREST ile doğrudan erişilemediği için yorum yazarlarının görünen adını istemciye yansıtmak amacıyla kullanılır.

**Kullanılan Teknolojiler & Bileşenler:**
- Kütüphaneler: `@supabase/supabase-js`, `@nestjs/config`, `class-validator`, `class-transformer`
- Tablolar / kaynaklar: Supabase Auth (`auth.users`), `profiles` (`id`, `name`)
- NestJS dekoratörleri: `@Controller('auth')`, `@Post()`, `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@GetUser()`
- Guard’lar: `SupabaseAuthGuard`
- DTO’lar: `RegisterDto`, `LoginDto` (`email`, `password` — `@IsEmail`, `@MinLength(6)`)

**Nasıl Çalışıyor? (İş Akışı):**

1. **Kayıt:** İstemci `POST /auth/register` ile `{ email, password }` gönderir. Global `ValidationPipe` (`whitelist` + `transform`) DTO’yu doğrular. `AuthService.register` → `supabase.auth.signUp` çağrılır; başarılı olursa Supabase Auth kullanıcısı oluşur.
2. **Giriş:** İstemci `POST /auth/login` gönderir. `AuthService.login` → `signInWithPassword`; yanıtta `access_token` ve `user` döner. İstemci bu token’ı sonraki isteklerde `Authorization: Bearer <token>` olarak taşır.
3. **Korumalı istek:** İstek NestJS’e ulaşır. `SupabaseAuthGuard`:
   - `Authorization` başlığını okur, `Bearer ` önekini ayıklar;
   - token yoksa `401 Unauthorized`;
   - `supabase.auth.getUser(token)` ile JWT’yi doğrular;
   - geçersiz/süresi dolmuşsa `401`;
   - geçerliyse `request.user = data.user` atar ve zinciri devam ettirir.
4. **Kullanıcı enjeksiyonu:** Controller metodlarında `@GetUser()` dekoratörü `request.user` değerini parametreye basar; servisler `user.id` değerini `created_by` / `user_id` olarak kullanır.
5. **Profil projeksiyonu:** `CommentService.findAll`, yorumlardaki `user_id` listesini toplar, `profiles` tablosundan eşleşen kayıtları çeker ve her yoruma `author` alanı olarak ekler (uygulama katmanında simüle edilmiş join).
6. **Çıkış:** `POST /auth/logout` + Bearer token → `auth.admin.signOut(token)`.

**Kod Sorumluları:**
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/guards/supabase-auth.guard.ts`
- `backend/src/auth/decorators/get-user.decorator.ts`
- `backend/src/auth/dto/register.dto.ts`
- `backend/src/auth/dto/login.dto.ts`
- `backend/src/supabase/supabase.service.ts`
- `backend/src/comment/comment.service.ts` (profil projeksiyonu)

---

### [Workspace–Project–Task Hiyerarşik Yönetimi]

**Amacı:**  
İş verisini çok kiracılı bir hiyerarşide organize etmek: önce **Workspace** (organizasyon/ekip sınırı), altında **Project** (iş paketleri), aynı workspace kapsamında **Task** (iş birimleri). Bu yapı, veri izolasyonunu, RBAC’in workspace kimliği üzerinden çalışmasını ve listelerin doğru tenant altında filtrelenmesini garanti eder.

**Kullanılan Teknolojiler & Bileşenler:**
- Kütüphaneler: `@nestjs/common`, `@supabase/supabase-js`, `@nestjs/cache-manager`
- Tablolar: `workspaces`, `workspace_members`, `workspace_invitations`, `projects`, `tasks`
- İlişkisel anahtarlar (çıkarım): `workspace_id`, `created_by`, `user_id`, `invited_by`
- NestJS dekoratörleri: `@Controller('workspace')`, `@Controller('workspaces/:workspaceId/projects')`, `@Controller('workspaces/:workspaceId/tasks')`, `@Param`, `@Body`, `@Query`, `@UseGuards`, `@Roles`, `@CacheInterceptor`, `@CacheTTL`
- Guard’lar: `SupabaseAuthGuard`, `WorkspaceRoleGuard`
- DTO’lar: `CreateWorkspaceDto`, `InviteMemberDto`, `CreateProjectDto`, `CreateTaskDto`, `UpdateTaskDto`, `GetTasksFilterDto`

**Nasıl Çalışıyor? (İş Akışı):**

1. **Workspace oluşturma:** `POST /workspace` → Auth Guard → `WorkspaceService.create` önce `workspaces` satırı ekler, ardından oluşturan kullanıcıyı `workspace_members` tablosuna `role: 'Admin'` ile yazar.
2. **Listeleme:** `GET /workspace` → kullanıcının `workspace_members` üzerinden üye olduğu workspace’leri `workspaces(*)` join’i ile döner.
3. **Davet:** `POST /workspace/:id/invite` → Auth + Role Guard (`Admin`) → `workspace_invitations` kaydı (`email`, `role`, `invited_by`).
4. **Proje:** `POST /workspaces/:workspaceId/projects` → Auth + Role (`Admin`/`Member`) → `projects` insert (`workspace_id`, `created_by`). `GET` listesi `deleted_at IS NULL` ile filtrelenir ve 60 sn Redis önbelleğine alınır.
5. **Görev:** `POST /workspaces/:workspaceId/tasks` → Auth + Role → `tasks` insert (`workspace_id`, `created_by` + iş alanları). `GET` tarafında arama (`ilike title`), durum/öncelik/atanan/üst görev filtreleri ve `page`/`limit` sayfalama uygulanır; soft-delete edilmiş kayıtlar hariç tutulur.
6. **Yanıt:** Servis katmanı Supabase hata mesajlarını `BadRequestException` / `NotFoundException` olarak HTTP yanıtına dönüştürür.

**Not:** Mevcut Task servisi görevleri `workspace_id` ile kapsamlar; kodda `tasks.project_id` alanı kullanılmamaktadır. Proje–görev bağının şema tarafında var olması, API katmanında henüz zorunlu bir FK kullanımı anlamına gelmez.

**Kod Sorumluları:**
- `backend/src/workspace/workspace.controller.ts`
- `backend/src/workspace/workspace.service.ts`
- `backend/src/project/project.controller.ts`
- `backend/src/project/project.service.ts`
- `backend/src/task/task.controller.ts`
- `backend/src/task/task.service.ts`
- `backend/src/app.module.ts`

---

### [WorkspaceRoleGuard ve Role Enforcement]

**Amacı:**  
Kimlik doğrulaması “kim olduğunuzu” kanıtlar; Role Enforcement ise “bu workspace’te ne yapabileceğinizi” sınırlar. Amaç, Guest kullanıcıların veri değiştiren uç noktalara erişmesini engellemek, Member’ların operasyonel CRUD yapabilmesini sağlamak ve Admin’e özel yönetim işlemlerini (davet, admin paneli, üye çıkarma) kilitlemektir.

**Kullanılan Teknolojiler & Bileşenler:**
- Kütüphaneler: `@nestjs/common`, `@nestjs/core` (`Reflector`)
- Tablolar: `workspace_members` (`workspace_id`, `user_id`, `role`)
- NestJS dekoratörleri: `@Roles(...)`, `@UseGuards(...)`, `@SetMetadata` (dolaylı), `@ApiBearerAuth`
- Guard’lar: `SupabaseAuthGuard` → `WorkspaceRoleGuard` (sıralı zincir)
- Rol kümesi: `Admin`, `Member`, `Guest`
- Kritik uç noktalar: Task/Project POST–PATCH–DELETE; Workspace invite; Admin sınıfı

**Nasıl Çalışıyor? (İş Akışı):**

1. İstek önce `SupabaseAuthGuard` ile JWT doğrulamasından geçer; `request.user` dolu olur.
2. `WorkspaceRoleGuard` devreye girer:
   - Handler/class üzerindeki `@Roles(...)` meta verisini `Reflector` ile okur;
   - **Rol meta verisi yoksa** guard `true` döner (yalnızca kimlik doğrulaması yeterli sayılır — okuma uçlarında sık kullanılan desen);
   - Rol varsa `params.workspaceId` veya `params.id` üzerinden workspace kimliğini alır;
   - `workspace_members` tablosunda `(workspace_id, user_id)` eşleşmesini sorgular;
   - Üyelik yoksa veya rol izin listesinde değilse `403 Forbidden` (`Bu işlem için yetkiniz bulunmamaktadır.`);
   - Uygunsa isteğe izin verir.
3. Controller metodu çalışır; servis yalnızca yetkilendirilmiş bağlamda veri mutasyonu yapar.
4. Task ve Project tarafında veri değiştiren metodlarda guard’lar hem sınıf hem metot seviyesinde tekrarlanarak savunma derinliği artırılmıştır.

**Rol Matrisi (özet):**

| İşlem | Admin | Member | Guest |
|-------|:-----:|:------:|:-----:|
| Workspace davet | ✓ | ✗ | ✗ |
| Task/Project oluştur/güncelle/sil | ✓ | ✓ | ✗ |
| Task/Project okuma | ✓* | ✓* | ✓* |
| Admin stats / üye çıkarma | ✓ | ✗ | ✗ |

\* Okuma uçlarında `@Roles` yoksa guard üyelik kontrolünü atlar; pratikte Auth Guard hâlâ zorunludur.

**Kod Sorumluları:**
- `backend/src/auth/guards/workspace-role.guard.ts`
- `backend/src/auth/decorators/roles.decorator.ts`
- `backend/src/task/task.controller.ts`
- `backend/src/project/project.controller.ts`
- `backend/src/workspace/workspace.controller.ts`
- `backend/src/admin/admin.controller.ts`

---

### [Socket.io Tabanlı Real-time Bildirim Sistemi]

**Amacı:**  
Kullanıcıya düşen olayların (görev atama, durum değişimi vb. — servis çağrıldığında) hem kalıcı olarak veritabanına yazılmasını hem de bağlı istemciye anlık iletilmesini sağlamak. Böylece istemci sürekli polling yapmak zorunda kalmadan güncel bildirim akışı alır.

**Kullanılan Teknolojiler & Bileşenler:**
- Kütüphaneler: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
- Tablolar: `notifications` (`workspace_id`, `user_id`, `type`, `title`, `message`, `metadata`, `is_read`, `created_at`)
- NestJS dekoratörleri: `@WebSocketGateway({ cors: true })`, `@WebSocketServer()`, `@Injectable()`
- Bileşenler: `NotificationGateway`, `NotificationService`, `CreateNotificationDto`
- Oda modeli: `user_{userId}`
- Olaylar: `notification`, `notification_read`

**Nasıl Çalışıyor? (İş Akışı):**

1. **Bağlantı:** İstemci Socket.IO ile API’ye bağlanır; handshake sırasında `query.userId` veya `auth.userId` ile kimliğini iletir.
2. **Odaya katılım (join):** `NotificationGateway.handleConnection` kullanıcı kimliğini okur ve soketi `user_{userId}` odasına `client.join(...)` ile ekler.
3. **Bildirim üretimi:** Bir iş akışı `NotificationService.create(workspaceId, dto)` çağırır:
   - Kayıt `notifications` tablosuna `is_read: false` ile yazılır;
   - Başarılı insert sonrası `notificationGateway.emitToUser(userId, 'notification', data)` tetiklenir;
   - Gateway, Socket.IO sunucusunda ilgili odaya `emit` yapar.
4. **İstemci dinleme:** Hedef kullanıcının bağlı soketi `notification` olayını anında alır.
5. **Okundu işaretleme:** `markAsRead` kaydı günceller ve `notification_read` olayını yayınlar.
6. **Listeleme:** `findAllForUser` workspace + user kapsamında bildirimleri `created_at DESC` sıralar.

**Mimari not:** Modül HTTP controller içermez; `NotificationService` export edilir ve diğer domain servislerinden çağrılmak üzere tasarlanmıştır. Gateway, NestJS uygulaması ayağa kalkarken Socket.IO sunucusunu HTTP sunucusuyla aynı süreçte başlatır.

**Kod Sorumluları:**
- `backend/src/notification/notification.gateway.ts`
- `backend/src/notification/notification.service.ts`
- `backend/src/notification/notification.module.ts`
- `backend/src/notification/dto/create-notification.dto.ts`
- `backend/src/app.module.ts`

---

### [Soft Delete (Geri Dönüşüm Kutusu) Altyapısı]

**Amacı:**  
Kritik iş kayıtlarının (görev ve proje) fiziksel olarak silinmesi yerine `deleted_at` zaman damgası ile arşivlenmesi. Bu yaklaşım yanlışlıkla silmeyi geri alınabilir kılar, denetim izini korur ve liste sorgularında “aktif veri”yi temiz tutar.

**Kullanılan Teknolojiler & Bileşenler:**
- Tablolar / kolonlar: `tasks.deleted_at`, `projects.deleted_at` (ISO timestamp)
- NestJS dekoratörleri: `@Delete()`, `@UseGuards`, `@Roles('Admin', 'Member')`
- Guard’lar: `SupabaseAuthGuard`, `WorkspaceRoleGuard`
- Supabase sorgu kalıpları: `.is('deleted_at', null)`, `.update({ deleted_at: new Date().toISOString() })`

**Nasıl Çalışıyor? (İş Akışı):**

1. İstemci `DELETE /workspaces/:workspaceId/tasks/:id` (veya projects eşdeğeri) çağırır.
2. Auth + Role Guard zinciri (`Admin`/`Member`) isteği doğrular.
3. Servis **hard delete** yerine ilgili satırda `deleted_at` alanını günceller; yalnızca henüz silinmemiş kayıtlar (`deleted_at IS NULL`) güncellenir.
4. Kayıt bulunamazsa `404 NotFoundException`.
5. Sonraki `findAll` sorguları `.is('deleted_at', null)` filtresiyle arşivlenmiş kayıtları sonuç kümesinden dışlar.
6. Admin istatistikleri de aktif görev/proje sayarken aynı soft-delete filtresini kullanır.

**Kapsam dışı (hard delete):** `notes`, `files`, `progress_reports`, `workspace_members` (üye çıkarma) kayıtları şu an fiziksel silme ile yönetilir.

**Kod Sorumluları:**
- `backend/src/task/task.service.ts` (`remove`, `findAll`)
- `backend/src/project/project.service.ts` (`remove`, `findAll`)
- `backend/src/admin/admin.service.ts` (aktif sayım filtreleri)
- `backend/src/task/task.controller.ts`
- `backend/src/project/project.controller.ts`

---

### [Görevler ve Alt Görevler (Subtasks) İlişkisi]

**Amacı:**  
Büyük işleri parçalayabilmek için görevler arasında üst–alt (parent–child) ilişkisi kurmak. Bir görev `parent_task_id` ile başka bir göreve bağlanarak alt görev haline gelir; filtreleme ile belirli bir üst görevin çocukları listelenebilir.

**Kullanılan Teknolojiler & Bileşenler:**
- Tablolar / kolonlar: `tasks.parent_task_id` (UUID, opsiyonel self-reference)
- NestJS dekoratörleri: `@IsUUID()`, `@IsOptional()`, `@ApiPropertyOptional`, `@Query()`
- DTO’lar: `CreateTaskDto.parent_task_id`, `UpdateTaskDto` (PartialType), `GetTasksFilterDto.parent_task_id`
- Guard’lar: Task mutasyonlarında `SupabaseAuthGuard` + `WorkspaceRoleGuard` + `@Roles('Admin', 'Member')`

**Nasıl Çalışıyor? (İş Akışı):**

1. İstemci alt görev oluştururken `POST .../tasks` gövdesinde `parent_task_id` gönderir.
2. ValidationPipe UUID formatını doğrular.
3. `TaskService.create`, alanı `tasks` satırına yazar (`workspace_id` ile aynı tenant altında).
4. Listeleme sırasında `GET .../tasks?parent_task_id=<uuid>` ile yalnızca o üst görevin çocukları çekilir (`eq('parent_task_id', ...)`).
5. Güncellemede `PATCH` ile üst görev ilişkisi değiştirilebilir veya PartialType sayesinde diğer alanlarla birlikte taşınabilir.

**Kod Sorumluları:**
- `backend/src/task/dto/create-task.dto.ts`
- `backend/src/task/dto/get-tasks-filter.dto.ts`
- `backend/src/task/dto/update-task.dto.ts`
- `backend/src/task/task.service.ts`
- `backend/src/task/task.controller.ts`

---

### [Dosya Yönetimi (File Association) & Supabase Storage]

**Amacı:**  
Görevlere belge/ek iliştirmek. Sistem iki tamamlayıcı yol sunar: (1) ikili dosyanın Supabase Storage’a yüklenmesi ve public URL üretilmesi, (2) URL’nin ya `files` tablosuna metadata olarak kaydedilmesi ya da doğrudan `tasks.file_url` alanına bağlanması.

**Kullanılan Teknolojiler & Bileşenler:**
- Kütüphaneler: `multer`, `@nestjs/platform-express` (`FileInterceptor`, `memoryStorage`), `@supabase/supabase-js` Storage API
- Storage: bucket `uploads`; path `{workspaceId}/{taskId}/{timestamp}-{safeName}`
- Tablolar: `files` (`file_name`, `file_url`, `file_type`, `task_id`, `user_id`), `tasks.file_url`
- NestJS dekoratörleri: `@Post('upload')`, `@UploadedFile()`, `@UseInterceptors(FileInterceptor(...))`, `@IsUrl()`, `@IsString()`, `@IsOptional()`
- Guard’lar: `SupabaseAuthGuard`, `WorkspaceRoleGuard`, `@Roles('Admin', 'Member')` (mutasyon)
- DTO’lar: `CreateFileDto`, `CreateTaskDto.file_url` / `UpdateTaskDto.file_url`

**Nasıl Çalışıyor? (İş Akışı):**

**Yol A — Storage yükleme**
1. `POST /workspaces/:workspaceId/tasks/:taskId/files/upload` (multipart `file`).
2. Guard zinciri yetkiyi doğrular.
3. Multer dosyayı bellek buffer’ına alır.
4. `FileService.upload` güvenli dosya adı üretir, `SupabaseService.uploadFile` ile `uploads` bucket’ına yükler, `getPublicUrl` ile URL döner.
5. Yanıt: `{ url, file_name, file_type, path }` — istemci isterse bunu metadata veya `file_url` olarak kaydeder.

**Yol B — Metadata kaydı**
1. `POST .../files` + `CreateFileDto` → `files` tablosuna satır eklenir.

**Yol C — Görev alanına bağlama**
1. Task create/update gövdesinde opsiyonel `file_url` gönderilir.
2. `TaskService` alanı `tasks.file_url` kolonuna yazar.

**Kod Sorumluları:**
- `backend/src/file/file.controller.ts`
- `backend/src/file/file.service.ts`
- `backend/src/file/dto/create-file.dto.ts`
- `backend/src/supabase/supabase.service.ts` (`uploadFile`)
- `backend/src/task/dto/create-task.dto.ts`
- `backend/src/task/task.service.ts`

---

### [Admin İstatistik & Yönetim Paneli]

**Amacı:**  
Workspace yöneticilerine operasyonel görünürlük ve üyelik yönetimi sağlamak. Toplam kullanıcı, aktif görev ve proje sayılarını tek uç noktadan almak; istenmeyen üyeyi çalışma alanından çıkarmak.

**Kullanılan Teknolojiler & Bileşenler:**
- Tablolar: `workspace_members`, `tasks`, `projects`
- NestJS dekoratörleri: `@Controller('workspaces/:workspaceId/admin')`, `@Get('stats')`, `@Delete('users/:userId/remove')`, sınıf seviyesinde `@Roles('Admin')`, `@ApiTags('Admin')`, `@ApiBearerAuth`
- Guard’lar: `SupabaseAuthGuard`, `WorkspaceRoleGuard` (yalnızca Admin geçer)
- Servis: `AdminService.getStats`, `AdminService.removeUser`

**Nasıl Çalışıyor? (İş Akışı):**

**İstatistik — `GET /workspaces/:workspaceId/admin/stats`**
1. JWT doğrulanır; kullanıcının workspace rolü `Admin` değilse `403`.
2. `AdminService.getStats` üç sayımı `Promise.all` ile paralel çalıştırır:
   - `workspace_members` → `totalUsers`
   - `tasks` where `deleted_at IS NULL` AND `status != 'DONE'` → `activeTasks`
   - `projects` where `deleted_at IS NULL` → `totalProjects`
3. JSON yanıt: `{ totalUsers, activeTasks, totalProjects }`.

**Üye çıkarma — `DELETE /workspaces/:workspaceId/admin/users/:userId/remove`**
1. Aynı Admin guard zinciri.
2. `workspace_members` üzerinde `(workspace_id, user_id)` eşleşmesi silinir (hard delete).
3. Kayıt yoksa `404`; başarıda bilgilendirme mesajı döner.

**Not:** Yol, workspace bağlamını korumak için `/workspaces/:workspaceId/admin/...` biçimindedir; `WorkspaceRoleGuard` parametre olarak `workspaceId` bekler.

**Kod Sorumluları:**
- `backend/src/admin/admin.controller.ts`
- `backend/src/admin/admin.service.ts`
- `backend/src/admin/admin.module.ts`
- `backend/src/auth/guards/workspace-role.guard.ts`

---

### [SQL İndeksleri ve Veritabanı Optimizasyonu]

**Amacı:**  
Yoğun filtreleme, üyelik kontrolü, soft-delete ve sayfalama senaryolarında sorgu gecikmesini düşük tutmak; API katmanında Redis cache ve PostgreSQL RPC ile okuma yükünü dengelemek.

**Kullanılan Teknolojiler & Bileşenler:**
- PostgreSQL (Supabase) — şema/indeks DDL’i depoda yoktur; optimizasyon stratejisi **kodun sorgu kalıplarından** türetilir
- Redis cache: `@nestjs/cache-manager`, `cache-manager-redis-yet` (projeler listesi, TTL 60 sn)
- RPC: `get_workspace_statistics(p_workspace_id)` — ağır istatistiklerin veritabanı tarafında toplanması
- Soft-delete filtreleri: `deleted_at IS NULL`
- Sayfalama: Supabase `.range(from, to)` + `count: 'exact'`

**Nasıl Çalışıyor? (İş Akışı) / Optimizasyon Mantığı:**

1. **Guard sıcak yolu:** Her rol kontrolünde `workspace_members(workspace_id, user_id)` sorgulanır → bileşik indeks olmadan ölçeklenme riski yüksektir.
2. **Liste sorguları:** `tasks` üzerinde `workspace_id` + `deleted_at` + opsiyonel `status`/`priority`/`assignee_id`/`parent_task_id` filtreleri ve `title` için `ilike` araması çalışır.
3. **Önbellek:** Sık okunan `GET .../projects` yanıtı Redis’te 60 saniye tutulur; tekrarlayan okumalar PostgreSQL’e gitmez.
4. **RPC:** Dashboard istatistikleri uygulama katmanında N+1 sayım yapmak yerine tek RPC çağrısıyla alınır.
5. **Admin sayımları:** `head: true` + `count: 'exact'` ile yalnızca sayım maliyeti ödenir, satır payload’ı çekilmez.

**Kodun sorgu kalıplarına göre önerilen / beklenen indeks seti:**

| Hedef | Gerekçe |
|-------|---------|
| `workspace_members (workspace_id, user_id)` UNIQUE/COMPOSITE | Role Guard ve üyelik doğrulama sıcak yolu |
| `tasks (workspace_id, deleted_at)` | Soft-delete’li listeleme |
| `tasks (workspace_id, status)` / `(assignee_id)` / `(parent_task_id)` | Filtre ve alt görev sorguları |
| `projects (workspace_id, deleted_at)` | Aktif proje listesi ve admin sayımı |
| `notifications (user_id, created_at DESC)` | Kullanıcı bildirim akışı |
| `activity_logs (workspace_id, created_at DESC)` | Aktivite zaman çizelgesi |
| `comments (task_id, created_at)` | Görev yorum listesi |
| `files (task_id)` | Görev dosya listesi |

Depoda `*.sql` / migration dosyası bulunmadığı için bu indekslerin Supabase konsolunda veya harici migration sürecinde yönetildiği varsayılır; rapor, uygulama davranışına dayalı **performans tasarımını** belgeler.

**Kod Sorumluları:**
- `backend/src/auth/guards/workspace-role.guard.ts`
- `backend/src/task/task.service.ts`
- `backend/src/project/project.controller.ts` (Redis cache)
- `backend/src/dashboard/dashboard.service.ts` (RPC)
- `backend/src/admin/admin.service.ts`
- `backend/src/app.module.ts` (`CacheModule.registerAsync`)

---

### [Swagger (OpenAPI) Dokümantasyon Altyapısı]

**Amacı:**  
API sözleşmesini insan ve makine tarafından okunabilir hale getirmek; geliştirme, entegrasyon ve manuel test süreçlerinde endpoint keşfini hızlandırmak. Staj projesi bağlamında canlı dokümantasyon, backend’in tek “vitrin” arayüzü olarak da işlev görür.

**Kullanılan Teknolojiler & Bileşenler:**
- Kütüphaneler: `@nestjs/swagger`, `swagger-ui-express`
- Bootstrap: `DocumentBuilder`, `SwaggerModule.createDocument`, `SwaggerModule.setup('api', ...)`
- Dekoratörler: `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`, `@ApiProperty`, `@ApiPropertyOptional`
- Global validasyon: `ValidationPipe({ whitelist: true, transform: true })` — DTO alanları hem runtime’da hem OpenAPI şemasında yansır
- Güvenlik başlıkları: `helmet()`; CORS: `enableCors({ origin: true, credentials: true })`

**Nasıl Çalışıyor? (İş Akışı):**

1. Uygulama `main.ts` içinde ayağa kalkar.
2. Helmet ve CORS ara katmanları kaydedilir.
3. Global ValidationPipe etkinleştirilir.
4. `DocumentBuilder` ile başlık (`staj-projesi API`), açıklama ve sürüm (`1.0`) tanımlanır.
5. Nest, tüm controller/DTO dekoratörlerini tarayarak OpenAPI dokümanını üretir.
6. UI `http(s)://<host>:<port>/api` adresinde yayınlanır.
7. Geliştirici / testçi Bearer token’ı Swagger UI üzerinden ekleyerek korumalı uçları doğrudan deneyebilir.

**Kod Sorumluları:**
- `backend/src/main.ts`
- Tüm `*.controller.ts` ve `dto/*.ts` dosyalarındaki `@Api*` dekoratörleri
- `backend/package.json` (`@nestjs/swagger`, `swagger-ui-express`)

---

## 4. Destekleyici Özellikler (Özet)

Raporun zorunlu özellik listesine ek olarak sistemde şu modüller de aktiftir:

| Özellik | Özet | Kritik Dosyalar |
|---------|------|-----------------|
| **Activity Log** | Workspace aksiyonlarının manuel kaydı/listesi | `activity-log/*` |
| **Comments** | Görev yorumları + profil yazarı | `comment/*` |
| **Notes & Personal Dashboard** | Kişisel not CRUD + `dashboard/me` agregasyonu | `note/*` |
| **Progress Reports** | DAILY/WEEKLY/MONTHLY raporlar + sayfalama | `progress-report/*` |
| **Statistical Dashboard** | RPC `get_workspace_statistics` | `dashboard/*` |
| **Healthcheck** | Public `GET /health` | `health/health.controller.ts` |
| **Redis Caching** | Global cache; projeler listesi 60 sn | `app.module.ts`, `project.controller.ts` |

---

## 5. Uç Nokta Haritası (HTTP)

| Metot | Yol | Yetki özeti |
|-------|-----|-------------|
| GET | `/` | Public |
| GET | `/health` | Public |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Public / token |
| POST/GET | `/workspace` | Auth |
| POST | `/workspace/:id/invite` | Admin |
| POST/GET/DELETE | `/workspaces/:workspaceId/projects` | Mutasyon: Admin/Member |
| POST/GET/PATCH/DELETE | `/workspaces/:workspaceId/tasks` | Mutasyon: Admin/Member |
| POST/GET | `.../tasks/:taskId/comments` | Mutasyon: Admin/Member |
| POST/GET/DELETE | `.../tasks/:taskId/files` (+ `/upload`) | Mutasyon: Admin/Member |
| POST/GET | `.../activity-logs` | Admin/Member |
| CRUD + `dashboard/me` | `.../notes` | Auth |
| POST/GET/DELETE | `.../progress-reports` | Auth |
| GET | `.../statistics` | Auth |
| GET | `.../admin/stats` | Admin |
| DELETE | `.../admin/users/:userId/remove` | Admin |
| WS | Socket.IO `user_{id}` → `notification` / `notification_read` | Handshake `userId` |
| UI | `/api` | Swagger |

---

## 6. Altyapı ve Çalıştırma

| Bileşen | Detay |
|---------|--------|
| Docker Compose | `api` (NestJS build) + `redis:alpine` |
| Ortam değişkenleri | `SUPABASE_URL`, `SUPABASE_KEY`, `PORT`, `REDIS_URL` (uygulama), `REDIS_HOST`/`REDIS_PORT` (compose) |
| Başlatma | `docker-compose up --build -d` veya `npm run start:dev` |
| Derleme | `npm run build` → `dist/main` |

---

## 7. Mimari Değerlendirme ve Gözlemler

1. **Katmanlı güvenlik:** JWT doğrulama ile rol denetiminin ayrılması doğru bir ayrıştırmadır; mutasyon uçlarında Role Enforcement bilinçli şekilde sıkılaştırılmıştır.
2. **Soft delete tutarlılığı:** Task/Project’te uygulanmış; diğer entity’lerde hard delete devam etmektedir — domain ihtiyacına göre genişletilebilir.
3. **Bildirim altyapısı hazır:** Gateway + Service mevcuttur; domain olaylarından (ör. görev atama) otomatik tetikleme entegrasyonu bir sonraki adım olarak konumlanabilir.
4. **Şema yönetimi:** DDL’in depoda olmaması ortamlar arası tekrarlanabilirliği zorlaştırır; ileride Supabase migrations veya SQL dosyalarının versiyonlanması önerilir.
5. **Önbellek kapsamı:** Şu an yalnızca proje listesi cache’lenir; okuma ağırlıklı diğer listeler için benzer strateji değerlendirilebilir.
6. **Role Guard semantiği:** `@Roles` olmayan uçlarda üyelik kontrolü atlanır; “workspace üyesi olmayan JWT sahibi” senaryosu için guard davranışının sıkılaştırılması güvenlik sertleştirmesi olarak düşünülebilir.

---

## 8. Sonuç

`staj-projesi` backend’i; Supabase kimlik doğrulaması, workspace-merkezli RBAC, hiyerarşik iş yönetimi, soft delete, dosya/storage entegrasyonu, admin operasyonları, Redis önbellekleme ve Socket.IO bildirimleri ile uçtan uca tutarlı bir NestJS mimarisi sergilemektedir. Bu rapor, kod tabanının mevcut durumunun mimari fotoğrafıdır ve hem staj değerlendirmesi hem de sonraki geliştirme planlaması için referans doküman olarak kullanılabilir.

---

*Bu belge, `backend/src` kaynak kodunun ve proje kökündeki Docker/PROGRESS dokümanlarının statik analiziyle üretilmiştir. Fiziksel PostgreSQL DDL’si Supabase tarafında tutulduğundan tablo/kolon listesi uygulama kullanımından çıkarılmıştır.*
