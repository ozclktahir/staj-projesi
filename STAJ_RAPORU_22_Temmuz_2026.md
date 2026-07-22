# STAJ DEFTERİ GÜNLÜK RAPORU

**Tarih:** 22 Temmuz 2026  
**Proje:** İş Yönetim Sistemi (Workspace App)  
**Faz:** Faz 6–7 — Profil görünen ad düzeltmeleri, login hata ayrımı, UI etiket temizliği

---

## 1. Günün Özeti

Bugün staj kapsamında, arayüzde sabit kalan “Kullanıcı Yükleniyor...” / boş kullanıcı adı sorunları kök nedeniyle giderilmiştir. Login akışında auth hatası ile yönlendirme hatası ayrıştırılmış; Header, görev kartı, atanan kişi dropdown’ı ve üye tablosunda gerçek `full_name` / e-posta gösterimi sağlanmıştır. Asıl teknik kök neden, `profiles` sorgusunun olmayan sütunlar (`display_name` vb.) yüzünden tamamen düşmesiydi; `loadProfilesByIds` ile güvenli select zinciri eklendi. İlgili SQL migration ve PROGRESS güncellemesiyle değişiklikler GitHub’a gönderilmiştir.

---

## 2. Kullanılan Teknolojiler ve Terimler

- **`profiles` (Supabase):** Kullanıcının görünen adı (`full_name`), e-posta ve avatar bilgilerini tutan tablo. Auth `user_metadata` ile senkron tutulur.

- **`loadProfilesByIds`:** Önce `id, email, full_name, avatar_url` seçer; şema genişse `first_name` / `last_name` dener. Olmayan sütun isteyerek tüm sorgunun düşmesini engeller.

- **`formatPersonName` / `cleanText`:** Placeholder metinleri (“Kullanıcı Yükleniyor...”, “Kullanıcı”) filtreler; sıralama: Ad Soyad → e-posta → `@` öncesi.

- **Server Action:** `getWorkspaceMembers`, `getCurrentUserDisplayLabel`, `enrichTasksWithAssignees` üzerinden UI’a profil verisi taşınır.

- **RLS (Row Level Security):** `profiles` için authenticated SELECT + kendi satırına INSERT/UPDATE politikaları; migration ile yeniden doğrulanır.

---

## 3. Geliştirme Süreci

### 3.1. Login Hata Ayrımı

Girişte yalnızca `/auth/login` başarısızlığında “şifre/e-posta hatalı” gösterilir; login sonrası workspace/profil yönlendirme hataları ayrı ele alınır. Gereksiz sayfa yenileme ihtiyacı azaltılmıştır.

### 3.2. Görünen Ad ve Placeholder Temizliği

Jenerik “Kullanıcı” / “Üye” / “Hesap” fallback’leri kaldırılmıştır. Header skeleton ile yükleme durumu ayrılmış; veri etiketine loading metni yazılmaz. Görev kartı, dropdown ve üye tablosunda dinamik ad/e-posta bağlanmıştır.

### 3.3. Profiles Sorgu Düzeltmesi (Kök Neden)

Loglarda `column profiles.display_name does not exist` ve ardından `found: []` görülmüştür. Select listesi gerçek şemaya indirgenmiş; `loadProfilesByIds` tüm üye/assignee/yorum yollarına uygulanmıştır. `fix_profiles_select_and_placeholders.sql` ile placeholder temizliği ve RLS politikaları eklenmiştir.

### 3.4. Dokümantasyon

`PROGRESS.md` 22 Temmuz maddeleri güncellenmiş; günlük staj raporu yazılmış; commit `main` dalına push edilmiştir.

---

## 4. Karşılaşılan Sorunlar ve Çözümler

| Sorun | Durum | Açıklama |
|--------|--------|---------|
| Sabit “Kullanıcı Yükleniyor...” etiketi | Çözüldü | Placeholder formatlayıcılardan ve UI fallback’lerinden kaldırıldı |
| Görev kartında atanan kişi adı boş / Atanmadı | Çözüldü | `enrichTasksWithAssignees` profil select’i düzeltilerek isimler bağlandı |
| `display_name` sütunu yok → profil select düşmesi | Çözüldü | `loadProfilesByIds` yalnızca mevcut kolonları dener |
| Header’da ad boş / skeleton sonrası yanlış metin | Çözüldü | `getCurrentUserDisplayLabel` + metadata / e-posta local fallback |
| RLS upsert engeli (kendi profil satırı yoksa) | Migration ile | `fix_profiles_select_and_placeholders.sql` politikaları |

---

## 5. Gün Sonu Değerlendirmesi

Bugün kullanıcı kimliğinin UI’da doğru görünmesi stabilize edilmiştir. Görev atama ve üye yönetimi ekranlarında gerçek ad/e-posta okunabilir hale gelmiştir. Kalan iş: SQL migration’ın Supabase’te uygulanması ve hard refresh sonrası smoke test.

---

## 6. Yarınki Plan

1. `fix_profiles_select_and_placeholders.sql` migration’ının Supabase’te uygulanıp doğrulanması  
2. Görev kartı / dropdown / üye tablosu smoke testi (gerçek full_name)  
3. Davet / bildirim akışının ek doğrulaması  
4. Dashboard istatistiklerinin aktif workspace’e göre gözden geçirilmesi  
5. Mobil (Flutter) fazına geçiş öncesi web akışının son kontrolü  

---

*Bu rapor staj defteri için hazırlanmış olup yerel dosya olarak kaydedilmiştir.*
