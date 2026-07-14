# STAJ DEFTERİ GÜNLÜK RAPORU

**Tarih:** 13 Temmuz 2026
**Proje:** İş Yönetim Sistemi (Workspace App)
**Faz:** Faz 1 — Proje Kurulumu ve Docker Mimarisi

---

## 1. Günün Özeti

Bugünkü çalışma kapsamında, "İş Yönetim Sistemi (Workspace App)" projesinin backend altyapısının temelleri oluşturulmuştur. Bu doğrultuda, öncelikle **NestJS** framework'ü üzerinde çalışan bir Node.js sunucu uygulaması kurulmuş, ardından bu uygulamanın konteynerize (containerized) edilmesi amacıyla bir **Dockerfile** hazırlanmıştır. Uygulamanın önbellekleme (cache) ihtiyaçlarını karşılamak üzere **Redis** servisi projeye entegre edilmiş ve tüm servislerin (API ve Redis) tek bir komutla birlikte, tutarlı ve tekrarlanabilir bir şekilde ayağa kaldırılabilmesi için bir **docker-compose.yml** dosyası yazılmıştır. Son olarak, ortam değişkenlerinin (environment variables) standardize edilmesi amacıyla bir `.env.example` şablonu oluşturulmuş ve proje **Git** versiyon kontrol sistemine dahil edilerek ilk commit atılmıştır. Gün sonunda yapılan test isteği (`http://localhost:3000`) ile sistemin uçtan uca (end-to-end) çalışır durumda olduğu doğrulanmıştır. Böylelikle, projenin ilerleyen fazlarında (Supabase entegrasyonu, kimlik doğrulama, operasyonel modüller vb.) üzerine inşa edilecek sağlam ve taşınabilir bir temel altyapı hedeflenmiş ve bu hedefe ulaşılmıştır.

## 2. Kullanılan Teknolojiler ve Terimler

- **Node.js:** Sunucu tarafı (server-side) JavaScript kodlarının çalıştırılmasını sağlayan, olay güdümlü (event-driven) ve asenkron I/O modeline sahip bir çalışma zamanı (runtime) ortamıdır. Projenin backend katmanının çalıştığı temel platform olarak kullanılmıştır.

- **NestJS:** Node.js üzerine inşa edilmiş, TypeScript tabanlı, kurumsal düzeyde (enterprise-grade) sunucu uygulamaları geliştirmek için tasarlanmış bir framework'tür. Angular'dan ilham alan modüler mimarisi sayesinde **Controller** (istekleri karşılayan katman), **Service** (iş mantığının yürütüldüğü katman) ve **Module** (ilgili bileşenleri bir arada tutan yapı) gibi net sorumluluk ayrımlarına dayanan bir mimari sunar.

- **Docker:** Uygulamaların ve bağımlılıklarının, "imaj" (image) adı verilen standart, taşınabilir birimler halinde paketlenmesini sağlayan bir konteynerizasyon (containerization) teknolojisidir. Uygulamanın çalışacağı ortamı kod olarak (Infrastructure as Code) tanımlamaya imkân verir.

- **Docker Compose:** Birden fazla Docker konteynerinin (örneğin API servisi ve Redis servisi) tek bir YAML dosyası üzerinden tanımlanıp, tek bir komutla (`docker-compose up`) birlikte yönetilmesini sağlayan orkestrasyon (orchestration) aracıdır.

- **Redis:** Verileri disk üzerinde değil, sunucunun RAM'inde (bellek içi / in-memory) tutan, anahtar-değer (key-value) tabanlı bir veri yapısı deposudur. Yüksek hızlı okuma/yazma performansı nedeniyle önbellekleme (caching) ve oturum (session) yönetimi senaryolarında yaygın olarak kullanılır.

- **Workspace Mimarisi:** Bu proje bağlamında "Workspace", kullanıcıların projeler, görevler ve ekip üyelerini bir çatı altında organize ettiği, çok kiracılı (multi-tenant benzeri) bir izolasyon ve yetkilendirme birimini ifade etmektedir. Sistemin ilerleyen fazlarında her bir Workspace kendi kullanıcı rolleri, projeleri ve kaynaklarıyla birlikte yönetilecek şekilde tasarlanacaktır.

## 3. Neden ve Ne İçin Kullanıldı? (Gerekçelendirme)

### 3.1. NestJS Neden Seçildi?

