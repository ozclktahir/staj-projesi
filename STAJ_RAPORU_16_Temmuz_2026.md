# STAJ DEFTERİ GÜNLÜK RAPORU

**Tarih:** 16 Temmuz 2026  
**Proje:** İş Yönetim Sistemi (Workspace App)  
**Faz:** Faz 7 — Web Frontend Geliştirme (Next.js)

---

## 1. Günün Özeti

Bugünkü çalışma kapsamında, projenin web istemci katmanı için **Next.js (App Router)** tabanlı frontend uygulamasının temelleri atılmış ve kullanıcı kimlik doğrulama arayüzlerinin ilk sürümü tamamlanmıştır. Bu doğrultuda; Tailwind CSS ve Shadcn/UI bileşen kütüphanesi üzerine kurulu bir tasarım sistemi oluşturulmuş, **turuncu–siyah** marka paleti ile tutarlı bir görsel dil tanımlanmış, `next-themes` aracılığıyla aydınlık/karanlık mod altyapısı entegre edilmiş ve NestJS backend ile iletişim kuracak **Axios API client** katmanı yazılmıştır. Gün sonunda Login ve Register sayfaları, “Split Screen” mimarisiyle tasarlanmış; sol panoda marka/slogan alanı, sağ panoda ise Shadcn Card içinde form bileşenleri konumlandırılmıştır. Yapılan çalışmalar Git deposuna commit edilerek versiyon kontrolü altında kayıt altına alınmıştır.

---

## 2. Kullanılan Teknolojiler ve Terimler

- **Next.js (App Router):** React tabanlı, sunucu ve istemci bileşenlerini bir arada kullanmaya imkân veren modern bir frontend framework’tür. `src/app` dizin yapısı üzerinden dosya tabanlı yönlendirme (file-based routing) sağlar; `(auth)` gibi route group’lar URL’ye yansımadan sayfa gruplarını organize etmeye olanak tanır.

- **Tailwind CSS:** Utility-first yaklaşımıyla stil yazımını hızlandıran bir CSS framework’tür. Projede tema değişkenleri (`--primary`, `--background`, `--radius` vb.) üzerinden tutarlı renk ve köşe yuvarlaklığı yönetimi sağlanmıştır.

- **Shadcn/UI:** Hazır, kopyalanabilir React bileşenleri (Card, Button, Input, Label) sunan bir bileşen sistemidir. Proje koduna doğrudan eklenerek özelleştirilebilir; New York stili ve Slate taban rengi ile yapılandırılmıştır.

- **next-themes:** Uygulama genelinde aydınlık, karanlık ve sistem teması arasında geçiş yapılmasını sağlayan bir React kütüphanesidir. `class` attribute stratejisiyle `.dark` sınıfını `html` öğesine ekleyerek CSS değişkenlerinin moda göre değişmesini sağlar.

- **Axios:** HTTP isteklerini yönetmek için kullanılan bir istemci kütüphanesidir. Merkezi bir `apiClient` instance’ı ve request interceptor ile JWT Bearer token’ının otomatik eklenmesi hedeflenmiştir.

- **Split Screen (Bölünmüş Ekran) Mimarisi:** Kimlik doğrulama sayfalarında ekranı iki panele ayıran bir düzen modelidir. Sol panel marka ve slogan sunarken, sağ panel form etkileşimine odaklanır; hem görsel hiyerarşi hem de kullanılabilirlik açısından net bir ayrım oluşturur.

---

## 3. Geliştirme Süreci

### 3.1. Frontend Kurulumu ve API Client Katmanı

Frontend uygulaması `frontend/` dizini altında Next.js App Router ile başlatılmış; geliştirme sunucusu backend’in `3000` portu ile çakışmaması için `3001` portuna alınmıştır. Backend ile iletişim için `src/lib/api-client.ts` dosyasında Axios instance’ı tanımlanmış (`baseURL: http://localhost:3000`), request interceptor ile `localStorage` üzerindeki `access_token` değeri her isteğin `Authorization` başlığına `Bearer [token]` formatında eklenmiştir. Bu yaklaşım, ileride Auth entegrasyonu tamamlandığında tüm API çağrılarının tek bir noktadan kimlik bilgisi taşımasını mümkün kılmaktadır.

