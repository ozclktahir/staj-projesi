# 🐜 Ant — Proje Teknik Mimarisi ve Teknoloji Raporu

Bu dokümanı staj sürecinde üzerinde çalıştığım **Ant** (eski adıyla "İş Yönetim Sistemi / Workspace App") için hazırladım. Amacım mentoruma / staj sorumluma projenin "sadece ne kullandığımızı" değil, **neden bu şekilde kurduğumuzu**, parçaların birbirine nasıl bağlandığını ve staj boyunca projenin nasıl bir tek-sayfalık web demosundan üç platformlu (Web + Mobil + API), production'da canlı çalışan bir ürüne dönüştüğünü net anlatmak.

> **Not:** Bu doküman staj boyunca birkaç kez baştan güncellendi; bu en güncel hâli, projenin bugünkü (Eylül 2026) durumunu yansıtıyor.

---

## 1. Projenin Genel Amacı

Ant, ekiplerin ortak bir **çalışma alanı (workspace)** altında projeler ve görevler üzerinden iş takibi yapabildiği, Notion + Linear esintili, çok kiracılı (multi-tenant) bir platform. Artık üç ayrı istemciden oluşuyor: **Web** (Next.js), **Mobil** (Flutter) ve bunları besleyen ortak bir **NestJS API**.

Kısaca sunduğu şeyler:

- **Görev yönetimi:** Gerçek sürükle-bırak Kanban panosu, görev detay penceresi, alt görevler, öncelik, tekli atanan kişi, görev sahiplenme (claim) akışı
- **Çok kullanıcılı işbirliği:** Workspace davetleri, roller (Admin / Member / Guest, ayrıca Owner), üye/rol bazlı görünürlük, üye yönetimi sayfası
- **Gerçek zamanlı (realtime) senkron:** Bir kullanıcının yaptığı değişikliklerin diğer kullanıcılarda sayfa yenilenmeden görünmesi; canlı "Aktif Üyeler" göstergesi
- **İletişim:** Görev yorumları, dosya ekleri, bildirim zili (realtime), workspace davetleri
- **Analitik:** Dashboard'da KPI kartları ve grafikler (durum, öncelik, üye iş yükü), yaklaşan teslim tarihleri
- **Kişisel çalışma alanı:** Her kullanıcının kendine ait notlar, yapılacaklar listesi ve dosyaları
- **Denetlenebilirlik ve güvenlik:** Aktivite geçmişi (activity/audit log), çift-onaylı (dual-approval) görev silme, Çöp Kutusu/geri yükleme, admin paneli
- **Erişilebilirlik:** Tam TR/EN i18n, açık/koyu/sistem tema, global arama (Cmd/Ctrl+K web, tam ekran arama mobil)

Yani klasik bir "todo list"ten ziyade, küçük–orta ekiplerin günlük iş akışını hem masaüstünden hem telefondan tek yerden yönetebileceği bir ürün kurduk.

---

## 2. Mimari Genel Bakış — En Önemli Karar

Projenin en belirleyici mimari özelliği, **iki paralel backend yolu** kullanmasıdır — bu, staj boyunca üzerinde en çok düşündüğümüz karar oldu:

- **Web (Next.js):** Çoğu CRUD işlemi **Server Actions** ile doğrudan **Supabase JS client**'a gidiyor; asıl güvenlik katmanı veritabanı seviyesindeki **Row Level Security (RLS)** politikaları. NestJS API'yi web tarafı sınırlı kullanıyor.
- **Mobil (Flutter) ve genel API sözleşmesi:** **NestJS REST API** üzerinden çalışıyor (Dio + JWT Bearer), yetkilendirme backend'deki `SupabaseAuthGuard` + `WorkspaceRoleGuard` (Admin/Member/Guest, Owner) ile.

**Neden bu tercih?** Web tarafında Next.js'in Server Actions'ı ve Supabase'in RLS'i birlikte, ekstra bir API katmanı yazmadan tip-güvenli ve güvenli bir CRUD akışı sağlıyor — hızlı geliştirme. Ama mobil bir istemcinin Supabase client'ını doğrudan gömüp RLS'ye güvenmesi hem daha kırılgan hem de iş kurallarını (örn. "görev silmek için diğer admin'in onayı gerekir" gibi çok adımlı mantığı) istemci tarafında tekrar yazmayı gerektirirdi; bunun yerine mobil, bu mantığın merkezi olarak yaşadığı NestJS API'sine bağlanıyor.

