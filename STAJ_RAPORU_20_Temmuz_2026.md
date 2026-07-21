# STAJ DEFTERİ GÜNLÜK RAPORU

**Tarih:** 20 Temmuz 2026  
**Proje:** İş Yönetim Sistemi (Workspace App)  
**Faz:** Faz 6–7 — RLS düzeltmeleri, Workspace yönetimi, Kanban ve Task Detail UI

---

## 1. Günün Özeti

Bugün staj kapsamında, dünden kalan Server Action / RLS sorunlarının kalıcı çözümü ile ürün arayüzünün genişletilmesine odaklanılmıştır. `workspace_members`, `projects`, `tasks` ve `workspaces` tablolarında Row Level Security (RLS) INSERT/SELECT politikaları SQL migration’larla netleştirilmiş; Server Action payload’larında sahiplik alanları (`owner_id`, `user_id`, `created_by`) `auth.uid()` ile hizalanmıştır. Frontend tarafında Workspace switcher (Sidebar DropdownMenu) ve Create Workspace Modal eklenmiş; Kanban board üzerinde görev kartlarına tıklanınca açılan Task Detail Sheet (slide-over) geliştirilmiştir. Ayrıca `workspaces.updated_at` şema değişikliği tiplere işlenmiş, aktif workspace cookie senkronu ile proje listesi filtrelemesi düzeltilerek backend–frontend veri görünürlüğü iyileştirilmiştir. Gün sonunda PROGRESS.md final özeti yazılmış ve değişiklikler GitHub’a gönderilmiştir.

---

## 2. Kullanılan Teknolojiler ve Terimler

- **Supabase RLS (Row Level Security):** PostgreSQL satır bazlı erişim kontrolü. Bugün özellikle `WITH CHECK (owner_id = auth.uid())` ve `user_id` / `created_by` + workspace üyeliği kontrolleri üzerinde çalışılmıştır.

- **Server Action (`"use server"`):** Next.js sunucu fonksiyonları. `createProject`, `createTask`, `createWorkspace`, `getWorkspaces`, `getTaskDetails` JWT’li anon istemci ile Supabase’e yazıp/okur; hatalarda düz `{ success, error }` JSON döner.

- **Shadcn/UI Sheet & Dialog:** Task Detail için sağdan açılan Sheet (slide-over); Workspace ve görev oluşturma için Dialog formları.

- **DropdownMenu (Workspace Switcher):** Sidebar üstünde kullanıcının üye olduğu workspace’leri listeler; aktif alan vurgulanır; “Create New Workspace” ile modal açılır.

- **DESIGN.md / Linear × Notion:** Tipografi, kart ve Kanban düzeni için tasarım rehberi. Ürün teması global olarak siyah–turuncu (`forcedTheme="dark"`, `--primary: 24 100% 50%`) sabitlenmiştir.

- **Cookie senkronu (`active_workspace_id`):** Aktif workspace hem `localStorage` hem cookie’de tutulur; Server Action / RSC tarafı proje oluşturma ve listeleme sırasında bu tercihi kullanır.

---

## 3. Geliştirme Süreci

### 3.1. RLS ve Server Action Payload Düzeltmeleri

Önceki günden kalan “unexpected server response” ve RLS INSERT ihlalleri giderilmiştir:

1. **workspace_members:** `user_id = auth.uid()` INSERT politikası + owner bootstrap (`fix_workspace_members_rls.sql`).
2. **projects:** Sahiplik sütunu `user_id` / `created_by` ile hizalandı; `fix_projects_rls.sql` (`is_workspace_member` + WITH CHECK).
3. **tasks:** `project_id` zorunlu; `created_by` / `user_id` = `auth.uid()`; workspace üyeliği kontrolü.
4. **workspaces:** INSERT’te kesin `owner_id: auth.uid()`; Nest API de kullanıcı JWT’si ile RLS’ye uygun istemci kullanacak şekilde güncellendi (`fix_workspaces_rls.sql`).
5. Tüm Server Action’larda try/catch içinde serileştirilebilir `{ success: false, error: "..." }` dönüş sözleşmesi korunmuştur.

