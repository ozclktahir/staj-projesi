# 🚀 Proje Teknik Mimarisi ve Teknoloji Raporu

Bu dokümanı staj sürecinde üzerinde çalıştığımız **İş Yönetim Sistemi (Workspace App)** için hazırladım. Amacım mentoruma / staj sorumluma projenin “sadece ne kullandığımızı” değil, **neden bu şekilde kurduğumuzu** ve parçaların birbirine nasıl bağlandığını net anlatmak.

---

## 1. Projenin Genel Amacı

Projemiz, ekiplerin ortak bir **çalışma alanı (workspace)** altında projeler ve görevler üzerinden iş takibi yapabildiği modern bir web platformu.

Kısaca sunduğu şeyler:

- **Görev yönetimi:** Kanban panosu, görev detay penceresi, alt görevler, öncelik ve atanan kişi
- **Çok kullanıcılı işbirliği:** Workspace davetleri, roller (Admin / Member), üye bazlı görünürlük
- **Gerçek zamanlı (realtime) senkron:** Bir kullanıcının yaptığı değişikliklerin diğer kullanıcılarda sayfa yenilenmeden görünmesi
- **İletişim:** Görev yorumları, dosya ekleri, bildirim zili
- **Analitik:** Dashboard üzerinde KPI kartları ve grafikler (durum, öncelik, üye iş yükü)
- **Denetlenebilirlik:** Aktivite geçmişi (activity / audit log)

Yani klasik bir “todo list”ten ziyade, küçük–orta ekiplerin günlük iş akışını tek yerden yönetebileceği bir ürün iskeleti kurduk.

---

## 2. Frontend (Ön Yüz) Teknolojileri ve Neden Seçtik?

Ön yüz uygulaması `frontend/` klasöründe, **Next.js App Router** ile çalışıyor (geliştirme ortamında genelde `:3001` portu).

### Next.js (App Router) & React

**Neden kullandık?**  
Hem sunucu tarafında sayfa/veri hazırlayıp hızlı ilk yükleme (SSR / Server Components) elde etmek, hem de Kanban, Sheet, bildirim menüsü gibi zengin istemci arayüzlerini React ile kurmak için. App Router sayesinde sayfa yapısını klasörlerle net ayırabildik (`(dashboard)`, `(auth)`, `project/[id]` vb.).

Pratikte:

- Giriş sonrası dashboard, projeler, ayarlar gibi sayfalar Next route’ları
- Ağır etkileşimli parçalar (`"use client"`) — örn. Kanban panosu, bildirim dropdown’ı, grafik kartları

### TypeScript

**Neden kullandık?**  
Kod yazarken tip hatalarını mümkün olduğunca erken yakalamak için. Özellikle Supabase’ten gelen satırlarla UI modelleri (`ProjectTask`, `NotificationItem`, analitik DTO’lar) arasında uyumu garanti etmek büyük rahatlık sağladı. “Acaba bu alan `null` olabilir mi?” sorusunu IDE’de görmek, runtime sürprizlerini azalttı.

### Tailwind CSS & Shadcn UI

**Neden kullandık?**  
Hızlı ve tutarlı bir UI/UX için. Tailwind ile utility class’larla düzen/tema kurduk; Shadcn (Radix tabanlı) bileşenlerle Sheet, Dropdown, Button, Card gibi parçaları erişilebilir ve yeniden kullanılabilir hale getirdik.

Bunun sayesinde:

- **Açık / Koyu / Sistem** tema desteğini (`next-themes`) yönetmek kolaylaştı
- Mobil ve masaüstü için responsive düzenleri hızlıca ayarlayabildik
- Tasarımı “her ekranda farklı bir dünya” olmaktan çıkarıp tek bir dilde tutabildik

### Recharts

**Neden kullandık?**  
Dashboard’da görev durum dağılımı (donut/pie), öncelik yoğunluğu (bar) ve üye iş yükünü (stacked bar) **interaktif grafiklerle** göstermek için. Saf HTML/CSS ile bu kadar okunaklı bir analitik panel kurmak çok daha zahmetli olurdu.

Not: Recharts istemci tarafında çalıştığı için grafik bileşenlerinde `"use client"` kullandık; `ResponsiveContainer` için sabit yükseklik vererek “grafik görünmüyor / 0px height” tipik sorununu da aştık.

---

## 3. Backend, Veritabanı ve Altyapı

Proje monorepo yapısında: web tarafı Next.js, ek olarak `backend/` altında **NestJS** API de var (Swagger dokümantasyonu, Auth, workspace/task vb. uçlar). Stajın web fazında günlük ürün akışının büyük kısmını Next.js **Server Actions** + Supabase client ile yürüttük; NestJS ise API / altyapı katmanı olarak yer alıyor.