**Bunun bedeli:** Aynı iş kuralı bazen iki yerde (RLS politikaları + NestJS guard/service) ayrı ayrı bakımda oluyor — bir kural değiştiğinde ikisinin de güncellenmesi gerekiyor. Bu, staj boyunca birkaç kez gerçek bug'lara yol açtı (bkz. Bölüm 6) ve bilinçli olarak takip ettiğimiz bir teknik borç.

```text
                    ┌───────────────────────┐
                    │      Web (Next.js)     │
                    │  Server Actions ──────►│───► Supabase JS Client (RLS)
                    └───────────────────────┘              │
                                                             ▼
┌───────────────────────┐                        ┌──────────────────────┐
│   Mobil (Flutter)      │                        │      Supabase        │
│  Dio + JWT ───────────►│──► NestJS REST API ───►│ Auth·Postgres·Storage │
└───────────────────────┘   (Guard + RBAC)        │      ·Realtime       │
                                                    └──────────────────────┘
```

---

## 3. Frontend (Web) Teknolojileri ve Neden Seçtik?

Web uygulaması `frontend/` klasöründe, **Next.js 16 (App Router)** ve **React 19** ile çalışıyor.

### Next.js (App Router) & React 19

**Neden kullandık?**
Hem sunucu tarafında sayfa/veri hazırlayıp hızlı ilk yükleme (SSR / Server Components) elde etmek, hem de Kanban, Sheet, bildirim menüsü gibi zengin istemci arayüzlerini React ile kurmak için. App Router sayesinde sayfa yapısını klasörlerle net ayırabildik (`(dashboard)`, `(auth)`, `project/[id]` vb.).

### TypeScript

**Neden kullandık?**
Kod yazarken tip hatalarını mümkün olduğunca erken yakalamak için. Özellikle Supabase'ten gelen satırlarla UI modelleri arasında uyumu garanti etmek büyük rahatlık sağladı.

### Tailwind CSS & Shadcn/Radix UI

**Neden kullandık?**
Hızlı ve tutarlı bir UI/UX için. Tailwind ile utility class'larla düzen/tema kurduk; Shadcn (Radix tabanlı) bileşenlerle Sheet, Dropdown, Button, Card gibi parçaları erişilebilir ve yeniden kullanılabilir hale getirdik. Açık/Koyu/Sistem tema desteğini (`next-themes`) bu sayede yönetiyoruz.

### Recharts

**Neden kullandık?**
Dashboard'da görev durum dağılımı, öncelik yoğunluğu ve üye iş yükünü **interaktif grafiklerle** göstermek için.

### `@dnd-kit/core` — gerçek sürükle-bırak Kanban

**Neden kullandık?**
İlk sürümde Kanban'daki durum değişimi bir tutamaç (grip handle) ile sınırlıydı; sonradan kullanıcı geri bildirimiyle **tüm kartın** sürüklenebilir/tıklanabilir olması istendi. `@dnd-kit/core` ile bunu erişilebilir (klavye desteği dahil) bir şekilde kurduk.

### `cmdk` — global arama / komut paleti

**Neden kullandık?**
Cmd/Ctrl+K ile açılan, hem içerik (proje/görev/üye/not) hem eylem (yeni görev, üye davet et, tema değiştir) arayan tek bir palet için.

### Supabase Realtime Presence

**Neden kullandık?**
Dashboard'daki canlı "Aktif Üyeler" göstergesi için — hangi kullanıcıların o an workspace'te aktif olduğunu WebSocket üzerinden anlık takip ediyoruz.

---

## 4. Mobil (Flutter) Teknolojileri ve Neden Seçtik?

Staj ilerledikçe, web'de kurulan ürünün **mobilde de aynı deneyimle** sunulması hedeflendi — `mobile/` klasöründeki Flutter istemcisi, web ile "tam parite" hedefiyle geliştirildi ve birkaç ayrı denetim turundan geçti.

### Flutter & Dart

**Neden kullandık?**
Tek bir kod tabanından hem Android hem iOS'a derlenebilen, native performanslı bir istemci için.

### Riverpod (State Management)

