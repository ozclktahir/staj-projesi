# STAJ DEFTERİ GÜNLÜK RAPORU

**Tarih:** 22 Temmuz 2026  
**Proje:** İş Yönetim Sistemi (Workspace App)  
**Faz:** Faz 6–7 — Profil görünen ad düzeltmeleri, login hata ayrımı, proje/görev silme

---

## 1. Günün Özeti

Bugün staj kapsamında iki ana başlık tamamlanmıştır. Birincisi, arayüzde sabit kalan “Kullanıcı Yükleniyor...” / boş kullanıcı adı sorunlarının kök nedeniyle giderilmesidir; Header, görev kartı, atanan kişi dropdown’ı ve üye tablosunda gerçek `full_name` / e-posta gösterimi sağlanmıştır. İkincisi, **Proje ve Görev silme** (`Delete Project` / `Delete Task`) işlevlerinin onay modalları, Toast bildirimleri, yetki kontrolü ve silme sonrası yönlendirme/state güncellemesiyle entegre edilmesidir. `PROGRESS.md` ve bu günlük rapor güncellenerek değişiklikler GitHub’a gönderilmiştir.

---

## 2. Kullanılan Teknolojiler ve Terimler

- **`profiles` (Supabase):** Kullanıcının görünen adı (`full_name`), e-posta ve avatar bilgilerini tutan tablo. Auth `user_metadata` ile senkron tutulur.

- **`loadProfilesByIds`:** Önce `id, email, full_name, avatar_url` seçer; şema genişse `first_name` / `last_name` dener. Olmayan sütun isteyerek tüm sorgunun düşmesini engeller.

- **`formatPersonName` / `cleanText`:** Placeholder metinleri (“Kullanıcı Yükleniyor...”, “Kullanıcı”) filtreler; sıralama: Ad Soyad → e-posta → `@` öncesi.

- **Soft delete (`deleted_at`):** Görev/proje silmede önce `deleted_at` güncellenir; sütun yoksa hard delete’e düşülür. Proje silinirken bağlı görevler de temizlenir.

- **Onay modalı (Dialog / AlertDialog kalıbı):** Silme işlemi doğrudan yapılmaz; kullanıcıya geri alınamaz uyarı metni gösterilir (`DeleteTaskModal`, `DeleteProjectModal`).

- **Server Action:** `deleteTask`, `deleteProject`, `getWorkspaceMembers`, `enrichTasksWithAssignees` vb. UI’dan güvenli sunucu tarafı işlemler.

- **RBAC:** Proje silme yalnızca Admin (veya proje sahibi); görev silmede Admin tüm görevleri, Member kendi atanan/oluşturduğu görevleri silebilir.

---

## 3. Geliştirme Süreci

### 3.1. Login Hata Ayrımı

Girişte yalnızca `/auth/login` başarısızlığında “şifre/e-posta hatalı” gösterilir; login sonrası workspace/profil yönlendirme hataları ayrı ele alınır. Gereksiz sayfa yenileme ihtiyacı azaltılmıştır.

### 3.2. Görünen Ad ve Placeholder Temizliği

Jenerik “Kullanıcı” / “Üye” / “Hesap” fallback’leri kaldırılmıştır. Header skeleton ile yükleme durumu ayrılmış; veri etiketine loading metni yazılmaz. Görev kartı, dropdown ve üye tablosunda dinamik ad/e-posta bağlanmıştır.

### 3.3. Profiles Sorgu Düzeltmesi (Kök Neden)

Loglarda `column profiles.display_name does not exist` ve ardından `found: []` görülmüştür. Select listesi gerçek şemaya indirgenmiş; `loadProfilesByIds` tüm üye/assignee/yorum yollarına uygulanmıştır. `fix_profiles_select_and_placeholders.sql` ile placeholder temizliği ve RLS politikaları eklenmiştir.

### 3.4. Görev Silme (Delete Task)