### Supabase (PostgreSQL)

**Neden kullandık?**  

1. **İlişkisel veritabanı:** Workspace → proje → görev → yorum/ek gibi ilişkiler SQL ile doğal modelleniyor  
2. **Yerleşik Auth:** Kayıt / giriş / oturum JWT ile yönetiliyor  
3. **Sunucusuz / yönetilen altyapı:** Auth + DB + Storage + Realtime’ı tek ekosistemde topluyor  

Önemli tablolardan bazıları: `workspaces`, `workspace_members`, `projects`, `tasks`, `task_comments`, `task_attachments`, `notifications`, `activity_logs`, `workspace_invitations`.

Dosya ekleri için **Supabase Storage** (`task-attachments` bucket) kullandık: dosya storage’da, metadata tabloda.

### Supabase Realtime (WebSockets)

**Nasıl kullandık?**  
Veritabanındaki değişiklikleri (`postgres_changes`) dinleyen abonelikler kurduk. Örnekler:

- Birisi Kanban’da görev durumunu değiştirince diğer kullanıcının panosu anında güncellenir  
- Görev detayında yeni yorum / dosya düşünce liste yenilenmeden akar  
- Yeni bildirim INSERT olunca zil rozeti ve toast tetiklenir  
- Aktivite logu düşünce feed’in en üstüne eklenir  

Bunu yaparken kanalı (`channel`) bileşen unmount olduğunda `removeChannel` ile temizliyoruz; aksi halde “hayalet” dinleyiciler kalırdı.

### Row Level Security (RLS)

**Güvenliği nasıl sağladık?**  
Sadece frontend’de “bu butonu gizle” demek yetmez. Supabase’te RLS politikalarıyla **veritabanı seviyesinde** kısıtladık:

- Kullanıcı yalnızca kendi bildirimlerini okuyabilir  
- Workspace üyesi / owner kendi alanındaki proje ve görevleri görebilir  
- Member çoğu senaryoda yalnızca kendisine atanan görevlere erişir  
- Bildirim INSERT için workspace üyelerinin birbirine (ör. görev atama bildirimi) yazabilmesi için politikayı bilinçli genişlettik  

Yani yetki kontrolünün bir kısmını uygulamada, asıl güvenceyi SQL politikalarında tuttuk.

### Next.js Server Actions

Geleneksel olarak her iş için ayrı REST endpoint yazmak yerine (web UI tarafında) birçok işlemi **Server Actions** ile yaptık: `createTask`, `updateTask`, `createComment`, `getWorkspaceAnalytics`, davet kabul/reddet vb.

**Neden bu yaklaşım?**  

- Form / buton aksiyonlarını doğrudan sunucuda çalıştırabiliyoruz  
- TypeScript tipleriyle uçtan uca daha güvenli bir akış  
- Cookie / JWT ile oturumlu Supabase client’ı sunucu tarafında kullanmak pratik  

Özetle: **Frontend UI’ı tetikler → Server Action doğrular / yazar → Supabase (RLS altında) kalıcılar → Realtime abonelikleri diğer istemcileri günceller.**

NestJS tarafı ise özellikle API dokümantasyonu (Swagger), modüler servis yapısı ve ileride mobil / harici istemcilerin bağlanması için hazır bir backend omurgası sunuyor.

---

## 4. Frontend ile Backend / Veri Katmanı Nasıl Haberleşiyor?

Basitleştirilmiş akış şöyle:

```text
[ Tarayıcı - Next.js UI ]
        │
        │  Server Action çağrısı / (gerekirse) Nest API
        ▼
[ Sunucu - Next.js Server Actions  (± NestJS) ]
        │
        │  Supabase JS Client (JWT ile)
        ▼
[ Supabase: Auth + PostgreSQL + Storage + Realtime ]
        │
        │  postgres_changes (WebSocket)
        ▼
[ Diğer tarayıcılar - anlık UI güncellemesi ]
```

1. Kullanıcı giriş yapar → Supabase Auth JWT üretir  
2. Bu oturum cookie / client tarafında tutulur  
3. Server Action, kullanıcı adına sorguları çalıştırır (RLS `auth.uid()` ile devreye girer)  
4. INSERT/UPDATE/DELETE olunca Realtime yayınlar → abone olan ekranlar state’i günceller  

Bu model sayesinde “sayfayı yenile, belki görünür” yerine **canlı bir işbirliği hissi** hedefliyoruz.

---

## 5. Geliştirme Araçları ve Çalışma Disiplinimiz

### Cursor (AI-Assisted IDE)

Mimari kararları netleştirirken, tekrarlayan CRUD / UI kalıplarını hızlandırırken ve hata ayıklarken yapay zekâyı bir **geliştirme ortağı** gibi kullandık. Kritik nokta: AI’nın ürettiği kodu körü körüne değil; RLS, tip güvenliği ve mevcut proje desenleriyle uyum açısından gözden geçirerek almak oldu.