**Neden kullandık?**
Auth durumu, workspace listesi, görev/proje verisi gibi uygulama genelinde paylaşılan state'i öngörülebilir ve test edilebilir şekilde yönetmek için. `StateNotifierProvider` deseniyle, örneğin `AuthNotifier` giriş/çıkış/token yenileme durumunu tek bir yerde tutuyor.

### go_router

**Neden kullandık?**
Auth durumuna göre otomatik yönlendirme (giriş yapılmamışsa `/login`'e, onboarding tamamlanmamışsa `/onboarding`'e) gibi "guard'lı" bir navigasyon modeli kurmak için.

### Dio + `flutter_secure_storage`

**Neden kullandık?**
Dio, NestJS API'sine JWT Bearer token'lı istekler atan HTTP istemcisi; 401 durumunda sessiz token yenileme interceptor'ı burada yaşıyor. Token'lar cihazın güvenli (şifreli) depolama alanında (`flutter_secure_storage`) tutuluyor, düz `SharedPreferences`'ta değil.

### `socket_io_client`

**Neden kullandık?**
Web'in Supabase Realtime'ının mobildeki karşılığı olarak, backend'deki bir Socket.IO gateway'ine bağlanıp bildirim ve "aktif üye" event'lerini canlı dinlemek için (web ve mobil burada **bilinçli olarak iki farklı taşıma katmanı** kullanıyor — web Supabase Realtime, mobil Socket.IO; ikisi de gerçek-zamanlı ama birbirinden bağımsız, mobile ayrıca bir Supabase Realtime bağımlılığı eklemek istemediğimiz için).

### `fl_chart`

**Neden kullandık?**
Web'deki Recharts dashboard grafiklerinin mobildeki karşılığı.

---

## 5. Backend (NestJS) — API Omurgası

`backend/` altındaki NestJS servisi, staj ilerledikçe "isteğe bağlı bir ek" olmaktan çıkıp mobilin **tek bağlantı noktası** haline geldi, ayrıca web'in de bazı akışları (auth, bildirim) için kullandığı merkezi bir omurga oldu.

### Modüler yapı

Auth, Workspace, Project, Task, Comment, File, ActivityLog, ProgressReport, Note (kişisel notlar), Dashboard, Notification, Admin, Invitation, Personal — her biri kendi Nest modülü. **Swagger** (`/api`) ile tüm uçlar otomatik dokümante ediliyor.

### `SupabaseAuthGuard` + `WorkspaceRoleGuard`

**Neden kullandık?**
Her isteğin gerçek bir Supabase JWT'siyle geldiğini doğrulamak (`SupabaseAuthGuard`) ve workspace-scoped rotalarda kullanıcının o workspace'teki rolünü (Admin/Member/Guest, Owner) kontrol edip gerekiyorsa reddetmek (`WorkspaceRoleGuard`) için. Bu iki guard, mobilin RLS'ye güvenmeden de güvenli çalışabilmesinin temeli.

### Redis (`@nestjs/cache-manager`)

**Neden kullandık?**
Sık çağrılan ama nispeten az değişen uçları (proje listesi, dashboard istatistikleri) kısa TTL'lerle (30-60sn) önbelleklemek için. Redis bağlanamazsa (yerel geliştirmede olduğu gibi) sessizce bellek-içi (in-memory) önbelleğe düşüyor — geliştirme deneyimini bozmuyor.

### `@nestjs/throttler`

**Neden kullandık?**
Auth uçlarını (giriş/kayıt) kaba kuvvet (brute-force) saldırılarına karşı dakikada 5 istek/IP ile sınırlamak için.

### Socket.IO Gateway

**Neden kullandık?**
Mobil istemcinin bildirim ve "aktif üye" event'lerini canlı dinleyebilmesi için — bağlantı kurulurken gelen token'ın gerçekten doğrulanması (staj sırasında bulunup düzeltilen bir güvenlik açığıydı, bkz. Bölüm 6) önemli bir detay.

### Sentry (env-gated)

**Neden kullandık?**
Production'daki beklenmeyen hataları yakalamak için; `SENTRY_DSN` tanımlı değilse tamamen no-op — yerel geliştirmeyi hiç etkilemiyor.

---

## 6. Supabase (PostgreSQL, Auth, Storage, Realtime, RLS)

**Neden kullandık?**

