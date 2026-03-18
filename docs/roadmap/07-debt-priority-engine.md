# Faz 7 — Borç Önceliklendirme Motoru

## Amaç
Bu ay elimdeki paraya göre hangi borçları hangi sırayla ödemem gerektiğini hesaplayan akıllı bir motor kurmak. İki strateji sunmak: Güvenli Mod (asgari ödemeleri garanti altına al) ve Borç Kapatma Modu (en verimli şekilde borç azalt). Kullanıcıya net, aksiyon odaklı bir ödeme planı önermek.

## Kapsam
**Yapılacak:**
- Borç önceliklendirme servis katmanı
- İki strateji: Güvenli Mod ve Borç Kapatma Modu (avalanche / snowball)
- Ödeme planı öneri sayfası (`/payment-plan`)
- Manuel override desteği
- Önerilen vs gerçekleşen ödeme kıyaslaması
- Ödeme planı kaydetme

**Yapılmayacak:**
- Otomatik ödeme yapma
- AI destekli strateji seçimi (Faz-12)
- Geçmiş ödeme planlarının analizi (Faz-9)

## Mevcut Durum Analizi
- Mevcut sistemde ödeme önceliklendirme motoru **yok**
- `monthly-planner.ts` borç baskısını hesaplıyor ama sıralama yapmıyor
- `card-engine/payment-engine.ts`'de asgari ödeme hesabı var ama multi-kart optimizasyonu yok
- `banking-engine.ts`'de `calculateMinPayment` fonksiyonu mevcut

## Veri Modeli Etkisi
Yeni model gerekmez. Mevcut `Debt`, `CreditCard`, `Account` modelleri yeterli.

Opsiyonel: Kayıtlı ödeme planı için tablo
```prisma
model SavedPaymentPlan {
  id            String   @id @default(cuid())
  userId        String
  month         DateTime
  strategy      String   // "SAFE", "AVALANCHE", "SNOWBALL"
  totalAvailable Float
  planData      Json     // Tüm ödeme detayları
  isApplied     Boolean  @default(false)
  createdAt     DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

## Backend İşleri

### Servis: `lib/debt-priority-engine.ts`

```typescript
interface DebtItem {
  id: string
  name: string
  type: 'credit_card' | 'loan' | 'kmh' | 'personal' | 'receivable_payable'
  totalDebt: number
  minimumPayment: number
  interestRate: number  // aylık
  dueDate: Date
  daysUntilDue: number
  isOverdue: boolean
}

interface PaymentRecommendation {
  debtId: string
  debtName: string
  recommendedAmount: number
  reason: string         // "Asgari ödeme", "En yüksek faiz", "En küçük borç"
  priority: number       // 1 = en öncelikli
  type: 'minimum' | 'extra'
}

interface PaymentPlan {
  strategy: string
  totalAvailableCash: number
  totalMinimumRequired: number
  remainingAfterMinimums: number
  recommendations: PaymentRecommendation[]
  totalAllocated: number
  unallocatedCash: number
  riskWarnings: string[]
  improvementImpact: string // "Bu planla toplam borcunuz X TL azalacak"
}

// Ana fonksiyonlar
function collectAllDebts(userId): Promise<DebtItem[]>
  // Debt tablosundan + CreditCard tablosundan birleşik liste

function calculateSafeMode(debts: DebtItem[], availableCash: number): PaymentPlan
  // 1. Tüm asgari ödemeler
  // 2. Son ödeme tarihi en yakın olanlar
  // 3. Gecikmeye düşecek borçlar
  // 4. Yüksek faizliler

function calculateAvalancheMode(debts: DebtItem[], availableCash: number): PaymentPlan
  // 1. Tüm asgari ödemeler
  // 2. Kalan parayı en yüksek faizli borca yönlendir

function calculateSnowballMode(debts: DebtItem[], availableCash: number): PaymentPlan
  // 1. Tüm asgari ödemeler
  // 2. Kalan parayı en küçük borçtan başlayarak yönlendir