NestJS'in seçilme gerekçesi, sunduğu **modüler mimari** ve katı **Controller/Service** ayrımıdır. Bu yapı sayesinde, HTTP isteklerini karşılamakla sorumlu olan Controller katmanı ile veritabanı işlemleri, iş kuralları ve harici servis entegrasyonlarını (Supabase, Redis vb.) yürüten Service katmanı birbirinden bağımsız hâle getirilmiştir. Bu ayrım, projenin büyümesiyle birlikte ortaya çıkacak Auth, Workspace, Proje ve Görev modüllerinin (Faz 3-4) birbirinden izole, test edilebilir ve bakımı kolay birimler olarak geliştirilmesine olanak sağlamaktadır. Ayrıca NestJS'in yerleşik **Dependency Injection (Bağımlılık Enjeksiyonu)** mekanizması, Redis istemcisi veya Supabase istemcisi gibi harici servislerin uygulama genelinde tutarlı ve test edilebilir bir şekilde enjekte edilmesini mümkün kılmaktadır. TypeScript tabanlı olması nedeniyle statik tip güvenliği (type safety) de sağlanmış, bu sayede geliştirme sürecinde oluşabilecek hataların derleme (compile-time) aşamasında yakalanması hedeflenmiştir.

### 3.2. Docker ve Docker Compose Neden Kullanıldı?

Docker ve Docker Compose kullanımının temel gerekçesi, **ortam bağımsızlığının (environment independence)** sağlanmasıdır. Geleneksel geliştirme süreçlerinde sıklıkla karşılaşılan "benim makinemde çalışıyordu" problemi, uygulamanın çalışması için gereken Node.js sürümü, bağımlılıklar ve sistem ayarlarının bir Docker imajı içerisine sabitlenmesiyle ortadan kaldırılmıştır. Bu staj projesi özelinde, Docker kullanımı şu sorunları çözmektedir:

- Geliştirme, test ve olası üretim (production) ortamları arasında **birebir tutarlılık** sağlanmıştır.
- Redis gibi harici bir servisin yerel makineye kurulum yapılmadan, izole bir konteyner içerisinde çalıştırılması mümkün kılınmıştır.
- `docker-compose.yml` dosyası sayesinde, API ve Redis servisleri arasındaki ağ iletişimi (networking) ve başlatma sırası (`depends_on`) tek bir merkezi konfigürasyon dosyasından yönetilmiştir.
- Projenin başka bir geliştirici veya staj değerlendirme ortamında `docker-compose up --build` komutu ile saniyeler içinde, ek bir manuel kurulum gerektirmeden çalışır hâle getirilmesi hedeflenmiştir.

### 3.3. Redis Neden Eklendi?

Redis'in projeye dahil edilme gerekçesi, ilerleyen fazlarda (Faz 5) planlanan **önbellekleme (caching)** ve **oturum yönetimi (session management)** ihtiyaçlarına dönük altyapının şimdiden hazırlanmasıdır. Bellek içi (in-memory) veri tabanlarının cache yönetimindeki önemi şu şekilde özetlenebilir: Klasik ilişkisel veritabanlarına (PostgreSQL/Supabase) her istekte doğrudan erişim, disk I/O gecikmesi nedeniyle performans maliyeti oluşturmaktadır. Redis, sık erişilen verileri (örneğin kullanıcı oturum bilgileri, sık sorgulanan görev/proje listeleri) RAM üzerinde tutarak, bu verilere milisaniyeler seviyesinde erişim sağlamakta ve veritabanı üzerindeki yükü azaltmaktadır. Bu sayede, sistemin ölçeklenebilirliği (scalability) ve kullanıcı deneyiminin yanıt hızı (response time) doğrudan iyileştirilmesi hedeflenmiştir.

## 4. Yapılan Teknik İşlemler

Teknik uygulama süreci sırasıyla şu adımlarla gerçekleştirilmiştir:

1. **Proje İskeletinin Kurulması:** Terminal üzerinden `npx @nestjs/cli new backend --package-manager npm` komutu çalıştırılarak, npm paket yöneticisi kullanılan standart bir NestJS proje iskeleti `backend/` dizini altında oluşturulmuştur.