1. **İlişkisel veritabanı:** Workspace → proje → görev → yorum/ek gibi ilişkiler SQL ile doğal modelleniyor
2. **Yerleşik Auth:** Kayıt/giriş/oturum JWT ile yönetiliyor, hem web hem mobil aynı Auth'u paylaşıyor
3. **Sunucusuz/yönetilen altyapı:** Auth + DB + Storage + Realtime'ı tek ekosistemde topluyor

### Row Level Security (RLS)

**Güvenliği nasıl sağladık?**
Sadece arayüzde "bu butonu gizle" demek yetmez. Supabase'te RLS politikalarıyla **veritabanı seviyesinde** kısıtladık: kullanıcı yalnızca kendi bildirimlerini okuyabilir, Member/Guest çoğu senaryoda yalnızca kendisine atanan görevlere erişir, workspace üyeliği olmayan biri hiçbir satırı göremez. Bu politikalar hem web'in doğrudan Supabase erişimini hem de (dolaylı olarak, admin client aracılığıyla) backend'in bazı yazma işlemlerini kapsıyor.

### Supabase Storage

Dosya ekleri (`task-attachments`, kişisel dosyalar) için kullanılıyor: dosya Storage'da, metadata veritabanı tablosunda.

### Supabase Realtime

Veritabanı değişikliklerini (`postgres_changes`) dinleyen abonelikler — Kanban'da durum değişince diğer kullanıcının panosu anında güncelleniyor, yeni yorum/bildirim akıyor.

---

## 7. Veri Akışı — İki Farklı Yol

```text
WEB YOLU:
[ Tarayıcı - Next.js UI ] → Server Action → Supabase JS Client (JWT) → Postgres (RLS) → Realtime → diğer istemciler

MOBİL YOLU:
[ Flutter UI ] → Dio (JWT Bearer) → NestJS API (Guard + RBAC) → Supabase (admin/service client) → Postgres
                                                                        │
                                                                        └─► Socket.IO Gateway → diğer mobil istemciler
```

Her iki yolda da kullanıcı önce Supabase Auth'tan bir JWT alıyor; web bunu cookie/localStorage'da, mobil `flutter_secure_storage`'da tutuyor. Sonrasında yollar ayrılıyor: web RLS'ye, mobil NestJS guard'larına güveniyor.

---

## 8. Production Ortamı — Render.com

Proje, geliştirmenin belirli bir noktasında yerel Docker Compose ortamından çıkarılıp **gerçek bir production ortamına** taşındı:

- **`staj-projesi-api`:** NestJS API, Docker runtime, Frankfurt bölgesi, `/health` healthcheck.
- **`staj-projesi-web`:** Next.js, Node runtime.
- **Redis:** Render Dashboard'dan manuel bağlanan bir Key-Value instance'ı.
- **CI/CD:** `main` dalına her push'ta backend/frontend/mobil build+test çalıştıran bir GitHub Actions pipeline'ı; ücretsiz planın "cold start" (uykuya dalma) gecikmesini azaltmak için periyodik bir "keep-alive" ping job'ı.
- **Mobil dağıtım:** Production API'sine bağlı bir release APK derlenip hem fiziksel cihazlara hem (debug-signed, Play Store dışı) GitHub Releases üzerinden herkese açık bir indirme linkine yüklendi.

---

## 9. Geliştirme Araçları ve Çalışma Disiplinimiz

### AI-Destekli Geliştirme (Cursor / Claude Code)

Mimari kararları netleştirirken, tekrarlayan CRUD/UI kalıplarını hızlandırırken ve hata ayıklarken yapay zekâyı bir **geliştirme ortağı** gibi kullandık. Kritik nokta: AI'nın ürettiği kodu körü körüne değil; RLS, tip güvenliği ve mevcut proje desenleriyle uyum açısından gözden geçirerek almak oldu. Staj ilerledikçe, "önce ölç, sonra düzelt" ve "varsayımla değil kanıtla" gibi disiplinleri hem kendimize hem AI asistanına açıkça kural olarak koyduk (bkz. Bölüm 10).

### Git & GitHub

Versiyon kontrolünü `main` dalında, anlamlı commit mesajlarıyla yönettik (`feat:`, `fix:`, `refactor:`, `chore:`, `perf:`, `revert:`, `docs:` önekleriyle).

### `PROGRESS.md` ve `CLAUDE.md`

