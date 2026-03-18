# Faz 13 — Senaryo ve Simülasyon Motoru

## Amaç
"Ne olurdu?" analizleri yapabilecek bir simülasyon motoru kurmak. Kullanıcının farklı senaryoları deneyerek finansal etkilerini görmesini sağlamak.

## Kapsam
**Yapılacak:**
- Simülasyon servis katmanı
- Senaryolar: ekstra tahsilat, farklı kart ödemesi, abonelik iptali, asgari ödeme, gelir değişikliği
- `/simulations` sayfası
- Senaryo karşılaştırma (mevcut durum vs simülasyon)

**Yapılmayacak:**
- AI destekli senaryo önerisi (Faz-12 ile birlikte kullanılabilir ama zorunlu değil)
- Otomatik senaryo çalıştırma

## Mevcut Durum Analizi
- `card-engine/interest-engine.ts`'de `simulateMinimumPaymentTrap` fonksiyonu var → genişletilebilir
- Genel simülasyon motoru **yok**

## Veri Modeli Etkisi
Yeni kalıcı model gerekmez. Simülasyon sonuçları geçicidir. İsteğe bağlı olarak `Simulation` tablosu eklenebilir.

## Backend İşleri

### Servis: `lib/simulation-engine.ts`
```typescript
interface SimulationInput {
  type: 'extra_collection' | 'card_payment_change' | 'cancel_subscription' |
        'minimum_only' | 'income_change' | 'custom'
  params: Record<string, number | string>
}

interface SimulationResult {
  currentState: FinancialSnapshot
  projectedState: FinancialSnapshot
  cashImpact: number
  debtImpact: number
  riskImpact: string
  timeline: TimelinePoint[]  // 3 aylık projeksiyon
  recommendation: string
}

simulateExtraCollection(userId, amount): Promise<SimulationResult>
simulateCardPaymentChange(userId, cardId, newAmount): Promise<SimulationResult>
simulateCancelSubscriptions(userId, subscriptionIds): Promise<SimulationResult>
simulateMinimumOnlyPayments(userId, months): Promise<SimulationResult>
simulateIncomeChange(userId, newIncome): Promise<SimulationResult>
runSimulation(userId, input: SimulationInput): Promise<SimulationResult>
```

## Frontend İşleri

### Sayfa: `/simulations`
- Senaryo tipi seçimi (kartlar)
- Her senaryo kartı: açıklama, parametre girişi, "Simüle Et" butonu
- Sonuç: mevcut vs simülasyon karşılaştırma tablosu
- Nakit etkisi, borç etkisi, risk etkisi, önerilen aksiyon

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1, Faz-2, Faz-5
- **Opsiyonel:** Faz-3 (tahsilat simülasyonu), Faz-4 (abonelik iptal simülasyonu), Faz-7 (ödeme planı)

## Kabul Kriterleri
- [ ] En az 3 senaryo tipi çalışıyor
- [ ] Mevcut vs simülasyon karşılaştırması gösteriliyor
- [ ] 3 aylık projeksiyon hesaplanıyor

## Uygulama Sırası
1. `lib/simulation-engine.ts` oluştur
2. `app/simulations/page.tsx` ve bileşenler
3. Mevcut `simulateMinimumPaymentTrap`'ı entegre et
4. Navbar'a "Simülasyon" linki
5. Build doğrulama

## Sonraki Faz
→ `14-settings-expansion.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesine Senaryo/Simülasyon motoru ekle.

Adımlar:
1. lib/simulation-engine.ts oluştur (en az 5 senaryo tipi)
2. Mevcut card-engine/interest-engine.ts'deki simulateMinimumPaymentTrap'ı entegre et
3. app/simulations/page.tsx oluştur (senaryo kartları, parametre girişi, sonuç karşılaştırma)
4. Navbar'a "Simülasyon" linki ekle

Kurallar:
- Simülasyon sonuçları geçicidir, DB'ye kaydetme (opsiyonel)
- Mevcut verileri DEĞİŞTİRME, sadece oku ve simüle et
- Sonuçlarda: nakit etkisi, borç etkisi, risk etkisi, önerilen aksiyon
- npm run build ile doğrula
```
