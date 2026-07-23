# STAJ DEFTERİ GÜNLÜK RAPORU

**Tarih:** 22 Temmuz 2026  
**Proje:** İş Yönetim Sistemi (Workspace App)  
**Faz:** Faz 6–7 — Profil/isim, silme+RLS, Kanban filtre, Light Mode, performans, yorum/ek, bildirim & davet

---

## 1. Günün Özeti

Bugün staj kapsamında ürünün hem “görünen kimlik” hem de operasyon/iletişim katmanı yoğun şekilde olgunlaştırılmıştır. Sabah tarafında login hata ayrımı ve arayüzde sabit kalan “Kullanıcı Yükleniyor...” / boş ad sorunları kök nedeniyle (`profiles` select) giderilmiş; ardından Proje/Görev silme (onay modalı, cascade, DELETE RLS) eklenmiştir. Kanban’da varsayılan öncelik sıralaması ve kolon başlığı filtreleri getirilmiş; global Açık Mod (Light Mode) ile tema geçişi düzgün çalışır hale getirilmiş, keskin stil yalnızca light’a sınırlanmıştır. Öğleden sonra sayfa/modal yavaşlığı lazy mounting, memoization, `Promise.all` ve istemci cache ile iyileştirilmiş; görev detayına yorumlar ve dosya ekleri (Supabase Storage) bağlanmıştır. Gün sonunda gerçek zamanlı bildirim zili (Realtime + Toast) ve workspace davet kabul/reddetme akışı tamamlanmış; `PROGRESS.md` ile günlük geliştirmeler kayıt altına alınmıştır. *(Bu staj raporu yerel dosya olarak kaydedilmiştir; push edilmemiştir.)*

---

## 2. Kullanılan Teknolojiler ve Terimler

- **`loadProfilesByIds` / `formatPersonName`:** Yalnızca mevcut `profiles` kolonlarını (`id, email, full_name, avatar_url` …) çeker; “Kullanıcı Yükleniyor...” gibi placeholder’ları filtreler. Ad → e-posta → `@` öncesi sırası.

- **Soft / Hard Delete + DELETE RLS:** Silmede önce `deleted_at` (soft), gerekirse hard delete. `fix_projects_delete_rls.sql` ile Admin/sahip `DELETE` politikası; proje silinirken bağlı görevler de temizlenir.

- **Kanban kolon prefs (`useMemo`):** Kolon bazlı sort (`priority_desc` …) ve öncelik filtresi; varsayılan Yüksek → Düşük.

- **ThemeProvider + Tailwind `dark` variant:** Açık / Koyu / Sistem. Light’ta keskin border ve doygun rozetler; dark’ta önceki yumuşak stil korunur.

- **Lazy mounting & optimistic UI:** Kapalı modal/sheet DOM’a mount edilmez; kart tıklanınca sheet anında açılır, seed + skeleton ile veri beklenir. `React.memo` / `useCallback` / `client-cache`.

- **`task_comments` / `task_attachments` + Storage:** Yorumlar profil join’li; dosyalar `task-attachments` bucket’ına Server Action ile yüklenir, metadata tabloda tutulur.

- **Notification Bell + Realtime:** `notifications` INSERT dinlenir; toast + rozet + liste güncellenir. Davet tipi `workspace_invite`; Kabul → `workspace_members` + yönlendirme, Reddet → `rejected`.

---

## 3. Geliştirme Süreci

### 3.1. Login Hata Ayrımı ve Profil İsimleri

Girişte yalnızca auth login başarısızlığında “şifre/e-posta hatalı” gösterilir; post-login yönlendirme hataları ayrılmıştır. Header, Kanban assignee, üye tablosu ve dropdown’larda gerçek Ad Soyad / e-posta bağlanmıştır. Kök neden: olmayan `display_name` sütununun select’i düşürmesi → `loadProfilesByIds` + `fix_profiles_select_and_placeholders.sql`.

### 3.2. Proje ve Görev Silme (Cascade & RLS)

Kanban ⋯ menüsü ve `TaskDetailSheet` üzerinden görev silme; proje detayında Admin “Projeyi Sil”. Onay modalı + Toast. RLS DELETE eksikliği ve 0 satır dönmesi `fix_projects_delete_rls.sql` ve sıralı hard delete + satır doğrulamasıyla çözülmüştür; başarıda dashboard’a yönlendirme yapılmıştır.

### 3.3. Kanban Öncelik Sıralama / Filtre

