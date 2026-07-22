# STAJ DEFTERİ GÜNLÜK RAPORU

**Tarih:** 21 Temmuz 2026  
**Proje:** İş Yönetim Sistemi (Workspace App)  
**Faz:** Faz 6–7 — Workspace onboarding, RBAC, görev atama, davet/bildirim ve Kanban UX

---

## 1. Günün Özeti

Bugün staj kapsamında, ürünün workspace yaşam döngüsü ve çok kullanıcılı kullanım senaryoları olgunlaştırılmıştır. Auth / şema sync hataları giderilmiş; workspace switcher, `workspace_id` zorunluluğu, çerez kalıcılığı ve workspace silme akışı tamamlanmıştır. Görev tarafında durum güncelleme, Task Detail (subtask/yorum), assignee atama ve Kanban kartlarında atanan kişi rozeti entegre edilmiştir. RBAC workspace bazlı hale getirilmiş (kendi alaninda Admin, davette Member); davet zorunlu engelleme kaldırılıp Onboarding ekranı eklenmiştir. Girişte varsayılan Admin workspace yönlendirmesi, kayıt sonrası anlık oturum güncellemesi ve davet–bildirim–kabul akışı bağlanmıştır. Gün sonunda PROGRESS.md ve günlük rapor güncellenerek değişiklikler GitHub’a gönderilmiştir.

---

## 2. Kullanılan Teknolojiler ve Terimler

- **Workspace-scoped RBAC:** Roller kullanıcının geneline değil, seçili `activeWorkspace` üyeliğine bağlıdır. `resolveWorkspaceRole` / `isAdminRole` ile OWNER–Admin yönetim, Member ise assignee bazlı izole görünürlük alır.

- **Onboarding:** Workspace’i olmayan kullanıcının `/onboarding` üzerinden ilk çalışma alanını oluşturduğu akıştır. Davet beklemeye zorlayan `/unauthorized` lock-out kaldırılmış / onboarding’e yönlendirilmiştir.

- **Assignee (`assignee_id`):** Görevin atandığı kullanıcı. `getWorkspaceMembers` + `profiles` (full_name, email, avatar_url) ile dropdown ve Kanban rozeti beslenir; jenerik “Üye” etiketi kullanılmaz.

- **Server Action + Cookie senkronu:** `createWorkspace`, `getWorkspaces`, `acceptInvitation`, `resolvePostLoginRedirect` gibi aksiyonlar JWT cookie ile çalışır; aktif workspace `localStorage` + `active_workspace_id` cookie + URL `workspaceId` ile tutulur.

- **Davet / Bildirim:** `workspace_invitations` PENDING kayıtları + isteğe bağlı `notifications` tablosu. Header’daki bildirim menüsünden davet kabul edilince `workspace_members`’a üye eklenir.

- **normalizeTaskStatus / Priority:** DB’den gelen farklı yazımları kanonik `TODO` / `IN_PROGRESS` / `DONE` ve `LOW` / `MEDIUM` / `HIGH` değerlerine çeviren helper’lar; `ReferenceError` önlemek için `server.ts` içinde tanımlanmıştır.

---

## 3. Geliştirme Süreci

### 3.1. Auth, Şema Sync ve Stabilite

Auth bağlantı hataları (port / exception) giderilmiş; `projects.updated_at` eksikliği ve `getCurrentUserProjects` sorgusu düzeltilmiştir. `active-workspace.ts` içindeki server-only `next/headers` bağımlılığı kaldırılarak Client/Server ayrımı netleştirilmiş ve build hatası çözülmüştür. `normalizeTaskStatus` / `normalizeTaskPriority` eklenerek görev listeleme sırasındaki `ReferenceError` giderilmiştir.

### 3.2. Workspace Yönetimi

Workspace switcher ile geçişte proje/görev filtrelemesi dinamikleştirilmiştir. `createProject` için `workspace_id` zorunlu kılınmış; `projects`–workspace ilişkisi ve çerez kalıcılığı sağlanmıştır. `getWorkspaces` aktif filtre yüzünden listenin kaybolması hatası giderilmiş; `createWorkspace` üyelik ataması (OWNER/Admin) sağlamlaştırılmıştır. `deleteWorkspace` ve UI onay modalı eklenmiştir.

