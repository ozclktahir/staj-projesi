# STAJ DEFTERİ GÜNLÜK RAPORU

**Tarih:** 17 Temmuz 2026  
**Proje:** İş Yönetim Sistemi (Workspace App)  
**Faz:** Faz 5–7 — Auth kararlılığı, Dashboard, Proje oluşturma ve Supabase RLS

---

## 1. Günün Özeti

Bugün staj kapsamında, dünden devam eden Next.js frontend ile NestJS/Supabase backend entegrasyonunun kararlı hale getirilmesine odaklanılmıştır. Geliştirme ortamında yaşanan port çakışmaları giderilmiş; App Router üzerinde Proxy (eski Middleware) ve Server Action katmanlarında cookie/JWT yönetimi yeniden düzenlenerek “Internal Server Error (500)” kaynaklı oturum kopmaları azaltılmıştır. Dashboard tarafında Create Project modalı tamamlanmış, proje oluşturma akışı Server Action üzerinden Supabase’e bağlanmış; `workspaces` / `workspace_members` tablolarında `owner_id` alanına dayalı Row Level Security (RLS) politikaları düzenlenmiştir. Gün sonunda, form gönderiminde “An unexpected response was received from the server” hatası tespit edilmiş ve yarın Server Action hata yakalama, dönen error nesnesi ile cookie yapısının detaylı incelenmesi planlanmıştır.

---

## 2. Kullanılan Teknolojiler ve Terimler

- **Next.js App Router:** Dosya tabanlı yönlendirme ve Server/Client Component ayrımı sunan modern Next.js mimarisidir. Bugün özellikle `(dashboard)` ve `(auth)` route group’ları, Server Action’lar (`"use server"`) ve Proxy dosyası (`proxy.ts`) üzerinden oturum kontrolü çalışılmıştır.

- **Proxy (eski Middleware):** Next.js 16 ile Middleware kavramının yeniden adlandırılmış karşılığıdır. İstek, sayfa render edilmeden önce `auth_session` ve `sb_access_token` cookie’lerine bakılarak korumalı rotalara yönlendirme yapılır.

- **Server Action:** İstemci formundan doğrudan sunucu fonksiyonu çağırma mekanizmasıdır. `createProject` ile proje/workspace kaydı Supabase’e yazılır; dönüş değeri toast bildirimi ile kullanıcıya yansıtılır.

- **JWT (JSON Web Token) ve Cookie Senkronizasyonu:** Giriş sonrası `access_token` / `refresh_token` değerleri `localStorage` ve HTTP cookie’lerine (`sb_access_token`, `sb_refresh_token`, `auth_session`) yazılır. Server Action’lar bu cookie’lerden token okuyarak `supabase.auth.getUser()` ile kullanıcıyı doğrular.

- **Supabase RLS (Row Level Security):** PostgreSQL seviyesinde satır bazlı erişim kontrolüdür. `owner_id = auth.uid()` benzeri politikalarla kullanıcının yalnızca kendi workspace kayıtlarını görmesi/oluşturması hedeflenir.

- **Shadcn/UI Dialog:** Create Project modalı Dialog, Input, Button bileşenleriyle kurulmuştur; form gönderimi Server Action’a bağlanmıştır.

- **NestJS Auth API:** Frontend login isteği `POST /auth/login` üzerinden NestJS’e gider. Bugün backend’in kök `.env` dosyasını bulamaması nedeniyle oluşan 500 hataları, `ConfigModule` `envFilePath` düzenlemesi ve backend yeniden başlatma ile giderilmiştir.

---

## 3. Geliştirme Süreci

### 3.1. Geliştirme Ortamı ve Port Stabilizasyonu

Frontend (`npm run dev`, port **3001**) ve backend (`npm run start:dev`, port **3000**) süreçlerinde `EADDRINUSE` kaynaklı çakışmalar yaşanmıştır. Takılı kalan Node süreçleri `kill-port` ile temizlenmiş, her iki sunucu yeniden ayağa kaldırılarak geliştirme ortamı stabil hale getirilmiştir. Backend tarafında Redis bağlantısı yoksa bellek içi önbelleğe düşen yapı korunmuştur.

### 3.2. Cookie / Token Yönetimi ve Internal Server Error Giderimi

Giriş sonrası oturum bayrağı (`auth_session`) ile JWT cookie’lerinin senkron olmaması; süresi dolmuş token’ların Proxy tarafından “oturum açık” sayılması; `@supabase/ssr` chunk cookie’lerinin şişmesi gibi nedenlerle sayfalarda Internal Server Error ve “Kullanıcı bulunamadı” hataları gözlenmiştir. Yapılan iyileştirmeler özetle:

