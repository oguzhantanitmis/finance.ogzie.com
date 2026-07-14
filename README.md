# Ogzie Finans - Sistem Mimari Dokümantasyonu

Ogzie Finans, Türkiye piyasası ve bireysel finans ihtiyaçları için geliştirilmiş multi-user kişisel finans kokpitidir. Uygulama gelir-gider takibinin ötesinde hesap, varlık, kredi kartı, KMH, kredi, alacak/verecek, bütçe, hedef, rapor, piyasa verisi ve finans asistanı akışlarını tek kullanıcı hesabı altında izole biçimde yönetir.

Bu doküman internal teknik/handoff dokümanıdır. Yeni geliştirici veya ajan, sistemi anlamak, güvenli değişiklik yapmak, deploy etmek ve üretim hatalarını takip etmek için bu dosyayı başlangıç noktası olarak kullanmalıdır. Gerçek parola, API anahtarı, veritabanı bağlantısı veya özel kullanıcı şifresi bu dosyaya yazılmaz.

## Ürün Kapsamı

Ana hedef, kullanıcının finansal durumunu tek ekranda karar verilebilir hale getirmektir:

- Genel bakış: net pozisyon, nakit, borç, alacak, yaklaşan ödemeler ve piyasa kartları.
- Varlıklar: nakit, banka, döviz, altın, kripto, hisse, gayrimenkul ve diğer varlıklar.
- Hesaplar: banka hesapları, nakit cüzdanları, KMH/Esnek Hesap bilgileri ve ledger hareketleri.
- Kişiler: kişi bazlı alacak/verecek, taksit, kısmi ödeme, not ve timeline.
- Borçlar: manuel borçlar, ihtiyaç kredileri, KMH, kredi kartları ve ödenmesi gereken borçlar.
- Kartlar: kredi kartı limitleri, hareketler, ekstreler, asgari ödeme ve faiz kayıtları.
- Bütçe: planlanan gelir, sabit yük, borç baskısı, serbest nakit ve yaklaşan yükümlülükler.
- Ödeme planı: borç kapatma stratejileri ve kayıtlı ödeme planları.
- Hedefler, sağlık skoru, raporlar, simülasyonlar ve finans asistanı.
- Admin: superuser tarafından kullanıcı oluşturma, silme, SMTP testleri ve kullanıcı durum takibi.

## Teknik Mimari

Uygulama Next.js App Router tabanlıdır. Sayfalar `app/**/page.tsx`, mutasyonlar çoğunlukla Server Actions, dış entegrasyonlar ve AI gibi HTTP girişleri API route olarak çalışır.

Ana katmanlar:

- UI: `components/**` altında sayfa workspace bileşenleri, tablo/kart bileşenleri ve ortak shell yapısı. `components/ui/**` altında shadcn/ui primitive'leri (button/input/label/checkbox; Radix + CVA) ve proje-içi ortak bileşenler bulunur; shadcn semantik utility'leri `app/globals.css`'teki `@theme inline` token köprüsü ile projenin runtime tasarım değişkenlerine bağlanır (dark/light korunur).
- Route katmanı: `app/**` altında sayfalar, server action dosyaları ve API route dosyaları.
- Domain servisleri: `lib/**` altında finans hesaplama, veri okuma/yazma, rapor, risk, piyasa ve auth servisleri.
- Veri katmanı: Prisma Client üzerinden MySQL/MariaDB uyumlu `DATABASE_URL`.
- Auth: NextAuth Credentials provider, JWT session stratejisi ve middleware koruması.
- Deploy: GitHub main branch push sonrası Vercel production deployment.

Önemli runtime kararları:

- `proxy.ts` tüm korumalı route'ları login arkasına alır.
- `/admin` ve `/ai` sadece `SUPERUSER` rolüne veya primary superuser e-postasına açıktır.
- Server tarafında güvenlik için `getCurrentUser`, `requireCurrentUser`, `requireSuperuser` kullanılmalıdır.
- Client tarafındaki görünürlük kontrolleri tek güvenlik katmanı değildir; server action ve API route içinde tekrar yetki kontrolü yapılmalıdır.

## Auth, RBAC ve Multi-User İzolasyonu

Kullanıcı modeli `User` tablosudur. Roller `USER` ve `SUPERUSER` olarak tutulur.

Primary superuser:

- `oguzhan@tanitmis.com` primary superuser hesabıdır.
- `resolveUserRole` bu e-postayı her zaman `SUPERUSER` olarak çözer.
- Primary superuser admin panelinden silinemez.

RBAC davranışı:

- Normal kullanıcılar kendi finans verilerini görür ve yönetir.
- Normal kullanıcılar admin panelini ve AI finans asistanını göremez/kullanamaz.
- Superuser kullanıcı oluşturabilir, silebilir, SMTP test e-postası gönderebilir ve global sağlayıcı ayarlarını yönetebilir.

