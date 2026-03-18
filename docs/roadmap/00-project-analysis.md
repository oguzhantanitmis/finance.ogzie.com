# Faz 0 — Mevcut Proje Analizi

## Amaç
Mevcut finans uygulamasının mimari durumunu, veri modelini, servis katmanını, UI yapısını ve eksiklerini belgeleyerek sonraki geliştirme fazlarına sağlam bir temel oluşturmak.

## Kapsam
Bu fazda mevcut sistemin eksiksiz envanteri çıkarılır.
Bu fazda herhangi bir kod değişikliği **yapılmaz**.

---

## Mevcut Teknoloji Yığını

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Framework | Next.js (App Router) | 16.1.6 |
| Dil | TypeScript | 5.x |
| ORM | Prisma | 5.19 |
| Veritabanı | MySQL (MariaDB adaptör) | — |
| Auth | NextAuth v4 | 4.24 |
| UI | Tailwind CSS v4, Framer Motion | 4.x / 12.x |
| Grafikler | Recharts | 3.7 |
| İkonlar | Lucide React | 0.563 |
| Tarih | date-fns | 4.1 |
| HTTP | Axios | 1.13 |

---

## Mevcut Prisma Modelleri (18+ Model)

### Kullanıcı & Kimlik
- `User` — email/password ile giriş, riskScore, netWorth alanları

### Varlıklar
- `Asset` — nakit, banka, altın, döviz, kripto, gayrimenkul, alacak, diğer (AssetType enum)

### Borç Sistemi
- `Debt` — kredi kartı, kredi, KMH, kişisel, manuel borç tipleri
  - limit, cutOffDay, paymentDueDay, totalBalance, remainingBalance, interestRate, minPaymentRate, kkdfRate, bsmvRate
- `PaymentPlan` — taksitli ödeme planı (anapara, faiz, vergi ayrıştırmalı)

### İşlemler
- `Transaction` — gelir/gider kaydı (basit tip + kategori)

### Abonelikler & Düzenli Giderler
- `Subscription` — marka zenginleştirme, logo, normalize tutar desteği
- `RecurringExpense` — faturalar, kira vb. (zorunlu/isteğe bağlı ayrımı)
- `IncomeSource` — düzenli gelir kaynakları

### Bütçe & Uyarı
- `BudgetMonth` — aylık bütçe planı (gelir, sabit yük, borç, serbest nakit)
- `BudgetAlert` — otomatik oluşturulan uyarılar (yaklaşan ödeme, bütçe baskısı, yenileme)

### AI & İçgörü
- `AIInsight` — otomatik oluşturulan finansal içgörüler
- `FinanceJournal` — serbest form finans notları
- `Reminder` — basit hatırlatıcı

### Snapshot
- `Snapshot` — net değer, varlık/borç detay anlık görüntüsü

### Kredi Kartı Sistemi (Gelişmiş)
- `CreditCard` — kart kimliği, limitler, faiz oranları (akdi/gecikme/nakit avans), vergi oranları, asgari ödeme oranı
- `CardStatement` — dönem ekstre bilgileri
- `CardTransaction` — harcama, taksitli alışveriş, nakit avans
- `CardInstallment` — taksit detayı
- `CardPayment` — ödeme kaydı (dağıtım detayı JSON)
- `InterestAccrual` — faiz birikimi kaydı

---

## Mevcut Sayfalar & Rotalar

| Rota | Sayfa | Açıklama |
|------|-------|----------|
| `/` | Dashboard | Aylık kontrol merkezi: serbest nakit, yaklaşan ödemeler, uyarılar, öneri |
| `/ai` | AI Asistan | Basit chat UI, `/api/ai` endpoint'ine istek atar |
| `/analytics` | Finansal Analiz | Net değer, abonelik/sabit gider top-5 listesi |
| `/budget` | Bütçe Merkezi | Gelir kaynağı ekleme, aylık bütçe ayarlama, uyarılar, gelir listesi |
| `/cards` | Kredi Kartları | Kart listesi grid görünümü |
| `/cards/[id]` | Kart Detay | İşlem, ödeme, ekstre, faiz analizi |
| `/debts` | Borç Yönetimi | Borç tablosu, faiz/vergi/maliyet analizi |
| `/recurring` | Sabit Giderler | CRUD, aylık normalize etki |
| `/subscriptions` | Abonelikler | Marka zenginleştirmeli abonelik yönetimi |
| `/login` | Giriş | NextAuth email/password |

