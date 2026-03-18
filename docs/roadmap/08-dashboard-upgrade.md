# Faz 8 — Dashboard Geliştirmesi

## Amaç
Dashboard'u tüm yeni modüllerin verilerini tek ekranda gösteren güçlü bir kontrol merkezine dönüştürmek. Kullanıcının finansal durumunu 10 saniyede kavrayabilmesi ve kritik aksiyonları hızla görebilmesi.

## Kapsam
**Yapılacak:**
- Dashboard kartlarını genişletme (toplam borç, alacak, net durum, kart borcu, asgari ödeme vb.)
- Yaklaşan ödemeler + yaklaşan tahsilatlar ayrımı
- Gecikmiş kalemler listesi
- Riskli kredi kartları
- AI öneri kutusu placeholder
- Borç kapatma hedef ilerleme çubuğu
- Son 5 işlem (LedgerEntry)
- Hızlı işlem butonları
- Finansal sağlık puanı göstergesi placeholder (Faz-10'da doldurulacak)

**Yapılmayacak:**
- AI öneri içeriği (Faz-12)
- Finansal sağlık puan hesaplama (Faz-10)
- Detaylı raporlar (Faz-9)

## Mevcut Durum Analizi
Mevcut dashboard şunları gösteriyor:
- Serbest nakit (büyük kart)
- AI özet header
- InsightFeed (AI içgörüleri)
- SummaryCards (planlanan gelir, sabit yük, borç baskısı, serbest nakit)
- Yaklaşan ödemeler (14 gün)
- Abonelik yükü + sabit gider yükü
- Kritik sinyaller (BudgetAlerts)
- Sistem önerisi (statik, monthly-planner verilerine dayalı)

**Eksikler:**
- Toplam borç / alacak / net durum yok
- Kredi kartı toplam borcu yok
- Tahsilat takibi yok
- Son işlemler yok
- Hızlı işlem butonları yok
- Sağlık puanı yok
- Borç hedef ilerleme yok

## Veri Modeli Etkisi
Yeni model gerekmez. Mevcut ve önceki fazlardaki modeller kullanılır.

## Backend İşleri

### Servis: `lib/dashboard-service.ts`
```typescript
interface DashboardData {
  // Özet kartlar
  totalDebt: number
  totalReceivables: number
  totalPayables: number
  netPosition: number // alacak - verecek
  monthlyRealizedIncome: number
  monthlyRealizedExpense: number
  monthlyCollections: number
  activeSubscriptionTotal: number
  creditCardTotalDebt: number
  creditCardMinPaymentTotal: number
  availableCash: number
  endOfMonthProjection: number

  // Listeler
  upcomingPayments: UpcomingItem[]
  upcomingCollections: UpcomingItem[]
  overdueItems: OverdueItem[]
  riskyCards: RiskyCard[]
  recentTransactions: LedgerEntry[] // son 5

  // Bileşenler
  healthScorePlaceholder: number | null
  goalProgress: GoalProgress | null
  weeklyProjection: ProjectionData | null
}

async function getDashboardData(userId: string): Promise<DashboardData>
```

### İş Kuralları
1. Dashboard verisi tek bir servis çağrısında toplanmalı (performans)
2. Paralel `Promise.all` ile veritabanı sorguları
3. Riskli kart = limit kullanımı > %80 veya son ödeme < 3 gün
4. Ay sonu projeksiyonu = mevcut bakiye + beklenen gelir - beklenen gider - borç ödemeleri

## Frontend İşleri

### Sayfa: `/` (Dashboard) — tam yeniden yapılandırma
**Layout: 3 bölüm**

#### Bölüm 1: Üst Özet Kartlar (grid)
| Kart | Değer | Renk |
|------|-------|------|
| Toplam Borç | totalDebt | red |
| Toplam Alacak | totalReceivables | emerald |
| Net Durum | netPosition | dinamik |
| Bu Ay Gelir | monthlyRealizedIncome | emerald |
| Bu Ay Gider | monthlyRealizedExpense | red |
| Kullanılabilir Nakit | availableCash | sky |
| Kart Toplam Borcu | creditCardTotalDebt | amber |
| Asgari Ödeme Toplamı | creditCardMinPaymentTotal | amber |
| Aktif Abonelik | activeSubscriptionTotal | violet |

#### Bölüm 2: Listeler (2 sütun grid)
**Sol sütun:**
- Yaklaşan ödemeler (mevcut genişletilmiş)
- Yaklaşan tahsilatlar (yeni)
- Gecikmiş kalemler (kırmızı vurgulu)

**Sağ sütun:**
- Kritik sinyaller (mevcut)
- Riskli kredi kartları (limit % göstergeli)
- AI öneri kutusu (placeholder)
- Borç kapatma hedef ilerleme çubuğu

#### Bölüm 3: Alt
- Son 5 işlem (LedgerEntry)
- Hızlı işlem butonları

### Hızlı İşlem Butonları
Floating action bar (alt kısımda veya yan tarafta):
1. 💰 Tahsilat Ekle → CollectionModal
2. 💳 Kart Ödemesi → CardPaymentModal
3. 📝 Gelir Ekle → IncomeModal
4. 🧾 Gider Ekle → ExpenseModal
5. 📋 Abonelik Ekle → SubscriptionModal

### Bileşenler
1. `DashboardSummaryGrid` — 9 kart grid
2. `UpcomingCollectionsList` — yaklaşan tahsilatlar
3. `OverdueItemsList` — gecikmiş kalemler
4. `RiskyCardsList` — riskli kartlar
5. `AIRecommendationBox` — AI öneri kutusu (placeholder)
6. `GoalProgressBar` — hedef ilerleme çubuğu (placeholder)
7. `RecentTransactions` — son 5 işlem
8. `QuickActionBar` — hızlı işlem butonları
9. `HealthScoreGauge` — sağlık puanı göstergesi (placeholder)

## Dashboard / Rapor Etkisi
Bu faz doğrudan dashboard'u yeniden yapılandırır.

## Ayarlar Etkisi
Yok.

## AI Etkisi
AI öneri kutusu placeholder olarak eklenir. İçerik Faz-12'de doldurulacak.

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1, Faz-2 (hesap bakiyeleri), Faz-3 (alacak/verecek), Faz-5 (kart borçları), Faz-6 (son işlemler)
- **Opsiyonel önceki:** Faz-4, Faz-7
- **Sonraki:** Faz-10 (sağlık puanı), Faz-11 (hedef ilerleme), Faz-12 (AI öneri)

## Kabul Kriterleri
- [ ] 9+ özet kartı doğru veri gösteriyor
- [ ] Yaklaşan ödemeler ve tahsilatlar ayrı listeleniyor
- [ ] Gecikmiş kalemler kırmızı vurguyla gösteriliyor
- [ ] Riskli kartlar listeleniyor
- [ ] Son 5 işlem görüntüleniyor
- [ ] Hızlı işlem butonları çalışıyor
- [ ] Mobil uyumlu
- [ ] Sayfa performansı iyi (tek servis çağrısı)

## Test Senaryoları

### Mutlu Senaryo
- Tüm modüllerden veri var → kartlar dolu, listeler dolu
- Tüm modüllerden veri yok → boş state mesajları

### Edge Case
- Çok uzun borç adları truncate olmalı
- Negatif net durum → kırmızı renk
- 0 asgari ödeme → "kart borcu yok" mesajı

## Uygulama Sırası
1. `lib/dashboard-service.ts` oluştur
2. Mevcut `app/page.tsx` YEDEKLE
3. Yeni dashboard bileşenlerini oluştur
4. `app/page.tsx`'i yeniden yapılandır (mevcut SummaryCards, InsightFeed korunabilir)
5. Hızlı işlem butonları ekle
6. Placeholder bileşenleri ekle (sağlık puanı, AI öneri, hedef ilerleme)
7. Mobil responsive test
8. Build doğrulama

## Tahmini Riskler
- Çok fazla veri çekme → N+1 sorgu problemi → paralel Promise.all kullan
- Mevcut dashboard'un tamamen bozulması → yedek al
- Placeholder bileşenler kafa karıştırabilir → "yakında" etiketi ekle

## Sonraki Faz
→ `09-reports-analytics.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com dashboard'unu genişlet.

Kritik: Mevcut app/page.tsx'i SİLME, yedekle ve üzerine inşa et. Mevcut Navbar, AIHeader, InsightFeed, SummaryCards bileşenlerini koru.

Adımlar:
1. lib/dashboard-service.ts oluştur (tek fonksiyon, tüm dashboard verisini toplar)
2. 9+ özet kartı grid'i oluştur (toplam borç, alacak, net durum, kart borcu, asgari, nakit vb.)
3. Yaklaşan tahsilatlar listesi ekle
4. Gecikmiş kalemler listesi ekle
5. Riskli kartlar listesi ekle
6. Son 5 işlem (LedgerEntry) ekle
7. Hızlı işlem butonları ekle (tahsilat, kart ödemesi, gelir, gider, abonelik)
8. Placeholder bileşenler: AI öneri kutusu, sağlık puanı, hedef ilerleme

Kurallar:
- Dashboard verisi Promise.all ile paralel çekilmeli
- Mevcut UI dilini koru (fintech-card, siyah tema, rounded)
- Tüm kartlar pozitif = yeşil, negatif = kırmızı
- Mobil uyumlu (grid responsive)
- npm run build ile doğrula
```
