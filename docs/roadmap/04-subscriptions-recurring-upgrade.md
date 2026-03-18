# Faz 4 — Abonelik ve Düzenli Giderler Genişletmesi

## Amaç
Mevcut abonelik ve düzenli gider modüllerini genişleterek zorunlu/isteğe bağlı ayrımı, tasarruf analizi, kategori bazlı raporlama ve "bu ay iptal edersem ne tasarruf ederim?" özelliklerini eklemek.

## Kapsam
**Yapılacak:**
- Abonelik detay modalı (düzenleme)
- İsteğe bağlı abonelik işaretleme (`isEssential` alanı Subscription'a ekleme)
- "İptal edersem tasarruf" hesaplama servisi
- Kategori bazlı abonelik/gider raporu
- Yaklaşan abonelik ödemeleri listesi iyileştirmesi
- Gereksiz abonelik uyarısı (insight-engine genişletmesi)
- Abonelik ödeme kaydının hesap bakiyesine yansıması

**Yapılmayacak:**
- Yeni veri modeli oluşturma (mevcut Subscription ve RecurringExpense yeterli)
- AI entegrasyonu (Faz-12)
- Dashboard entegrasyonu (Faz-8)

## Mevcut Durum Analizi
- **Subscription modeli** iyi tasarlanmış: marka zenginleştirme, normalize tutar, billingCycle, autopay, status, notes var
- **RecurringExpense modeli** yeterli: isEssential ayrımı mevcut
- **Subscription'da isEssential yok** — eklenmeli
- Abonelik düzenleme UI'ı yok, sadece ekleme ve silme var
- Ödeme kaydı hesap bakiyesine yansımıyor
- Tasarruf analizi yok

## Veri Modeli Etkisi

### Subscription modeline alan ekleme
```prisma
model Subscription {
  // ... mevcut alanlar
  isEssential   Boolean   @default(false)  // YENİ
  linkedAccountId String?                   // YENİ — ödeme hesabı
}
```

Migration: `prisma migrate dev --name add_subscription_fields`

## Backend İşleri

### Servis: `lib/subscription-analysis-service.ts`
```typescript
// Tasarruf analizi
calculateSavingsIfCancelled(subscriptionIds: string[]): Promise<SavingsAnalysis>
  // { monthlyBefore, monthlyAfter, monthlySavings, yearlySavings }

// Kategori bazlı dağılım
getCategoryBreakdown(userId): Promise<CategoryBreakdown[]>
  // { category, count, monthlyTotal, yearlyTotal, percentage }

// İsteğe bağlı abonelik toplamı
getOptionalSubscriptionTotal(userId): Promise<number>

// Gereksiz abonelik tespiti (insight-engine'a eklenecek)
detectUnusedSubscriptions(userId): Promise<UnusedSubscriptionAlert[]>
```

### Mevcut Servis Genişletmeleri
- `insight-engine.ts`'e gereksiz abonelik uyarısı ekle
- `monthly-planner.ts`'de abonelik yükünü zorunlu/isteğe bağlı olarak ayır

### Server Actions Güncellemesi — `app/actions.ts`
```typescript
export async function updateSubscription(id: string, formData: FormData)
export async function recordSubscriptionPayment(subscriptionId: string, accountId: string)
```

### İş Kuralları
1. Abonelik ödeme kaydı girildiğinde seçilen hesap bakiyesi düşmeli
2. LedgerEntry (type: SUBSCRIPTION_PAYMENT) oluşmalı
3. İsteğe bağlı abonelikler AI önerilerinde "tasarruf alanı" olarak kullanılacak
4. Yıllık aboneliklerin aylık normalize tutarı raporlarda gösterilecek

## Frontend İşleri

### Mevcut Sayfa Güncellemeleri

#### `/subscriptions` sayfası iyileştirmeleri
- Her abonelik kartına "Düzenle" butonu ekle
- "Zorunlu / İsteğe Bağlı" toggle
- Kategori bazlı gruplandırma seçeneği
- Toplam zorunlu vs isteğe bağlı ayrımı kartları

#### Yeni bileşenler
1. `SubscriptionEditModal` — düzenleme modalı
2. `SavingsAnalysisCard` — "bu abonelikleri iptal edersen X tasarruf edersin"
3. `CategoryPieChart` — kategori dağılım grafiği (Recharts)
4. `SubscriptionPaymentModal` — ödeme kaydı + hesap seçimi

### Kullanıcı Akışları
1. **Tasarruf analizi**: İsteğe bağlı abonelikleri seç → "İptal edersem?" butonu → tasarruf hesabı göster
2. **Ödeme kaydı**: Abonelik kartında "Ödendi" → hesap seç → bakiye düşer, LedgerEntry oluşur

## Dashboard / Rapor Etkisi
- Faz-8'de: zorunlu vs isteğe bağlı abonelik kartları
- Faz-9'da: kategori bazlı abonelik raporu

## Ayarlar Etkisi
Doğrudan yok.

## AI Etkisi
- İsteğe bağlı abonelikler AI'ın "tasarruf önerisi" için veri kaynağı olacak (Faz-12)

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1 (model), Faz-2 (Account — ödeme yansıması için)
- **Opsiyonel önceki:** —
- **Sonraki:** Faz-8 (Dashboard), Faz-9 (Raporlar), Faz-12 (AI)

## Kabul Kriterleri
- [ ] Abonelik düzenlenebiliyor
- [ ] isEssential alanı çalışıyor
- [ ] Tasarruf analizi doğru hesaplanıyor
- [ ] Kategori bazlı dağılım gösteriliyor
- [ ] Ödeme kaydı hesap bakiyesini düşürüyor
- [ ] LedgerEntry oluşuyor

## Test Senaryoları

### Mutlu Senaryo
- 5 abonelik ekle (3 zorunlu, 2 isteğe bağlı)
- İsteğe bağlı 2'sini seç → tasarruf analizi göster
- Bir aboneliği "ödendi" işaretle → hesap bakiyesi düşer

### Edge Case
- Yıllık abonelik iptalinde 12 aylık tasarruf gösterimi
- USD cinsinden abonelik ve TL hesap

## Uygulama Sırası
1. Migration: Subscription'a isEssential ve linkedAccountId ekle
2. `lib/subscription-analysis-service.ts` oluştur
3. `insight-engine.ts`'e gereksiz abonelik uyarısı ekle
4. SubscriptionWorkspace bileşenini genişlet (düzenleme, tasarruf analizi)
5. Ödeme kaydı akışını ekle
6. Test ve build doğrulama

## Tahmini Riskler
- Mevcut Subscription verileri isEssential default false alacak — doğru davranış
- SubscriptionWorkspace büyük bileşen, dikkatli refactor gerekli

## Sonraki Faz
→ `05-credit-card-global-settings.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesindeki abonelik ve düzenli gider modüllerini genişlet.

Adımlar:
1. Subscription modeline isEssential (Boolean, default false) ve linkedAccountId (String?, optional) alanlarını ekle
2. prisma migrate dev --name add_subscription_fields
3. lib/subscription-analysis-service.ts oluştur (tasarruf analizi, kategori dağılımı)
4. insight-engine.ts'e gereksiz abonelik uyarısı ekle
5. SubscriptionWorkspace.tsx'e düzenleme modalı ekle
6. Tasarruf analizi kartı ekle
7. Ödeme kaydı akışı ekle (hesap seçimi + LedgerEntry)

Kurallar:
- Mevcut SubscriptionWorkspace.tsx'i OKUYARAK genişlet, sıfırdan yazma
- Mevcut marka zenginleştirme mantığını koru
- AccountSelect bileşenini import et (Faz-2'den)
- Ödeme kaydında Prisma $transaction kullan
- npm run build ile doğrula
```