Görevler varsayılan Yüksek → Düşük. Kolon header’da ⇅ menüsü ile öncelik ve tarih sıralaması / öncelik filtresi eklenmiştir.

### 3.4. Global Tema ve Light Mode

Beyaz–Mavi–Turuncu Açık Mod; Ayarlar’dan tema seçimi. Hardcoded koyu sınıflar temizlenmiş; tema geçişinin çalışmaması Tailwind darkMode / ThemeProvider / CSS değişkenleriyle düzeltilmiştir. Keskin kenarlık ve zengin renkler yalnızca Light Mode’a scope edilmiştir.

### 3.5. Performans Optimizasyonları

Proje detayında paralel fetch (`Promise.all`); `TaskDetailSheet` / `CreateTaskModal` lazy mount; kart seed ile anında açılış; Kanban `TaskCard` / kolon memoization; daraltılmış select ve kısa TTL istemci cache.

### 3.6. Görev Yorumları ve Dosya Ekleri

`TaskComments`: avatar, ad, göreli zaman (“5 dakika önce”), Yorum Yap, kendi yorumunu sil. `TaskAttachments`: dropzone / dosya seç, yükleme durumu, ikonlu liste, yeni sekmede aç, kendi dosyasını sil. Migration: `fix_task_comments_attachments_storage.sql`.

### 3.7. Bildirim Merkezi ve Davet Kabul/Red

Header zilinde kırmızı okunmamış rozeti; dropdown; “Tümünü Okundu İşaretle”. Realtime ile anlık toast. Davet kartında Kabul Et / Reddet. Davet gönderilince `workspace_invite` bildirimi. Migration: `add_notifications_and_invites.sql`.

### 3.8. Dokümantasyon

`PROGRESS.md` 22 Temmuz maddeleri günün tüm başlıklarıyla güncellenmiş; `reports/2026-07-22_DAILY_REPORT.md` teknik günlük özeti ve bu staj defteri raporu yazılmıştır.

---

## 4. Karşılaşılan Sorunlar ve Çözümler

| Sorun | Durum | Açıklama |
|--------|--------|---------|
| Sabit “Kullanıcı Yükleniyor...” / boş ad | Çözüldü | Placeholder temizliği + `loadProfilesByIds` |
| `profiles.display_name` yok → select düşmesi | Çözüldü | Yalnızca mevcut kolonlar seçilir |
| Proje silme RLS / FK (0 satır) | Çözüldü | DELETE politikaları + sıralı hard delete |
| Tema geçişinin çalışmaması | Çözüldü | darkMode class + ThemeProvider + CSS sync |
| Light keskinliğin dark’ı bozması | Çözüldü | Sharp/rich stiller light-only |
| Modal / proje detay yavaş açılış | Çözüldü | Lazy mount, memo, parallel fetch, cache |
| Yorum/ek için tablo–storage yokluğu | Migration | `fix_task_comments_attachments_storage.sql` |
| Bildirim/davet Realtime & kabul/red | Çözüldü | Bell UI + `add_notifications_and_invites.sql` |
| Realtime client’ta circular import | Çözüldü | `client.ts` auth-session bağı koparıldı |

---

## 5. Gün Sonu Değerlendirmesi

Bugün sistem; doğru kullanıcı kimliği, güvenli silme, kullanılabilir Kanban, çift tema, daha hızlı detay panelleri, görev içi iletişim (yorum/ek) ve gerçek zamanlı davet/bildirim döngüsüyle staj web fazının olgun bir günlük teslimatına ulaşmıştır. Kod tarafı tamamdır; üretim ortamında henüz uygulanmamış SQL migration’ların Supabase’te çalıştırılması ve uçtan uca smoke test kritik kalan adımdır.

---

## 6. Yarınki Plan

1. Şu migration’ların Supabase SQL Editor’de uygulanıp doğrulanması:  
   `fix_profiles_select_and_placeholders.sql`, `fix_projects_delete_rls.sql`,  
   `fix_task_comments_attachments_storage.sql`, `add_notifications_and_invites.sql`  
2. Profil adı + silme + Kanban filtre smoke testi  
3. Light/Dark tema ve performans (proje detay / görev sheet) kontrolü  
4. Yorum yazma / dosya yükleme / silme uçtan uca testi  
5. Admin davet → Member Realtime bildirim → Kabul/Reddet → workspace yönlendirme smoke testi  
6. Staj defteri çıktısının (PDF/yazdırma) kontrolü  

---

*Bu rapor staj defteri için hazırlanmış olup yerel dosya olarak kaydedilmiştir.*