### 3.2. Aydınlık / Karanlık Mod Altyapısı

`next-themes` paketi kurulmuş; `ThemeProvider` bileşeni kök `layout.tsx` içerisinde uygulamayı sarmalamıştır. Sağlayıcı, `attribute="class"`, `defaultTheme="system"` ve `enableSystem` ayarlarıyla yapılandırılmış; böylece kullanıcı tercihine veya işletim sistemi temasına göre arayüzün anlık olarak değişmesi sağlanmıştır. `suppressHydrationWarning` ile sunucu–istemci hidrasyon uyumsuzluklarının önüne geçilmiştir.

### 3.3. Login ve Register Sayfalarının Split Screen Tasarımı

`src/app/(auth)/login/page.tsx` ve `src/app/(auth)/register/page.tsx` dosyaları oluşturulmuştur. Ortak kabuk bileşeni (`AuthSplitShell`) `grid grid-cols-1 md:grid-cols-2` düzenini kullanır:

- **Sol panel:** Siyah arka plan üzerinde “Task Management” vurgusu ve turuncu aksanlar; dikey ve yatayda ortalanmış marka alanı.
- **Sağ panel:** Tema moduna duyarlı arka plan üzerinde Shadcn `Card` içinde form.

**Login formu:** Email, Şifre alanları; “Şifremi Unuttum” ve “Kayıt Ol” yönlendirme linkleri.  
**Register formu:** Ad, Soyad, Email, Şifre alanları; “Zaten hesabın var mı? Giriş Yap” linki.

Bu aşamada sayfalar **UI odaklı** tasarlanmış; JWT ile backend’e bağlanma işlemi bir sonraki geliştirme adımı olarak bırakılmıştır.

---

## 4. Tasarım Kararları ve Gerekçelendirme

### 4.1. Turuncu–Siyah Tema Paleti

Marka kimliğini güçlendirmek amacıyla primary renk canlı turuncu (`hsl(24 100% 50%)`) olarak belirlenmiş; hem `:root` (aydınlık) hem `.dark` (karanlık) modlarında aynı primary değeri korunarak tutarlılık sağlanmıştır. Karanlık modda arka plan neredeyse siyah tonlara (`~0 0% 4%`) çekilmiş, böylece turuncu aksanlar yüksek kontrastla öne çıkarılmıştır.

### 4.2. Shadcn/UI Özelleştirmeleri

- **`--radius: 0.5rem`:** Buton, input ve kartlarda hafif yuvarlak köşeler; aşırı “pill” formundan kaçınılarak sade bir kurumsal görünüm hedeflenmiştir.
- **Card çerçevesi:** `border border-neutral-800 shadow-xl` ile form kartının arka plandan ayrışması sağlanmış; görsel hiyerarşi güçlendirilmiştir.
- **Tipografi yumuşatma:** Başlıklarda aşırı parlak beyaz yerine `neutral-100` / `neutral-200` tonları kullanılarak göz yorgunluğu azaltılmıştır.

Bu tasarım kararları, staj projesinin hem modern hem de okunabilir bir web arayüzüne sahip olmasını; aynı zamanda backend’de inşa edilen API’nin istemci tarafında tutarlı bir vitrinle sunulmasını amaçlamaktadır.

---

## 5. Sonuç

16 Temmuz 2026 itibarıyla web frontend’in temel altyapısı (Next.js, Tailwind, Shadcn/UI, tema sistemi, Axios client) ve Auth sayfalarının Split Screen arayüz tasarımı tamamlanmıştır. Bir sonraki adımda Login/Register formlarının NestJS Auth uç noktalarına JWT ile bağlanması ve Workspace/Task ekranlarının geliştirilmesi planlanmaktadır.