### API Rotaları
- `/api/ai` — AI chat endpoint
- `/api/auth/[...nextauth]` — NextAuth rotası
- `/api/subscription-enrich` — Abonelik marka zenginleştirme

---

## Mevcut Servis Katmanı

| Dosya | Sorumluluk |
|-------|-----------|
| `lib/monthly-planner.ts` | Aylık bütçe özeti hesaplama, yaklaşan yükümlülükler |
| `lib/finance-risk-score.ts` | 0-100 finansal risk skoru (leverage, likidite, kart kullanım) |
| `lib/insight-engine.ts` | Otomatik finansal içgörü üretimi |
| `lib/banking-engine.ts` | Faiz, kredi, net değer hesaplamaları |
| `lib/reminder-engine.ts` | BudgetAlert senkronizasyonu |
| `lib/finance-logic.ts` | Temel CC/KMH faiz hesabı |
| `lib/card-engine/interest-engine.ts` | Türk bankacılık faiz motoru (akdi, gecikme, nakit avans) |
| `lib/card-engine/payment-engine.ts` | 6 katmanlı ödeme dağıtım motoru |
| `lib/card-engine/statement-engine.ts` | Ekstre oluşturma ve durum yönetimi |
| `lib/card-engine/tax-engine.ts` | KKDF/BSMV vergi hesaplamaları |
| `lib/card-engine/types.ts` | Kart sistemi tip tanımları |
| `lib/subscription-enrichment.ts` | Abonelik marka tanıma |
| `lib/market-data.ts` | Piyasa verisi (kur, altın fiyatı) |
| `lib/utils.ts` | Para formatı, cn helper |
| `lib/ui-text.ts` | UI label formatları |
| `lib/auth.ts` + `lib/server-auth.ts` | NextAuth yapılandırması |

---

## Tespit Edilen Eksiklikler (Gap Analizi)

### 🔴 Bulunmuyor — Sıfırdan oluşturulması gereken modüller