Tenant izolasyonu:

- Finansal kayıtların ana sahiplik alanı `userId` kolonudur.
- Query'lerde kullanıcı kapsamı her zaman session kullanıcısının `id` değeri ile filtrelenmelidir.
- Kullanıcı silme akışı bağlı finans verilerini transaction içinde temizler.
- IDOR riskini önlemek için action/API katmanında sadece id ile kayıt aranmamalı; `id + userId` birlikte doğrulanmalıdır.

## Veri Modeli

Prisma schema ana model grupları:

- Kullanıcı ve erişim: `User`, `UserRole`.
- Varlık ve piyasa: `Asset`, `AssetType`, `MarketRate`.
- Borç: `Debt`, `DebtType`, `PaymentPlan`.
- İşlem ve bütçe: `Transaction`, `BudgetMonth`, `BudgetAlert`, `IncomeSource`, `Subscription`, `RecurringExpense`.
- Kredi kartı: `CreditCard`, `CardStatement`, `CardTransaction`, `CardInstallment`, `CardPayment`, `InterestAccrual`, `CreditCardInterestRecord`.
- Kişi ve alacak/verecek: `Person`, `ReceivablePayable`, `RPTransaction`, `RPInstallment`, `RPRecordNote`, `RPRecordEvent`.
- Hesap ve ledger: `Account`, `LedgerEntry`.
- Ayarlar ve sistem: `AppSettings`, `CardFinanceSettings`.
- Planlama ve analiz: `FinancialGoal`, `HealthSnapshot`, `AIInsight`, `AIRecommendation`, `SavedPaymentPlan`, `Snapshot`.

Migration sırası repo içinde `prisma/migrations/**` altında tutulur. Yeni migration eklendiğinde production deploy öncesi Prisma Client üretimi ve migration uygulama akışı doğrulanmalıdır.

## Finans Modülleri ve Veri Akışı

Dashboard verisi `dashboard-service`, `monthly-planner`, `market-data` ve ilgili domain servislerinden beslenir. Dashboard hesapları doğrudan ham tablolardan değil, servislerin normalize ettiği özetlerden okunmalıdır.

Borçlar sayfası farklı kaynakları tek görünümde birleştirir:

- Manuel borç ve kredi kayıtları `Debt` ve `PaymentPlan`.
- Kredi kartları `CreditCard` ve son ekstre/veri hareketlerinden hesaplanır.
- KMH borcu `Account` üzerinde tutulan eksi bakiye ve KMH ekstre alanlarından gelir.
- Kişisel verecek/alacak kayıtları `ReceivablePayable` üzerinden yansır.
- "Ödemen gereken borçlar" paneli kredi taksidi, KMH asgari ve kart asgarisini tek ödeme yükümlülüğü listesinde toplar.

Bütçe borç baskısı, Borçlar sayfasındaki ödeme yükümlülüğü kaynağıyla aynı mantığı kullanmalıdır. Eski manuel borç tahminleri kredi/kart/KMH ile çift sayılmamalıdır.

Ledger yaklaşımı:

- Hesap hareketleri `LedgerEntry` ile izlenir.
- Kart ödemeleri, KMH ödemeleri, alacak tahsilatı ve kişiye ödeme gibi aksiyonlar ilgili kaynak kaydıyla birlikte ledger etkisi üretmelidir.
- Nakit/hareket etkisi olmayan salt görüntüleme değişiklikleri ledger üretmemelidir.

## Hesaplama Motorları

Finans hesaplamaları `lib/banking-engine.ts`, `lib/card-balance.ts`, `lib/debt-views.ts`, `lib/monthly-planner.ts`, `lib/debt-priority-engine.ts`, `lib/health-score-service.ts` ve benzeri servislerde tutulur.

KMH / Esnek Hesap:

- Akdi faiz ve gecikme faizi aylık oran ile günlük hesaplanır.
- Günlük faiz formülü: `anapara * aylık oran * gün / 3000`.
- KKDF ve BSMV faiz üstüne eklenir; varsayılan oranlar %15 + %15'tir.
- Dönem borcu: anapara borcu + dönem faizi/vergi.
- Zorunlu asgari: anapara borcunun %5'i + dönem faizi/vergi.
- Son ödeme geçerse gecikme artışı anapara borcu üzerinden günlük hesaplanır.
- Yapı Kredi Esnek Hesap PDF değerleri ekstre verisi olarak saklanır; tahmini değer ekstre yerine geçmez.

Kredi:

- Eşit taksitli kredi planı anapara, aylık faiz ve vergi oranlarıyla hesaplanır.
- Taksit tablosunda faiz, KKDF, BSMV, anapara ve kalan anapara ayrı gösterilir.
- Aynı taksit numarasına ait eski seed/veri tekrarları normalize edilerek tek ödeme planı görünümü üretilir.