### 3.3. Görev, Kanban ve Task Detail

Durum geçişleri (`TODO` → `IN_PROGRESS` → `DONE`) ve `updateTaskStatus` enum senkronu tamamlanmıştır. `TaskDetailSheet` üzerinden düzenleme, alt görev ve yorum entegre edilmiştir. Assignee atama UI’ı eklenmiş; Kanban kartında Assignee rozeti sağ üste taşınmış; dropdown’da Ad Soyad / e-posta formatı kullanılmıştır.

### 3.4. RBAC, Davet ve Görünürlük

Admin Overview paneli, davet sistemi ve Member kısıtları (proje oluşturamama, assignee bazlı proje/görev görünürlüğü) getirilmiştir. `getProjects` atanmış görevleri içeren projeleri de kapsayacak şekilde genişletilmiştir. Davet bildirim menüsü ve kabul sonrası üye listesinde görünürlük bağlanmıştır.

### 3.5. Onboarding ve Yönlendirme

Davet-only engel kaldırılmış; workspace’siz kullanıcı Onboarding’e yönlendirilmiştir. Login’de Admin olduğu varsayılan workspace seçilir; kayıt sonrası otomatik login + hard navigate ile çıkış gerekmeden workspace oluşturma / dashboard’a geçiş sağlanmıştır.

### 3.6. Dokümantasyon

`PROGRESS.md` 21 Temmuz maddeleri güncellenmiş; günlük staj raporu yazılmış; ilgili commit’ler `main` dalına push edilmiştir. Bildirim tablosu için `fix_notifications_invite.sql` migration dosyası eklenmiştir.

---

## 4. Karşılaşılan Sorunlar ve Çözümler

| Sorun | Durum | Açıklama |
|--------|--------|---------|
| `normalizeTaskStatus is not defined` | Çözüldü | Helper’lar `server.ts` içinde tanımlandı |
| Davet zorunlu lock-out (`/unauthorized`) | Çözüldü | Onboarding + kendi workspace oluşturma |
| Workspace listesinin kaybolması | Çözüldü | `getWorkspaces` tüm üyelikleri döner; aktif filtre listeden ayrıldı |
| Assignee dropdown’da “Üye” | Çözüldü | `full_name` / e-posta etiket formatı |
| Kayıt sonrası çıkış–giriş ihtiyacı | Çözüldü | Otomatik login + hard navigate / cookie |
| Member’ın tüm projeleri görmesi | Çözüldü | Assignee bazlı görünürlük + `getProjects` genişletmesi |
| Görev durumu güncellenememe | Çözüldü | Enum / `updateTaskStatus` senkronu |

---

## 5. Gün Sonu Değerlendirmesi

Bugün sistem; workspace kurma–yönetme, workspace-scoped roller, görev atama/Kanban görünürlüğü ve davet–kabul döngüsüyle çok kullanıcılı bir iş yönetimi akışına kavuşmuştur. Auth/onboarding sürtünmesi azaltılmış; UI’da atanan kişi bilgisi okunabilir hale getirilmiştir. Kalan işler daha çok bildirim altyapısının üretim ortamında SQL migration doğrulaması ve mobil fazına geçiş öncesi uçtan uca smoke testidir.

---

## 6. Yarınki Plan

1. `fix_notifications_invite.sql` migration’ının Supabase’te uygulanıp doğrulanması  
2. Davet / bildirim UI’sinin uçtan uca smoke testi (Admin davet → Member kabul → üye listesi)  
3. Assignee ve Member görünürlük senaryolarının ek testleri  
4. Dashboard istatistiklerinin aktif workspace’e göre gözden geçirilmesi  
5. Mobil (Flutter) fazına geçiş öncesi web akışının son kontrolü  
6. Staj defteri çıktısının (PDF/yazdırma) kontrolü

---

*Bu rapor staj defteri için hazırlanmış olup yerel dosya olarak kaydedilmiştir.*