function generatePlan(userId, strategy, availableCash?, manualOverrides?): Promise<PaymentPlan>
function savePlan(userId, plan): Promise<SavedPaymentPlan>
function compareWithActual(userId, month): Promise<ComparisonResult>
```

### İş Kuralları
1. Önce tüm asgari ödemeler garanti altına alınmalı
2. Asgari toplamı > kullanılabilir nakit → RİSK UYARISI
3. Gecikmiş borçlar her modda en öncelikli
4. Avalanche: toplam maliyeti minimize eder (matematiksel olarak en verimli)
5. Snowball: psikolojik motivasyon sağlar (küçük kazanımlar)
6. Manuel override: kullanıcı belirli bir borca sabit tutar atayabilir

## Frontend İşleri

### Sayfa: `/payment-plan`
- Strateji seçici: "Güvenli Mod" | "Borç Kapatma (Yüksek Faiz)" | "Borç Kapatma (Küçük Borç)"
- Kullanılabilir nakit girişi (hesap bakiyelerinden otomatik doldur)
- Ödeme planı tablosu:
  - Borç adı, toplam borç, asgari ödeme, önerilen ödeme, neden, öncelik sırası
- Özet kartları:
  - Toplam serbest nakit
  - Zorunlu minimum ödeme toplamı
  - Asgari sonrası kalan
  - Tahmini iyileşme etkisi
- Riskli alanlar kırmızı ile işaretli
- "Bu planı kaydet" butonu
- "Bu planı uygula" → ödeme girişlerine yönlendir

### Bileşenler
1. `StrategySelector` — strateji seçim kartları
2. `PaymentPlanTable` — ödeme önerisi tablosu
3. `PlanSummaryCards` — özet kartlar
4. `RiskWarningBanner` — risk uyarıları
5. `ManualOverrideInput` — belirli borç için manuel tutar

## Dashboard / Rapor Etkisi
- Faz-8: "Bu ay önerilen ödeme planı" kartı

## Ayarlar Etkisi
- Faz-14: Varsayılan ödeme stratejisi seçimi

## AI Etkisi
- Faz-12: AI strateji önerisi verebilecek

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1, Faz-2 (hesap bakiyeleri), Faz-5 (kart asgari ödeme)
- **Opsiyonel önceki:** Faz-3 (kişi borçları da dahil edilsin)
- **Sonraki:** Faz-8 (Dashboard), Faz-12 (AI), Faz-13 (Simülasyon)

## Kabul Kriterleri
- [ ] 3 strateji doğru çalışıyor (Safe, Avalanche, Snowball)
- [ ] Asgari ödemeler her modda garanti altında
- [ ] Kullanılabilir nakit < asgari toplamı → risk uyarısı
- [ ] Manuel override çalışıyor
- [ ] Ödeme planı kaydedilebiliyor
- [ ] Tahmini iyileşme etkisi hesaplanıyor

## Test Senaryoları

### Mutlu Senaryo
- 3 kredi kartı (borçlar: 10K, 25K, 50K; faizler: %3.5, %4.42, %4.75)
- Kullanılabilir nakit: 15.000 TL
- Güvenli Mod: tüm asgariler + kalan en yakın vadeye
- Avalanche: tüm asgariler + kalan %4.75'lik karta
- Snowball: tüm asgariler + kalan 10K borçlu karta

### Edge Case
- Kullanılabilir nakit = 0 → sadece uyarı
- Tek borç → hepsi ona
- Tüm borçlar gecikmiş → sıralama nasıl olacak?

## Uygulama Sırası
1. SavedPaymentPlan modelini schema'ya ekle, migrate et
2. `lib/debt-priority-engine.ts` oluştur
3. `app/payment-plan/page.tsx` sayfası oluştur
4. `components/payment-plan/` altında bileşenler
5. Navbar'a "Ödeme Planı" linki ekle
6. Test et: 3 strateji doğru hesaplıyor mu?
7. Build doğrulama

## Tahmini Riskler
- Farklı borç tiplerinin asgari ödeme hesaplarının farklı olması → standart arayüz gerekli
- Faiz oranı karşılaştırması: aylık vs yıllık karışıklık
- Kart borcu hesaplamasının `getCardCurrentDebt` bağımlılığı

## Sonraki Faz
→ `08-dashboard-upgrade.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesine Borç Önceliklendirme Motoru ekle.

Adımlar:
1. SavedPaymentPlan modelini Prisma schema'ya ekle, migrate et
2. lib/debt-priority-engine.ts oluştur:
   - collectAllDebts: Debt + CreditCard birleşik borç listesi
   - calculateSafeMode: önce asgari, sonra yakın vade, sonra yüksek faiz
   - calculateAvalancheMode: önce asgari, kalan → en yüksek faiz
   - calculateSnowballMode: önce asgari, kalan → en küçük borç
   - generatePlan: strateji + nakit → plan
   - savePlan: planı kaydet
3. app/payment-plan/page.tsx oluştur (strateji seçimi, plan tablo, özet kartlar)
4. components/payment-plan/ altında bileşenler

Kurallar:
- Mevcut Debt ve CreditCard verilerini oku, değiştirme
- Account bakiyelerinden kullanılabilir nakit hesapla
- Asgari ödeme hesabı için mevcut card-engine ve banking-engine'ı kullan
- Asgari toplamı > nakit ise kırmızı uyarı göster
- UI: fintech-card, siyah tema, mobil uyumlu
- npm run build ile doğrula
```
