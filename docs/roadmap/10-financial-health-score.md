# Faz 10 — Finansal Sağlık Puanı

## Amaç
0-100 arası bir finansal sağlık puanı hesaplayarak dashboard'da görsel olarak göstermek. Puanın neden bu seviyede olduğunu açıklamak ve iyileştirmek için 3 somut öneri sunmak.

## Kapsam
**Yapılacak:**
- Mevcut `finance-risk-score.ts`'i genişleterek kapsamlı sağlık puanı hesaplama
- Puan kriterleri: kart limit kullanımı, borç/gelir oranı, asgari ödeme bağımlılığı, geciken borçlar, sabit gider yükü, aylık nakit fazlası/açığı
- HealthSnapshot kaydı (tarihsel trend için)
- Dashboard'daki placeholder'ı doldurma
- Puan detay modalı

**Yapılmayacak:**
- AI yorumu (Faz-12)
- Puan karşılaştırma (benchmark)

## Mevcut Durum Analizi
- `finance-risk-score.ts` mevcut: 0-100 puan, leverage/likidite/kart kullanım analiziyle 5 seviye
- Dashboard'da gösterilmiyor
- `HealthSnapshot` modeli Faz-1'de oluşturulmuş
- İyileştirme önerileri kısıtlı (sadece warnings dizisi)

## Veri Modeli Etkisi
Faz-1'deki `HealthSnapshot` modeli kullanılır.

## Backend İşleri

### Servis: `lib/health-score-service.ts`
```typescript
interface HealthScoreResult {
  score: number                // 0-100
  level: string                // CRITICAL | HIGH | MODERATE | GOOD | EXCELLENT
  breakdown: ScoreBreakdown    // Her kriter puanı
  improvements: string[]       // 3 öneri
  trend: 'improving' | 'declining' | 'stable'
}

interface ScoreBreakdown {
  creditUtilization: { score: number, weight: number, detail: string }
  debtToIncomeRatio: { score: number, weight: number, detail: string }
  minPaymentDependency: { score: number, weight: number, detail: string }
  overduePayments: { score: number, weight: number, detail: string }
  fixedExpenseRatio: { score: number, weight: number, detail: string }
  monthlyCashSurplus: { score: number, weight: number, detail: string }
}

calculateHealthScore(userId): Promise<HealthScoreResult>
saveSnapshot(userId, result): Promise<HealthSnapshot>
getScoreTrend(userId, months: number): Promise<HealthSnapshot[]>
generateImprovements(breakdown): string[]
```

### Puan Hesaplama Ağırlıkları
| Kriter | Ağırlık | İdeal | Tehlikeli |
|--------|---------|-------|----------|
| Kart limit kullanımı | %20 | < %30 | > %80 |
| Borç/gelir oranı | %25 | < %30 | > %80 |
| Asgari ödeme bağımlılığı | %15 | Tüm kartlar tam ödeniyor | Tümü asgari |
| Geciken borç/tahsilatlar | %15 | Yok | 3+ gecikme |
| Sabit gider yükü | %10 | < %40 gelir | > %70 gelir |
| Aylık nakit fazlası | %15 | > %20 gelir | Açık veriyor |

## Frontend İşleri

### Dashboard Entegrasyonu
- `HealthScoreGauge` bileşenini doldur (Faz-8'de placeholder eklenmişti)
- Dairesel gauge (score + seviye rengi)
- Altında 3 öneri maddesi
- Tıklandığında detay modalı

### Bileşenler
1. `HealthScoreGauge` — dairesel puan göstergesi (SVG veya CSS)
2. `ScoreBreakdownCard` — kriter bazlı detay
3. `ImprovementTips` — 3 öneri listesi
4. `ScoreTrendChart` — tarihsel trend (mini LineChart)

## Dashboard / Rapor Etkisi
Dashboard'daki placeholder doldurulur. Rapor sayfasına sağlık trendi eklenir.

## Ayarlar Etkisi
Yok.

## AI Etkisi
Faz-12'de AI sağlık puanını yorumlayacak.

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1 (HealthSnapshot), Faz-2 (hesaplar), Faz-5 (kart verileri), Faz-8 (dashboard placeholder)
- **Opsiyonel:** Faz-3 (geciken tahsilatlar), Faz-4 (abonelik yükü)

## Kabul Kriterleri
- [ ] Puan 0-100 arası doğru hesaplanıyor
- [ ] 6 kriter ağırlıklı hesaplama çalışıyor
- [ ] Dashboard'da gauge görüntüleniyor
- [ ] 3 iyileştirme önerisi anlamlı
- [ ] HealthSnapshot kaydediliyor
- [ ] Tarihsel trend görüntülenebiliyor

## Test Senaryoları

### Mutlu Senaryo
- Borçsuz kullanıcı → puan 90+, level: EXCELLENT
- Aşırı borçlu kullanıcı → puan 20-, level: CRITICAL

### Edge Case
- Hiç veri yok → puan 50 (nötr), "Veri yok" uyarısı
- Gelir 0 → borç/gelir oranı hesaplanamaz → default ceza

## Uygulama Sırası
1. `lib/health-score-service.ts` oluştur
2. `HealthScoreGauge` bileşenini gerçek veriyle doldur
3. `ScoreBreakdownCard` + `ImprovementTips` oluştur
4. Dashboard entegrasyonu
5. HealthSnapshot kayıt mekanizması (cron veya sayfa yüklendiğinde)
6. Build doğrulama

## Tahmini Riskler
- Kriter ağırlıklarının yanlış kalibrasyonu → test verileriyle düzelt
- Mevcut `finance-risk-score.ts` ile çakışma → genişlet, silme

## Sonraki Faz
→ `11-goals-motivation-system.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesine Finansal Sağlık Puanı sistemi ekle.

Adımlar:
1. lib/health-score-service.ts oluştur (6 kriterli ağırlıklı puan, 0-100, 3 öneri)
2. Mevcut finance-risk-score.ts'i SİLME, yeni servis onun üzerine inşa edilsin
3. Dashboard'daki HealthScoreGauge placeholder'ını gerçek veriyle doldur
4. ScoreBreakdownCard ve ImprovementTips bileşenleri oluştur
5. HealthSnapshot kaydet (sayfa yüklendiğinde kontrol et, günde 1 kez)

Kurallar:
- Ağırlıklı puan hesaplaması: kart kullanım %20, borç/gelir %25, asgari bağımlılık %15, gecikme %15, sabit gider %10, nakit fazlası %15
- Puan sonucunda 3 somut, aksiyon odaklı iyileştirme önerisi üret
- SVG veya CSS ile dairesel gauge oluştur
- Mevcut dashboard kodunu bozmadan entegre et
- npm run build ile doğrula
```
