# Faz 9 — Raporlar ve Analitikler

## Amaç
Filtrelenebilir, tarih aralığı destekli ve görsel grafikler içeren kapsamlı raporlama sayfası oluşturmak. Kullanıcının finansal trendlerini, kategori dağılımlarını, tahsilat performansını ve borç azaltım trendini takip edebilmesi.

## Kapsam
**Yapılacak:**
- `/reports` sayfası
- Aylık gelir/gider raporu (grafik + tablo)
- Tahsilat performans raporu
- Kredi kartı kullanım raporu
- Abonelik dağılım raporu
- Borç azaltım trendi
- Net nakit akışı trendi
- Kategori bazlı gider analizi
- Kişi bazlı alacak/verecek raporu
- Filtreler: tarih aralığı, kişi, kategori, hesap, işlem türü

**Yapılmayacak:**
- PDF export (gelecek faz)
- AI analiz yorumu (Faz-12)

## Mevcut Durum Analizi
- `/analytics` sayfası mevcut ama çok basit: net değer, top-5 abonelik, top-5 sabit gider
- `Recharts` kütüphanesi zaten kurulu
- Raporlar için veri kaynağı LedgerEntry + modüller olacak

## Veri Modeli Etkisi
Yeni model gerekmez. Mevcut veriler üzerinden aggregation yapılır.

## Backend İşleri

### Servis: `lib/report-service.ts`
```typescript
// Gelir/Gider raporu
getIncomeExpenseReport(userId, startDate, endDate): Promise<MonthlyReport[]>

// Tahsilat performans raporu
getCollectionReport(userId, startDate, endDate): Promise<CollectionReport>

// Kredi kartı kullanım raporu
getCardUsageReport(userId): Promise<CardUsageReport[]>

// Abonelik dağılım raporu
getSubscriptionDistribution(userId): Promise<CategoryDistribution[]>

// Borç azaltım trendi
getDebtTrend(userId, months: number): Promise<DebtTrendPoint[]>

// Net nakit akışı trendi
getCashFlowTrend(userId, months: number): Promise<CashFlowPoint[]>

// Kategori bazlı gider analizi
getCategoryExpenseBreakdown(userId, startDate, endDate): Promise<CategoryBreakdown[]>

// Kişi bazlı alacak/verecek raporu
getPersonBalanceReport(userId): Promise<PersonBalance[]>
```

## Frontend İşleri

### Sayfa: `/reports`
Tab yapısı veya sidebar navigasyonlu rapor sayfası.

**Raporlar:**
1. **Gelir/Gider Trendi** — Recharts BarChart (aylık gelir vs gider)
2. **Nakit Akışı** — Recharts LineChart (aylık net akış trendi)
3. **Borç Azaltım** — Recharts AreaChart (toplam borç trendi)
4. **Kategori Dağılımı** — Recharts PieChart (gider kategorileri)
5. **Abonelik Dağılımı** — Recharts PieChart + tablo
6. **Kart Kullanımı** — Kart bazlı limit kullanım oranları bar chart
7. **Tahsilat Performansı** — Tahsil edilen / beklenen karşılaştırma
8. **Kişi Bazlı** — Kişilerin alacak/verecek durumu tablosu

### Filtre Çubuğu
- Tarih aralığı (bu ay, son 3 ay, son 6 ay, son 1 yıl, özel)
- Kategori seçimi
- Hesap seçimi
- İşlem türü filtreleme

### Bileşenler
1. `ReportTabs` — rapor tab navigasyonu
2. `DateRangeFilter` — tarih aralığı seçici
3. `IncomeExpenseChart` — bar chart bileşeni
4. `CashFlowChart` — line chart
5. `DebtTrendChart` — area chart
6. `CategoryPieChart` — pasta grafik
7. `ReportTable` — tablosal rapor gösterimi

## Dashboard / Rapor Etkisi
Bu faz raporları oluşturur. Mevcut `/analytics` sayfası korunur veya `/reports`'a yönlendirilir.

## Ayarlar Etkisi
Yok.

## AI Etkisi
- Faz-12'de AI rapor yorumları eklenebilir

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1, Faz-6 (LedgerEntry — raporların ana veri kaynağı)
- **Opsiyonel önceki:** Faz-3 (tahsilat raporu), Faz-4 (abonelik raporu), Faz-5 (kart raporu)
- **Sonraki:** Faz-12 (AI yorum)

## Kabul Kriterleri
- [ ] En az 5 rapor tipi çalışıyor
- [ ] Tarih aralığı filtresi doğru çalışıyor
- [ ] Grafikler Recharts ile düzgün render oluyor
- [ ] Veri yokken boş state mesajı gösteriliyor
- [ ] Mobil uyumlu

## Test Senaryoları

### Mutlu Senaryo
- 3 aylık veri var → gelir/gider bar chart 3 çubuk gösterir
- Kategori bazlı giderler → pie chart dağılımı gösterir

### Edge Case
- Veri olmayan dönem → boş grafik + "Veri bulunamadı"
- Tek kategoride tüm giderler → %100 pastası

## Uygulama Sırası
1. `lib/report-service.ts` oluştur
2. `components/reports/` altında chart bileşenleri
3. `app/reports/page.tsx` sayfası (tab yapılı)
4. Navbar'a "Raporlar" linki ekle
5. Mevcut `/analytics` sayfasını koru (veya redirect)
6. Build doğrulama

## Tahmini Riskler
- LedgerEntry verileri yoksa raporlar boş kalır → bridge/seed verileri
- Recharts performansı büyük veri setlerinde
- Tarih aralığı hesaplamalarında timezone sorunları

## Sonraki Faz
→ `10-financial-health-score.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesine kapsamlı raporlama sayfası ekle.

Adımlar:
1. lib/report-service.ts oluştur (en az 5 rapor fonksiyonu)
2. components/reports/ altında Recharts bileşenleri (BarChart, LineChart, PieChart, AreaChart)
3. app/reports/page.tsx oluştur (tab yapılı, filtrelenebilir)
4. DateRangeFilter bileşeni oluştur
5. Navbar'a "Raporlar" linki ekle

Kurallar:
- Mevcut Recharts kütüphanesini kullan (zaten kurulu)
- Raporlar LedgerEntry + modül verilerinden türetilsin
- Tarih aralığı filtresi: bu ay, son 3 ay, son 6 ay, son yıl, özel
- Grafiklerde siyah tema uyumlu renkler kullan
- Veri yokken boş state göster
- Mevcut /analytics sayfasını SİLME
- npm run build ile doğrula
```