Günlük ilerlemeyi `PROGRESS.md`'de (GitHub'a gönderilen, tarihli günlük kayıt) tuttuk; ayrıca yerel kalan bir `CLAUDE.md` dosyasında mimari kararların **gerekçelerini**, bilinen eksikleri ve "bir daha aynı hataya düşmemek için" öğrenilen tuzakları biriktirdik. Bu, hem staj defteri hem de gelecekteki geliştirme oturumları için hızlı bağlam sağladı.

---

## 10. Öne Çıkan Zorluklar ve Çözümlerimiz (Staj Kazanımları)

### Realtime senkronizasyonu

**Zorluk:** Çok kullanıcılı senaryoda herkesin manuel yenilemesi kötü UX.
**Çözüm:** `tasks`, yorum/ek, `notifications`, `activity_logs` için Realtime abonelikleri; cleanup ile bellek sızıntısını önleme; mobilde aynı ihtiyaç Socket.IO gateway'iyle karşılandı.

### RBAC + RLS birlikte çalışmalı

**Zorluk:** "Arayüzde gizledim" yetmez; Member/Guest yanlışlıkla başkasının görevini görmemeli — hem web hem mobil için.
**Çözüm:** Workspace-scoped roller, assignee bazlı görünürlük hem Supabase RLS politikalarında hem NestJS `WorkspaceRoleGuard`'ında **paralel olarak** uygulandı — Bölüm 2'de bahsedilen "iki yerde bakım" bedelini gerçek anlamda yaşadığımız yer burasıydı.

### Çift-onaylı görev silme (dual approval)

**Zorluk:** Yanlışlıkla veya kötü niyetle görev silinmesini önlemek.
**Çözüm:** Bir görevi silme isteği önce atanan kişiye veya başka bir admin'e onay için gidiyor; kural web ve backend'de birebir aynı fonksiyonda (`resolveDeletionApprover`/`requestOrDelete`) merkezi tutuluyor — böylece "iki yerde bakım" riskini bu spesifik kural için en aza indirdik.

### Web-Mobil parite denetimi

**Zorluk:** Mobil, web'den belirli bir süre sonra eklenince, iki istemcinin gerçekten aynı davranışı sergilediğinden emin olmak gerekiyordu.
**Çözüm:** Birkaç ayrı oturumda madde madde bir parite denetimi yapıldı (MFA, leave-workspace, presence, global arama, admin rol değiştirme vb.); platform kısıtı nedeniyle **bilinçli olarak farklı bırakılan** noktalar (örn. web Cmd+K komut paleti vs. mobil tam ekran arama) da açıkça dokümante edildi — her fark bir hata değil, bazıları kasıtlı tasarım kararı.

### Performans: "önce ölç, sonra düzelt"

**Zorluk:** "Şurası yavaş gibi" hissiyle kod değiştirmek, gerçek darboğazı kaçırıp gereksiz karmaşıklık eklemek riski taşıyor.
**Çözüm:** Birkaç performans turunda, önce gerçek ölçüm (prod'a karşı throwaway test verisiyle Node.js script'leri, ya da tam bir kod incelemesi) yapılıp **yalnızca gerçekten kanıtlanan** darboğazlar (sıralı ama bağımsız sorguların paralelleştirilmesi, aynı guard'ın bir route'ta yanlışlıkla iki kez çalışması, aynı verinin birden fazla bileşen tarafından ayrı ayrı çekilmesi) düzeltildi. Bulunmayan yerlerde zorlama bir "iyileştirme" yapılmadı — bu disiplin, staj boyunca en çok içselleştirdiğimiz alışkanlıklardan biri oldu.

### Bir özelliğin platform kısıtına çarpması ve dürüstçe geri alınması