Kanban kartında üç nokta menüsüne ve `TaskDetailSheet` detay paneline “Görevi Sil” eklenmiştir. Onay modalında “Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.” uyarısı gösterilir. Onay sonrası `tasks` kaydı silinir/arşivlenir; görev listeden anında düşer ve Toast (“Görev başarıyla silindi”) gösterilir.

### 3.5. Proje Silme (Delete Project)

Proje detay sayfası header’ına Admin için “Projeyi Sil” butonu eklenmiştir. Onay modalında cascade uyarısı yer alır: projeye ait tüm görevlerin de silineceği belirtilir. Silme sonrası kullanıcı Dashboard / workspace ana sayfasına yönlendirilir; proje listesi `revalidatePath` ile güncellenir.

RLS’te eksik `DELETE` politikası ve soft-delete’in 0 satır dönmesi sorunları giderilmiştir: `fix_projects_delete_rls.sql` ile Admin/sahip DELETE izni eklenmiş; kod tarafında önce `tasks`, sonra `projects` hard delete + etkilenen satır doğrulaması yapılmıştır. Başarıda hard navigate ile dashboard yenilenir.

### 3.6. Dokümantasyon

`PROGRESS.md` 22 Temmuz maddeleri (profil ad bağlama + proje/görev silme) güncellenmiş; günlük staj raporu tamamlanmış; ilgili commit’ler `main` dalına push edilmiştir.

---

## 4. Karşılaşılan Sorunlar ve Çözümler

| Sorun | Durum | Açıklama |
|--------|--------|---------|
| Sabit “Kullanıcı Yükleniyor...” etiketi | Çözüldü | Placeholder formatlayıcılardan ve UI fallback’lerinden kaldırıldı |
| Görev kartında atanan kişi adı boş / Atanmadı | Çözüldü | `enrichTasksWithAssignees` profil select’i düzeltilerek isimler bağlandı |
| `display_name` sütunu yok → profil select düşmesi | Çözüldü | `loadProfilesByIds` yalnızca mevcut kolonları dener |
| Header’da ad boş / skeleton sonrası yanlış metin | Çözüldü | `getCurrentUserDisplayLabel` + metadata / e-posta local fallback |
| RLS upsert engeli (kendi profil satırı yoksa) | Migration ile | `fix_profiles_select_and_placeholders.sql` politikaları |
| Yanlışlıkla silme riski | Çözüldü | Onay modalı + net uyarı metinleri |
| Proje silinince bağlı görevlerin kalması | Çözüldü | Proje silmeden önce `project_id` görevleri de temizlenir |
| Proje silme RLS / FK engeli (0 satır / permission) | Çözüldü | `fix_projects_delete_rls.sql` DELETE politikaları + sıralı hard delete + doğrulama |

---

## 5. Gün Sonu Değerlendirmesi

Bugün kullanıcı kimliğinin UI’da doğru görünmesi stabilize edilmiş; ayrıca proje ve görev yaşam döngüsüne güvenli silme akışı eklenmiştir. Kanban ve proje detayı üzerinden silme, onay ve yönlendirme uçtan uca çalışır durumdadır. Kalan iş: profil SQL migration doğrulaması ve silme senaryolarının smoke testi.

---

## 6. Yarınki Plan

1. `fix_profiles_select_and_placeholders.sql` migration’ının Supabase’te uygulanıp doğrulanması  
2. Görev kartı / dropdown / üye tablosu smoke testi (gerçek full_name)  
3. Proje ve görev silme akışının Admin / Member yetki senaryolarıyla smoke testi  
4. Davet / bildirim akışının ek doğrulaması  
5. Dashboard istatistiklerinin aktif workspace’e göre gözden geçirilmesi  
6. Mobil (Flutter) fazına geçiş öncesi web akışının son kontrolü  

---

*Bu rapor staj defteri için hazırlanmış olup yerel dosya olarak kaydedilmiştir.*