### Git & GitHub

Versiyon kontrolünü `main` dalında, anlamlı commit mesajlarıyla yönettik. Örnek ön ekler:

- `feat:` yeni özellik (activity feed, dashboard grafikleri, bildirim paneli…)  
- `fix:` hata / eksik davranış (görev atamada bildirim tetiklenmemesi, grafik render, RLS…)  
- `refactor:` yapısal iyileştirme (aktivite panelinin Sheet’e alınması, analitiğin Dashboard’da toplanması)  
- `chore:` bakım (staj raporu dosyalarının repodan ayrılması vb.)  

Ayrıca günlük ilerlemeyi `PROGRESS.md` ile kayıt altına aldık; böylece “bugün ne yaptık?” sorusu hem ekip hem staj defteri için izlenebilir kaldı.

---

## 6. Öne Çıkan Zorluklar ve Çözümlerimiz (Staj Kazanımları)

### Realtime senkronizasyonu

**Zorluk:** Çok kullanıcılı senaryoda herkesin manuel yenilemesi kötü UX.  
**Çözüm:** `tasks`, yorum/ek, `notifications`, `activity_logs` için Realtime abonelikleri; cleanup ile bellek sızıntısını önleme; publication migration’ları (`enable_global_realtime.sql`).

### Verimli layout düzeni (Kanban + Aktivite)

**Zorluk:** Aktivite panelini sabit sağ sidebar yapınca Kanban kolonları daralıp sıkışıyordu.  
**Çözüm:** Aktiviteyi toolbar’dan açılan **Collapsible Sheet / Drawer**’a taşıdık; Kanban tekrar tam genişlik aldı. Kapalıyken bile Realtime dinlemeye devam edebiliyoruz (yeni aktivitede küçük rozet).

### Bütüncül bildirim altyapısı

**Zorluk:** Zil UI’ı vardı ama görev atanınca otomatik kayıt oluşmuyordu; ayrıca INSERT RLS sadece admin/self’e izin veriyordu.  
**Çözüm:** `createTask` / `updateTask` içinde `createTaskAssignedNotification` tetikledik; workspace üyelerinin birbirine bildirim yazabilmesi için RLS’i güncelledik. Header popover’da davet Kabul/Reddet, okunmamış rozet ve Realtime toast tamamlandı.

### Dashboard analitiği

**Zorluk:** Grafik kartlarında bazen sadece başlık görünüyordu.  
**Çözüm:** Recharts + sabit yükseklikli `ResponsiveContainer`, empty state, Dashboard’ı workspace komuta merkezi yapıp proje sayfasını sade Kanban + aktivite çekmecesine indirdik.

### Güvenlik ve roller (RBAC + RLS)

**Zorluk:** “UI’da gizledim” yetmez; Member yanlışlıkla her projeyi görmemeli.  
**Çözüm:** Workspace-scoped roller, assignee bazlı görünürlük ve Supabase RLS politikaları birlikte çalışıyor.

---

## 7. Kısa Mimari Özet (Tek Bakışta)

| Katman | Teknoloji | Rolü |
|--------|-----------|------|
| UI | Next.js, React, TypeScript | Sayfalar, Kanban, Sheet, Dashboard |
| Stil / bileşen | Tailwind, Shadcn UI | Tema, tutarlı UX |
| Grafik | Recharts | Analitik görselleştirme |
| İş mantığı (web) | Server Actions | Tip güvenli sunucu işlemleri |
| API (ek) | NestJS + Swagger | Modüler backend / dokümantasyon |
| Veri & Auth | Supabase PostgreSQL + Auth | Kalıcılık, oturum, RLS |
| Canlılık | Supabase Realtime | Anlık çok kullanıcılı senkron |
| Dosya | Supabase Storage | Görev ekleri |
| Süreç | GitHub, Cursor, PROGRESS.md | Versiyonlama ve öğrenme kaydı |

---

## 8. Kapanış

Bu staj sürecinde en çok öğrendiğim şey, modern bir web ürününün tek bir “framework seçimi”nden ibaret olmadığı: **UI, sunucu eylemleri, veritabanı güvenliği (RLS) ve realtime**’ın birlikte düşünülmesi gerektiği. Yanlış yerde yetki kontrolü, dar layout veya unutulmuş bildirim tetikleyicisi gibi detaylar kullanıcı deneyimini doğrudan bozuyor; bunları görüp adım adım düzeltmek benim için en değerli kazanımlardan biri oldu.

Hazırlayan: Stajyer geliştirici (İş Yönetim Sistemi / Workspace App)  
Doküman amacı: Mentor / staj sorumlusu teknik sunumu