### 3.2. Workspace Yönetim Arayüzü

Sidebar’ın en üstüne Shadcn DropdownMenu ile workspace switcher eklenmiştir. Liste `getWorkspaces` Server Action (Supabase `workspace_members` + `workspaces` join) üzerinden gelir. Modal ile yeni workspace oluşturulur (`createWorkspace`); başarıda `upsertWorkspace` ile anlık state güncellenir, aktif workspace cookie’ye yazılır. Backend `POST/GET /workspace` uçları da aynı JWT + `owner_id` modeline çekilmiştir.

### 3.3. Kanban ve Task Detail Slide-over

Proje detay sayfasında TODO / IN_PROGRESS / DONE kolonları (`ProjectTaskBoard`) çalışır durumdadır. Kart tıklanınca `TaskDetailSheet` açılır; `getTaskDetails(taskId)` ile görev çekilir. Panelde Linear tarzı status/priority rozetleri, düzenlenebilir description textarea, checklist iskeleti ve yerel yorum alanı yer alır. CRUD kalıcılığı sonraki iterasyona bırakılmıştır.

### 3.4. Şema Sync ve Veri Görünürlüğü

`workspaces` tablosuna eklenen `updated_at` sütunu `types.ts` (`Workspace` / `WorkspaceListItem`) ve select ifadelerine işlenmiştir. `getCurrentUserProjects` aktif workspace cookie’sine göre `workspace_id` filtreler; `createProject` tercih edilen workspace’e yazar. Böylece switcher ile seçilen alanın projeleri frontend’de doğru görünür.

### 3.5. Dokümantasyon

`PROGRESS.md` içinde Faz 6 (İleri Düzey Kurumsal Özellikler) tamamlandı işaretlenmiş; 20 Temmuz günlük özet logu eklenmiştir. Günlük commit’ler GitHub `main` dalına push edilmiştir.

---

## 4. Karşılaşılan Sorunlar ve Çözümler

| Sorun | Durum | Açıklama |
|--------|--------|---------|
| Server Action “unexpected response” | Çözüldü | Düz JSON dönüş + `NEXT_REDIRECT` yeniden fırlatma |
| `workspace_members` RLS INSERT | Çözüldü | `user_id = auth.uid()` politikası + bootstrap |
| `projects` RLS / `owner_id` vs `user_id` | Çözüldü | Payload ve SQL `user_id` / `created_by` ile uyumlu |
| `tasks` RLS INSERT | Çözüldü | `project_id` + `created_by`/`user_id` + üyelik kontrolü |
| `workspaces` RLS INSERT | Çözüldü | JWT’li istemci + `owner_id: auth.uid()` |
| `updated_at` eksikliği / liste boş görünmesi | Çözüldü | Şema tipi + aktif workspace cookie filtreleme |
| Light/slate vs marka teması | İyileştirildi | Global siyah–turuncu (`forcedTheme="dark"`) |

---

## 5. Gün Sonu Değerlendirmesi

Bugün hem güvenlik modeli (RLS + auth.uid() payload) hem de kullanıcıya dönük özellikler (workspace switcher, Kanban detail sheet) somut şekilde tamamlanmıştır. Frontend–Supabase veri akışı netleşmiş; staj defteri / PROGRESS dokümantasyonu güncellenerek gün “final” hale getirilmiştir. Kalan işler daha çok Task Detail içindeki checklist/yorum kalıcı CRUD’u ve Faz 7’nin kalan UI cilasıdır.

---

## 6. Yarınki Plan

1. Task Detail Sheet’te description / checklist / comments için kalıcı kaydetme (Server Action + RLS)  
2. Workspace davet / üye yönetimi UI’sine başlamak (varsa backend invitation uçları)  
3. Dashboard istatistiklerinin aktif workspace’e göre doğrulanması  
4. Mobil (Flutter) fazına geçiş öncesi web akışının uçtan uca smoke testi  
5. Staj defteri çıktısının (PDF/yazdırma) kontrolü

---

*Bu rapor staj defteri için hazırlanmış olup yerel dosya olarak kaydedilmiştir.*