2. **Konteynerizasyon (Dockerfile):** `backend/Dockerfile` içerisinde **çok aşamalı (multi-stage) build** stratejisi uygulanmıştır. İlk aşamada (`builder`) `node:20-alpine` imajı temel alınarak bağımlılıklar (`npm install`) kurulmuş ve TypeScript kodu `npm run build` komutuyla derlenerek `dist/` klasörüne çıktı üretilmiştir. İkinci aşamada ise, yalnızca derlenmiş çıktı (`dist`) ve üretim bağımlılıkları (`node_modules`) temiz bir `node:20-alpine` imajına kopyalanarak, gereksiz geliştirme dosyalarından arındırılmış, daha küçük ve güvenli bir çalışma zamanı imajı elde edilmiştir. Uygulama, konteyner içerisinde `CMD ["node", "dist/main"]` komutuyla 3000 portu üzerinden dinlemeye alınmıştır.

3. **Servislerin Orkestrasyonu (docker-compose.yml):** Proje kök dizininde tanımlanan `docker-compose.yml` dosyasında iki servis yapılandırılmıştır:
   - `api` servisi, `./backend` dizinindeki `Dockerfile` build edilerek oluşturulmuş, `3000:3000` port eşlemesiyle dışa açılmış ve `REDIS_HOST=redis`, `REDIS_PORT=6379` ortam değişkenleriyle Redis servisine işaret eder şekilde yapılandırılmıştır.
   - `redis` servisi, resmi `redis:alpine` imajı kullanılarak tanımlanmış ve `6379:6379` port eşlemesiyle dışa açılmıştır.
   - `depends_on` direktifi ile `api` servisinin, `redis` servisi başlatıldıktan sonra ayağa kalkması sağlanmıştır. Docker Compose'un kendi iç ağı (`stajprojesi_default` network) sayesinde, `api` konteyneri Redis'e `redis` servis adını host olarak kullanarak (DNS çözümlemesiyle) erişebilir hâle getirilmiştir; bu sayede iki konteyner birbiriyle IP adresi bilgisine gerek kalmadan haberleşebilmektedir.

4. **Build Sürecinin Optimizasyonu:** İlk build denemesinde, `backend/` dizininde bir `.dockerignore` dosyasının bulunmaması nedeniyle `node_modules` klasörünün build context'ine dahil edildiği ve bu durumun build süresini önemli ölçüde uzattığı tespit edilmiştir. Bu sorunun çözümü için `backend/.dockerignore` dosyası oluşturulmuş; `node_modules`, `dist`, `.git`, `test` ve `coverage` gibi dizinler context dışına alınarak build performansı önemli ölçüde artırılmıştır.

5. **Ortam Değişkenlerinin Standardizasyonu:** Proje kök dizininde bir `.env.example` şablonu hazırlanmış; `PORT`, `SUPABASE_URL`, `SUPABASE_KEY`, `REDIS_HOST` ve `REDIS_PORT` değişkenleri tanımlanarak, projeye dahil olacak diğer geliştiricilerin gerekli ortam değişkenlerini kolayca yapılandırabilmesi hedeflenmiştir.

6. **Doğrulama (Verification):** `docker-compose up --build -d` komutu çalıştırılarak her iki servis arka planda (detached mode) başlatılmıştır. `docker-compose ps` çıktısı ile `nestjs_api` ve `redis_cache` konteynerlerinin `Up` durumda olduğu teyit edilmiştir. Ardından `http://localhost:3000` adresine yapılan bir HTTP GET isteği ile `200 OK` durum kodu ve `"Hello World!"` yanıtı alınmış, bu sonuçla NestJS uygulamasının Docker konteyneri içerisinde başarıyla çalıştığı ve dış dünyadan erişilebilir olduğu doğrulanmıştır.

7. **Versiyon Kontrolü:** Proje kök dizininde `git init` komutuyla Git deposu başlatılmıştır. `node_modules`, `dist` ve `.env` gibi dosyaların versiyon kontrolüne dahil edilmemesi için bir `.gitignore` dosyası oluşturulmuş, ardından `chore: initial nestjs and docker setup` mesajıyla ilk commit atılarak projenin başlangıç durumu kayıt altına alınmıştır.

---

**Sonuç:** Bugün itibarıyla, projenin Faz 1 hedefleri olan NestJS tabanlı backend iskeletinin kurulması, Docker ile konteynerize edilmesi ve Redis servisiyle entegre edilmesi başarıyla tamamlanmıştır. Elde edilen altyapı, bir sonraki fazda gerçekleştirilecek olan Supabase bağlantısı ve Swagger dokümantasyon entegrasyonu için hazır durumdadır.