| # | Eksik Alan | Etkisi |
|---|-----------|--------|
| 1 | **Alacak/Verecek Modülü** | Kişi bazlı borç/alacak takibi, tahsilat-gelir-bakiye entegrasyonu yok |
| 2 | **Hesap/Cüzdan Bakiye Sistemi** | Gerçek hesap bakiyeleri takip edilmiyor, serbest nakit tahmini |
| 3 | **Borç Önceliklendirme Motoru** | Ödeme sıralaması ve strateji önerisi yok |
| 4 | **Birleşik İşlem Defteri** | İşlemler dağınık, merkezi audit trail yok |
| 5 | **Finansal Sağlık Puanı (Dashboard)** | `finance-risk-score.ts` var ama dashboard'da gösterilmiyor |
| 6 | **Hedef/Motivasyon Sistemi** | Borç kapatma hedefi, ilerleme takibi yok |
| 7 | **Senaryo/Simülasyon Motoru** | "Ne olurdu?" analizleri yok (kart engine'da kısmi var) |
| 8 | **Ayarlar Sayfası** | Kullanıcı tercihleri, faiz ayarları, AI ayarları için sayfa yok |
| 9 | **OpenAI Entegrasyonu** | AI sayfası var ama gerçek GPT entegrasyonu ve context yok |
| 10 | **Raporlar & Analitikler** | Temel analiz var, filtrelenebilir raporlar yok |

### 🟡 Kısmen mevcut — Genişletilmesi gereken alanlar

| # | Alan | Mevcut | Eksik |
|---|------|--------|-------|
| 1 | Dashboard | Serbest nakit, uyarılar, yaklaşan ödemeler | Toplam borç/alacak, sağlık puanı, AI kutusu, kart borcu, tahsilat listesi |
| 2 | Abonelikler | CRUD, marka zenginleştirme, normalize tutar | Tasarruf analizi, gereksiz abonelik uyarısı |
| 3 | Kredi Kartları | Tam faiz/ekstre/ödeme motoru | Genel faiz ayarları (kart bazlı değil merkezi), ödeme önerisi |
| 4 | Risk Skoru | `finance-risk-score.ts` hesaplıyor | Dashboard'da görüntülenmiyor, iyileştirme önerisi yok |
| 5 | AI | Chat UI + basit endpoint | Context composer, prompt builder, veri tabanlı öneri, usage logger |
| 6 | Borçlar | CRUD + taksit planı | Tahsilat/ödeme hareket geçmişi, kişi ilişkisi |

### 🟢 Sağlam yapıda — Korunması gereken alanlar

- Kredi kartı faiz hesaplama motoru (card-engine)
- Aylık bütçe planlayıcı (monthly-planner)
- Abonelik zenginleştirme sistemi
- BudgetAlert uyarı mekanizması
- NextAuth kimlik doğrulama
- UI tasarım dili (fintech-card, siyah tema, modern tipografi)

---

## Mimari Tesbitler

### Güçlü Yanlar
- **Server Components ağırlıklı**: Sayfa verileri server-side'da çekiliyor, performans iyi
- **Server Actions kullanımı**: Form işlemleri temiz, revalidation düzgün
- **Tip güvenliği**: TypeScript + Prisma tipleri kullanılıyor
- **Modüler engine yapısı**: `card-engine/` iyi ayrıştırılmış

### Dikkat Gereken Noktalar
- `Float` kullanımı: Para hesaplamalarında `Float` tipi var, precision kaybı riski
- `userId` bazı modellerde opsiyonel: Migration uyumluluğu için ama güvenlik zafiyeti olabilir
- İki farklı auth pattern: `requireCurrentUser()` vs `getServerSession(authOptions)` → standardize edilmeli
- `finance-logic.ts` ile `card-engine/interest-engine.ts` bazı fonksiyonları çakışıyor
- Transaction modeli çok basit: tip sadece string, ilişki zayıf

---

## Veri Modeli Etkisi
Bu faz veri modeline dokunmaz. Analiz çıktısıdır.

## Backend İşleri
Yok. Salt analiz fazıdır.

## Frontend İşleri
Yok. Salt analiz fazıdır.

## Dashboard / Rapor Etkisi
Yok. Alt fazlarda ele alınacak.

## Ayarlar Etkisi
Yok. Faz-14'te ele alınacak.

## AI Etkisi
Yok. Faz-12'de ele alınacak.

## Bağımlılıklar
Yok. İlk faz olarak bağımsızdır.

## Kabul Kriterleri
- [x] Tüm Prisma modelleri belgelenmiş
- [x] Tüm sayfalar ve rotalar listelenmiş
- [x] Tüm servis dosyaları açıklanmış
- [x] Eksiklikler tespit edilmiş
- [x] Gap analizi yapılmış

## Test Senaryoları
Test gerektirmez. Dokümantasyon fazıdır.

## Uygulama Sırası
1. Repository klonla
2. Prisma şemasını oku
3. App directory yapısını tara
4. Lib servislerini analiz et
5. Eksiklikleri listele

## Tahmini Riskler
- Analiz eksik kalırsa sonraki fazlar hatalı planlanır
- Mevcut mimari kararların ardındaki nedenlerin bilinmemesi

## Sonraki Faz
→ `01-data-model-foundation.md` — Yeni modüller için veri modeli temeli

## Claude Code Uygulama Promptu
Bu faz uygulanmıştır. Analiz sonuçları bu dosyadadır.