**Zorluk:** Girişte e-posta ile ikinci bir doğrulama adımı (Login OTP) eklendi, backend/web/mobil tarafında eksiksiz çalışıyordu — ama gerçek bir e-posta sağlayıcısı (Gmail SMTP) bağlanmaya çalışılınca, önce bir kütüphane kaynaklı bir DNS/IPv6 hatası, sonra da **barındırma sağlayıcısının (Render) ücretsiz planının giden SMTP bağlantılarını tamamen engellediği** ortaya çıktı — bu, kodla çözülemeyecek bir platform kısıtıydı, canlı bir ağ testiyle (`net.connect()` ile doğrudan port testi) kesin olarak kanıtlandı.
**Çözüm:** Özelliği yarım/kırık bırakmak yerine, hem bu yeni özellik hem daha önce eklenmiş olan alternatif bir iki-adımlı-doğrulama yöntemi (TOTP/Authenticator) **tamamen ve temiz bir şekilde geri alındı** — kullanıcıları girişte kilitleyen bozuk bir ara duruma bırakmamak, "çalışıyormuş gibi görünen ama aslında kırık" bir özellikten çok daha değerli. Bu, staj boyunca öğrendiğim en önemli derslerden biri oldu: bazen doğru mühendislik kararı, üzerinde emek harcanmış bir özelliği kaybetmeyi göze alıp geri çekilmektir — özellikle sorun kendi kontrolümüz dışındaki bir altyapı kısıtından kaynaklanıyorsa.

### Rebrand: "Ant"

**Zorluk:** Proje, geçici bir çalışma adından (`staj-projesi`) kalıcı bir ürün kimliğine geçmeliydi.
**Çözüm:** Yeni bir isim ("Ant") ve simge (mevcut turuncu-siyah marka renklerine uygun, minimalist bir karınca silüeti) hem web hem mobilde tutarlı şekilde uygulandı; mobil tarafta yeni ikon gerçek bir cihaza kurulup doğrulandı.

---

## 11. Kısa Mimari Özet (Tek Bakışta)

| Katman | Teknoloji | Rolü |
|--------|-----------|------|
| Web UI | Next.js 16, React 19, TypeScript | Sayfalar, Kanban, Sheet, Dashboard |
| Web stil/bileşen | Tailwind, Shadcn/Radix UI | Tema, tutarlı UX |
| Web grafik/arama | Recharts, `cmdk`, `@dnd-kit/core` | Analitik, komut paleti, sürükle-bırak |
| Web iş mantığı | Server Actions | Tip güvenli sunucu işlemleri (RLS altında) |
| Mobil UI | Flutter, Dart | Android/iOS istemcisi |
| Mobil state | Riverpod, go_router | Durum yönetimi, auth-guard'lı navigasyon |
| Mobil ağ | Dio, `flutter_secure_storage`, `socket_io_client` | JWT'li API istekleri, güvenli token, realtime |
| API (mobil + ortak) | NestJS 11, Swagger | Guard/RBAC, modüler backend, dokümantasyon |
| Cache/limit | Redis (`cache-manager`), `@nestjs/throttler` | Performans, brute-force koruması |
| Gözlemlenebilirlik | Sentry (env-gated) | Production hata izleme |
| Veri & Auth | Supabase PostgreSQL + Auth | Kalıcılık, oturum, RLS |
| Canlılık | Supabase Realtime (web), Socket.IO (mobil) | Anlık çok kullanıcılı senkron |
| Dosya | Supabase Storage | Görev/kişisel dosya ekleri |
| Deploy | Render.com (Docker API + Node Web) | Production barındırma |
| Süreç | GitHub, GitHub Actions (CI/CD), `PROGRESS.md`/`CLAUDE.md` | Versiyonlama, otomatik test, öğrenme kaydı |

---

## 12. Kapanış

Bu staj sürecinde en çok öğrendiğim şey, modern bir ürünün tek bir "framework seçimi"nden ibaret olmadığı: **UI, sunucu eylemleri, veritabanı güvenliği (RLS), realtime — ve artık buna ek olarak, ikinci bir istemci (mobil) için ayrı ama tutarlı bir backend yolu, gerçek bir production ortamının kısıtları (cold start, port engelleri, ücretsiz plan sınırları) ve bir özelliği gerektiğinde dürüstçe geri alabilme cesareti** birlikte düşünülmesi gerektiği. Yanlış yerde yetki kontrolü, dar layout, unutulmuş bildirim tetikleyicisi veya üzerinde emek harcanmış ama platform kısıtına çarpan bir özellik gibi detaylar kullanıcı deneyimini doğrudan bozuyor; bunları görüp adım adım (ve bazen geri adım atarak) düzeltmek benim için en değerli kazanımlardan biri oldu.

Hazırlayan: Stajyer geliştirici (Ant — İş Yönetim Sistemi / Workspace App)
Doküman amacı: Mentor / staj sorumlusu teknik sunumu
