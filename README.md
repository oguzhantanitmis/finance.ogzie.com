# Ogzie Finans

Türkiye şartlarına göre tasarlanmış kişisel muhasebe, borç kapatma ve nakit akışı kokpiti.

Uygulama mevcut Next.js + Prisma mimarisi korunarak genişletildi. Amaç sadece gelir-gider listesi göstermek değil; alacak, verecek, taksit, gecikme, kredi kartı faizi, bütçe, hedef, piyasa verisi ve finans asistanını aynı karar ekranında birleştirmektir.

## Ana Özellikler

- CollectAPI tabanlı USD, EUR, GBP ve altın piyasa kartları
- Güvenli CollectAPI API anahtarı saklama ve cache destekli piyasa verisi
- Alacak / verecek kayıtları, taksit planı, kısmi ödeme, gecikme ve yeniden taksitlendirme
- Kayıt bazlı not, ödeme geçmişi ve timeline
- Nakit seçimi destekli gelir/gider işlem formu
- Kredi kartı limiti, güncel borç, asgari ödeme, son ödeme tarihi, faiz ve kart programı takibi
- Türkiye kart programları için görsel eşleşme altyapısı
- Aylık bütçe merkezi, TL formatlı para alanları ve planlanan/gerçekleşen nakit akışı
- Kartopu, çığ, nakit akışı, risk ve hedef odaklı borç ödeme stratejileri
- Hedef türleri ve hedefe göre ödeme kapasitesi analizi
- Profesyonel rapor özeti, detay kartları ve kişi/kart/borç bazlı analiz
- Deterministik finans asistanı intent sistemi
- Superuser kontrollü admin paneli ve kullanıcı bazlı veri izolasyonu
- SMTP ile yeni kullanıcı giriş bilgisi ve admin test e-postası gönderimi
- Açık/koyu tema değişkenleri ve legacy koyu input düzeltmeleri

## Kurulum

```bash
npm install
cp .env.example .env
npm run db:update
npm run dev
```

Geliştirme sunucusu varsayılan olarak `http://localhost:3000` adresinde çalışır.

## Ortam Değişkenleri

`.env` içinde en az aşağıdaki değerler gerekir:

```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
NEXTAUTH_SECRET="uzun-guvenli-secret"
NEXTAUTH_URL="http://localhost:3000"
APP_SETTINGS_SECRET="collectapi-ve-diger-sifreli-ayarlar-icin-uzun-secret"
```

`APP_SETTINGS_SECRET` tanımlanmazsa şifreli ayar kaydı için `NEXTAUTH_SECRET` veya `AUTH_SECRET` kullanılır. Production ortamında sabit ve güçlü bir `APP_SETTINGS_SECRET` kullanılması önerilir.

Admin panelinden kullanıcı oluşturma ve e-posta gönderimi için opsiyonel SMTP değerleri:

```bash
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="smtp-user"
SMTP_PASSWORD="smtp-password"
SMTP_FROM="Ogzie Finans <no-reply@finance.ogzie.com>"
SMTP_REPLY_TO="destek@finance.ogzie.com"
```

SMTP eksikse kullanıcı oluşturma devam eder, sadece giriş bilgisi e-postası gönderilmez. Finans asistanı ve AI çalışma durumu sadece `SUPERUSER` rolündeki hesaplara açıktır.

## Veritabanı Migration

Yeni kişisel muhasebe kokpiti için migration dosyası:

```bash
prisma/migrations/20260503010000_personal_finance_cockpit/migration.sql
```

Migration mevcut kayıtları silmez. Eski alacak/verecek kayıtları yeni alanlara geriye dönük doldurulur:

- `title` eski açıklamadan üretilir
- `principalAmount` ve `totalAmount` eski ana tutardan doldurulur
- `paidAmount` eski kalan tutara göre hesaplanır
- eski taksitli kayıtlar `INSTALLMENT`, diğerleri `ONE_TIME` olarak taşınır

Uygulamak için:

```bash
npm run db:update
```

## CollectAPI Ayarları

1. Ayarlar sayfasına gidin.
2. `CollectAPI Ayarları` bölümünde API anahtarını girin.
3. Gösterilecek piyasa kartlarını seçin.
4. Cache süresini belirleyin.
5. Dashboard'da `Piyasa Kartları` bölümünü kontrol edin.

API anahtarı yoksa dashboard hata vermez, `CollectAPI API anahtarı girilmedi` uyarısını gösterir. Veri çekilemezse son başarılı CollectAPI kaydı gösterilir.

CollectAPI entegrasyonu `Authorization: apikey <token>` header formatını kullanır. Döviz kartları `/economy/allCurrency`, altın kartları `/economy/goldPrice` endpointinden beslenir.

## Kişisel Muhasebe Kullanımı

### Alacak / Verecek

Kişi detayından yeni kayıt eklerken:

- `Bana borcu var / Alacak`
- `Benim borcum var / Verecek`
- tek seferlik, taksitli veya serbest ödeme planı
- risk seviyesi
- hatırlatma seçenekleri
- iç not ve açıklama

Taksitli kayıt oluşturulduğunda sistem taksitleri, hatırlatmaları ve timeline olaylarını otomatik üretir.

### Kısmi Ödeme

Taksit seçerek tahsilat veya ödeme girildiğinde:

- taksit ödenen/kalan tutarı güncellenir
- durum `Kısmi ödendi` veya `Ödendi` olur
- ana kayıt kalan tutarı güncellenir
- ödeme geçmişi ve timeline kaydı oluşur

### Kalanı Yeniden Taksitlendir

Kişi detayındaki `Kalanı Taksitlendir` aksiyonu ödenmiş taksitleri korur, açık taksitleri `Yeniden yapılandırıldı` durumuna alır ve kalan tutar için yeni plan oluşturur.

## Kredi Kartı Kullanımı

Kart ekleme formu banka, kart programı, kart ağı, limit, kullanılabilir limit, güncel borç, hesap kesim tarihi, son ödeme tarihi ve faiz oranlarını destekler.

Desteklenen kart ağı seçenekleri:

- Visa
- Mastercard
- Troy
- American Express

Kart programı eşleşmeleri `lib/card-visuals.ts` içinde yönetilir. Telifli görseller repo içine gömülmez; yerel asset eklemek için aşağıdaki klasörler hazırdır:

```bash
public/assets/cards
public/assets/banks
```

## Finans Asistanı

Asistan doğal dil sorularını önce yerel intent sistemiyle yanıtlar. Desteklenen başlıklar:

- kredi kartı faizi
- borç bitiş tahmini
- aylık ödeme ihtiyacı
- kişi bazlı alacak
- kişi/kurum bazlı verecek
- nakit akışı
- riskli borçlar
- hedef durumu
- rapor özeti

Yeterli veri yoksa açıkça `Bu hesaplama için yeterli veri yok` yaklaşımıyla cevap verir.

## Test ve Doğrulama

Çalıştırılan kontroller:

```bash
npx prisma format
npx prisma generate
npx tsc --noEmit
npm run test
npm run build
```

Son durumda TypeScript, Vitest ve production build başarılıdır. Repo genelindeki ESLint kontrolü, mevcut eski dosyalardaki `any`, `require`, kullanılmayan import ve React 19 lint kurallarına takılmaktadır; detaylar `TEST_REPORT.md` içindedir.