1. Login sonrası `persistAuthSession` ile token’ların cookie’ye yazılması  
2. Logout’ta cookie + `localStorage` temizliği ve hard navigate (`window.location`)  
3. Server tarafında Bearer token ile `getUser(accessToken)` kullanımı (SSR cookie chunk bağımlılığının azaltılması)  
4. Proxy’de geçerli oturum kontrolünün sadeleştirilmesi  
5. NestJS’in `../.env` dosyasını yüklemesi (Supabase istemcisinin başlatılamaması nedeniyle login’in 500 dönmesi düzeltilmiştir)

### 3.3. Veritabanı Şeması ve RLS (`owner_id`)

Workspace oluşturma sırasında kullanıcıyı temsil eden alanın `user_id` değil **`owner_id`** olduğu tespit edilmiştir. `createProject` Server Action içinde otomatik kişisel workspace insert’i şu forma güncellenmiştir:

```ts
.insert({
  name: "Kişisel Çalışma Alanı",
  description: "Otomatik oluşturulan kişisel alan",
  owner_id: userId,
})
```

Buna ek olarak `workspaces` ve `workspace_members` için Supabase RLS politikaları `owner_id` üzerinden düzenlenmiş; kullanıcıların yalnızca kendi kayıtlarına erişmesi hedeflenmiştir. `workspace_members` üyelik satırlarında ise üye kimliği için `user_id` alanı (üyelik ilişkisi) korunmuştur.

### 3.4. Create Project Modalı ve UI

Dashboard header ve boş durum ekranına Shadcn Dialog tabanlı **Yeni Proje** modalı eklenmiştir. Kullanıcı proje adı ve açıklama girerek Server Action’ı tetikler; başarı/hata durumu `sonner` toast ile gösterilir. Proje kartlarından `/project/[id]` detay sayfasına navigasyon daha önce tamamlanmış durumda tutulmuştur.

### 3.5. İstemci ↔ Server Action Form Entegrasyonu

Form verisi istemciden `createProject({ name, description })` çağrısıyla sunucuya iletilir. Sunucu cookie’den JWT okur, kullanıcıyı doğrular, gerekirse workspace oluşturur, ardından `projects` tablosuna insert eder. Gün sonunda form gönderiminde **“An unexpected response was received from the server”** mesajı alınmıştır; bu hata tipik olarak Server Action’ın beklenmeyen bir yanıt (ör. HTML hata sayfası, kesilmiş stream veya yakalanmayan exception) döndürmesiyle ilişkilidir. Yarın `createProject` içindeki try/catch, dönen error objesi ve cookie yapısı detaylı incelenecektir.

---

## 4. Karşılaşılan Sorunlar ve Çözüm / Açık Konular

| Sorun | Durum | Açıklama |
|--------|--------|---------|
| Port 3000/3001 dolu (`EADDRINUSE`) | Çözüldü | Süreçler sonlandırılıp sunucular yeniden başlatıldı |
| Login’de NestJS 500 | Çözüldü | Supabase env yüklenmiyordu; `envFilePath: ['.env','../.env']` + restart |
| Süresi dolmuş JWT + `auth_session` | İyileştirildi | Cookie temizleme, logout, Bearer tabanlı sunucu auth |
| Workspace RLS / `owner_id` | İyileştirildi | Insert ve politikalar `owner_id` ile hizalandı |
| Create Project: unexpected server response | **Açık (yarın)** | Server Action yanıtı / cookie / try-catch incelenecek |

---

## 5. Gün Sonu Değerlendirmesi

Bugün hem altyapı kararlılığı (ortam, auth, env) hem de ürün özelliği (proje oluşturma UI + Server Action + RLS) üzerinde yoğun teknik ilerleme kaydedilmiştir. Oturum yönetimi ve veritabanı güvenlik modeli netleşmiş; kullanıcı arayüzü üzerinden proje oluşturma akışının iskeleti tamamlanmıştır. Kalan kritik açık, Server Action’ın istemciye beklenmeyen yanıt döndürmesidir; bu madde PROGRESS.md’de “GÜNLÜK DURAKLAMA” olarak işaretlenmiş ve yarınki ilk iş kalemi olarak planlanmıştır.

---

## 6. Yarınki Plan

1. `createProject` Server Action try/catch ve dönüş sözleşmesini gözden geçirmek  
2. Tarayıcı Network sekmesinde Server Action yanıt gövdesini (HTML mi, JSON mu) incelemek  
3. Cookie setini (özellikle `sb_access_token` / `auth_session`) login sonrası doğrulamak  
4. RLS politikalarının insert sırasında `auth.uid()` ile uyumunu test etmek  
5. Başarılı proje oluşturma sonrası Dashboard listesinin `revalidatePath` / `router.refresh` ile güncellendiğini doğrulamak

---

*Bu rapor staj defteri için hazırlanmış olup yerel dosya olarak kaydedilmiştir.*