Kredi kartı:

- Güncel borç kart hareketleri ve ödemelerden hesaplanır.
- Asgari ödeme, kart ayarlarında tutulan oranlara göre hesaplanır.
- Gecikmiş asgari ödemelerde gecikme maliyeti faiz/vergi hareketi olarak karta işlenir.
- Kart faiz ayarları `CardFinanceSettings` ile kullanıcı bazlı tutulur.

Bütçe:

- Planlanan gelir, sabit yük ve borç baskısı aylık özet üretir.
- Gelir/bütçe alanı elle girilmişse elle girilen değer önceliklidir.
- Borç baskısı hesaplanırken kredi taksidi, KMH asgari, kart asgari ve yapılacak kişi ödemeleri birlikte değerlendirilir.

Piyasa değerleme:

- TL varlıklar doğrudan tutar olarak alınır.
- Döviz ve altın varlıklar `MarketRate` tablosundaki son başarılı CollectAPI verisiyle TL'ye çevrilir.
- Veri çekilemezse son başarılı kayıt stale olarak kullanılabilir; kullanıcıya sağlayıcı uyarısı gösterilir.

## Entegrasyonlar

CollectAPI:

- Piyasa kartları USD, EUR, GBP, gram altın ve isteğe bağlı diğer altın serilerinden beslenir.
- API anahtarı env üzerinden veya encrypted `AppSettings` üzerinden okunur.
- Sağlayıcı ayarları primary superuser sahibinden okunur; normal kullanıcı anahtarı görmez.
- Cache süresi ayarlanabilir, eksik veri durumunda son başarılı kayıt korunur.

SMTP:

- Admin panelinden kullanıcı oluşturulduğunda SMTP konfigürasyonu varsa giriş bilgileri e-posta ile gönderilir.
- SMTP yoksa kullanıcı oluşturma devam eder, sadece mail gönderilmez.
- SMTP test e-postası sadece superuser tarafından gönderilebilir.

OpenAI / Finans asistanı:

- `/ai` ve `/api/ai` superuser-only çalışır.
- OpenAI anahtarı yoksa deterministik yerel finans asistanı cevapları kullanılabilir.
- AI promptları kullanıcı finans bağlamı ile compose edilir; normal kullanıcıya AI yüzeyi kapalıdır.

GitHub / Vercel:

- Main branch push production deployment tetikler.
- Vercel build komutu `npm run build:vercel`.
- Deployment sonrası `finance.ogzie.com` alias'ının yeni deployment'a döndüğü kontrol edilmelidir.
- Runtime loglarda hata olup olmadığı deployment URL üzerinden kontrol edilmelidir.

ogzie veri kanalı (ingest):

- `app/api/ogzie-ingest`: ogzie (app.ogzie.com) → finance **tek-yönlü, imzalı** veri kanalı. ogzie kendi domain maliyetlerini + müşteri gelir/giderlerini buraya gönderir; idempotent `LedgerEntry` (`source='ogzie'`) olarak yazılır.
- Doğrulama **fail-closed**: ogzie ÖZEL Ed25519 anahtarıyla imzalar, finance yalnız `OGZIE_FINANCE_PUSH_PUBLIC_JWK` (PUBLIC) ile doğrular. Özel anahtar finance'a HİÇ verilmez. NextAuth middleware'inden muaftır (kendi imza-auth'u vardır).
- Effectively-once: `OgzieIngestBatch.batchId` UNIQUE + `LedgerEntry (source, externalId)` UNIQUE + ±300s zaman tazeliği. `source='ogzie'` route tarafında enjekte edilir (gövdeden alınmaz).
- Para birimi TRY değilse CollectAPI kuruyla TRY'ye çevrilir (`SUPPORTED_FX` allowlist). `OGZIE_INGEST_USER_ID` olayların hangi kullanıcıya yazılacağını belirler (yoksa reddedilir).
- Öngörü (forecast) satırları gerçekleşen toplam/özet/export'tan **her zaman** dışlanır; İşlem Defteri listesinde varsayılan gizlidir (`?forecast=1` ile gösterilir, "Öngörü" rozeti).

## Ortam Değişkenleri

Zorunlu temel değişkenler:

```bash
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
APP_URL
APP_SETTINGS_SECRET
```

Opsiyonel entegrasyon değişkenleri:

```bash
COLLECTAPI_API_KEY
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_BASE_URL
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
SMTP_REPLY_TO
OGZIE_FINANCE_PUSH_PUBLIC_JWK
OGZIE_FINANCE_PUSH_AUDIENCE
OGZIE_INGEST_USER_ID
```

> `OGZIE_FINANCE_PUSH_*` + `OGZIE_INGEST_USER_ID`: ogzie → finance imzalı ingest kanalı (yukarıdaki "ogzie veri kanalı"). `OGZIE_FINANCE_PUSH_PUBLIC_JWK` yalnız **public** Ed25519 anahtarıdır; özel anahtar finance'a girmez. Yoksa `/api/ogzie-ingest` fail-closed reddeder.

Seed için kullanılan değişkenler:

```bash
SEED_SUPERUSER_EMAIL
SEED_SUPERUSER_PASSWORD
```

Notlar:

- Production'da `APP_SETTINGS_SECRET` sabit ve güçlü olmalıdır; değiştirilirse encrypted ayarlar okunamaz.
- `.env.example` sadece placeholder içermelidir.
- Gerçek env değerleri repo içine commit edilmez.

## Kurulum ve Lokal Çalışma

Temel kurulum:

```bash
npm install
npm run db:update
npm run dev
```

Veritabanı işlemleri:

```bash
npm run prisma -- migrate deploy
npm run db:generate
npm run db:push
```

Build:

```bash
npm run build
npm run build:production
```

Bu projede production odaklı çalışılır. Kullanıcı özellikle local test istemediyse değişiklikler için local dev server açılmamalıdır; gerekli durumlarda statik doğrulama ve Vercel deployment kontrolü tercih edilir.

## Operasyon ve Bakım

Önerilen değişiklik akışı:

1. Önce ilgili domain servislerini ve Prisma model ilişkilerini oku.
2. En küçük güvenli değişikliği yap.
3. `docs/CHANGELOG.md` içine tamamlanan adımı yaz.
4. Uygun statik doğrulamayı çalıştır.
5. Commit, push, Vercel deployment ve log kontrolü yap.

Yaygın doğrulamalar:

```bash
git diff --check
npx tsc --noEmit
npm run lint
npm run test
```

Dokümantasyon-only değişikliklerde `git diff --check` yeterlidir; kod değişmediği için lint/build zorunlu değildir.

Veri onarım scriptleri:

- `scripts/repair-yapikredi-data.mjs` Yapı Kredi İhtiyaç kredisi ve Yapı Kredi KMH ekstre verisini üretim kullanıcısı için düzeltmek amacıyla kullanılır.
- Onarım scriptleri manuel, kontrollü ve üretim verisi etkilediği bilinerek çalıştırılmalıdır.

## Geliştirme Kuralları

- Kullanıcı verisi tenant dışına sızmamalıdır.
- Admin ve AI akışları server-side superuser kontrolü olmadan açılmamalıdır.
- Finans hesaplarında tek kaynaklı veri tercih edilir; aynı borç farklı modüllerde çift sayılmamalıdır.
- Piyasa ve banka verilerinde ekstre/resmi veri tahminden üstündür.
- Hesaplamalar kullanıcıya anlaşılır satırlara bölünmelidir: anapara, faiz, vergi, asgari, gecikme, güncel borç.
- Schema/migration değişikliklerinde geriye dönük veri uyumluluğu düşünülmelidir.
- UI sadece gizleme amacıyla güvenlik sağlamaz; tüm mutasyonlarda server-side doğrulama gerekir.
- Gerçek secret, kişisel şifre, API key veya production connection string dokümana veya loga yazılmaz.

## Önemli Dosyalar

- `app/**`: route, page, action ve API girişleri.
- `app/login/page.tsx`: animasyonlu karakter tasarımlı giriş ekranı; gerçek NextAuth `signIn` + 5 mod (login/forgot/forgot-sent/reset/reset-done) korunur.
- `components/**`: kullanıcı arayüzü ve workspace bileşenleri.
- `components/ui/**`: shadcn/ui primitive'leri (button/input/label/checkbox) + proje-içi ortak bileşenler.
- `app/globals.css`: master tasarım tokenları + shadcn `@theme inline` token köprüsü (dark/light).
- `lib/auth.ts`, `lib/authz.ts`, `lib/server-auth.ts`: authentication ve authorization.
- `lib/debt-views.ts`: borç kaynaklarını tek görünüm ve ödeme yükümlülüğü haline getirir.
- `lib/banking-engine.ts`: KMH, faiz, kredi ve temel finans hesapları.
- `lib/market-data.ts`, `lib/evds-service.ts`: CollectAPI piyasa verisi ve rate cache akışı.
- `lib/monthly-planner.ts`: bütçe özeti ve yaklaşan ödeme yükümlülükleri.
- `prisma/schema.prisma`: veri modeli.
- `components/OgzieSsoLoader.tsx`: ogzie SSO yükleme animasyonu — taşınabilir, prop'larla yapılandırılan tek dosyalık şablon.
- `docs/ogzie-sso-loader/`: yukarıdaki şablonun diğer ogzie sistemlerine taşınması için teslim paketi (README + örnek entegrasyon dosyaları).
- `docs/CHANGELOG.md`: tamamlanan teknik değişikliklerin kısa kayıtları.
