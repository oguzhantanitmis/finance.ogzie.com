# Faz 5 — Kredi Kartı Genel Faiz Ayarları

## Amaç
Kredi kartı faiz oranlarını kart kart değil, merkezi ayarlardan yönetmek. Türkiye'de faiz oranları genelde TCMB tarafından belirlenir ve tüm kartlarda aynıdır. Bu nedenle genel ayarlardan yönetilmeli. Kart bazlı override istendiğinde o da mümkün olmalı.

## Kapsam
**Yapılacak:**
- `CardFinanceSettings` servisi (genel faiz ayarları CRUD)
- Kredi kartı hesaplama motorunu (`card-engine`) genel ayarları kullanacak şekilde güncelle
- Kart bazlı faiz override mantığı: kart kendi oranı varsa onu kullan, yoksa genel ayarları kullan
- Kredi kartı hesap bakiyesine ödeme yansıması
- Son ödeme tarihi yaklaşan kartları öne çıkarma servisi

**Yapılmayacak:**
- Card-engine'ın temel mantığını değiştirmek (sadece veri kaynağını genişletmek)
- Yeni kredi kartı UI sayfası (mevcut `/cards` genişletilecek)
- Borç önceliklendirme (Faz-7)

## Mevcut Durum Analizi
- `CreditCard` modeli kart bazlı faiz oranlarını tutuyor (contractualRate, defaultRate, cashAdvanceRate, minPaymentRate, kkdfRate, bsmvRate)
- `card-engine/` dizini iyi ayrıştırılmış: interest-engine, payment-engine, statement-engine, tax-engine
- Faz-1'de `CardFinanceSettings` modeli tanımlanmış — bu fazda servisi ve entegrasyonu yazılacak
- `addCreditCard` action'ında oranlar kart bazlı hardcode ediliyor

**Riskler:**
- Mevcut kart verilerinde kart bazlı oranlar var — genel ayar geçişi smooth olmalı
- Card-engine fonksiyonlarının imzaları değişebilir

## Veri Modeli Etkisi
Faz-1'de oluşturulan `CardFinanceSettings` modeli kullanılır.

### CreditCard modeline küçük ekleme
```prisma
model CreditCard {
  // ... mevcut alanlar
  useGlobalRates  Boolean @default(true)  // YENİ — genel ayarları mı kullan?
}
```

## Backend İşleri

### Servis: `lib/card-finance-settings-service.ts`
```typescript
getOrCreateSettings(userId): Promise<CardFinanceSettings>
updateSettings(userId, data): Promise<CardFinanceSettings>
getEffectiveRates(card): Promise<EffectiveRates>
  // card.useGlobalRates ? globalSettings : kartınKendiOranları
```

### Card-Engine Güncellemesi
- `interest-engine.ts` → `getEffectiveRates()` kullanacak şekilde güncelle
- `payment-engine.ts` → minimum ödeme oranını settings'den al
- `statement-engine.ts` → faiz hesaplamalarında settings'i kullan

### Yeni Servis: `lib/card-priority-service.ts`
```typescript
getUpcomingDueCards(userId, days: number): Promise<CardDueSoon[]>
getHighUtilizationCards(userId, threshold: number): Promise<CardHighUtil[]>
getMinimumPaymentSummary(userId): Promise<{
  totalMinimum: number
  totalDebt: number
  cards: CardMinPaymentView[]
}>
```

### Server Actions — `app/cards/actions.ts` genişletmesi
```typescript
export async function updateCardFinanceSettings(formData: FormData)
export async function makeCardPaymentWithAccount(data: {
  creditCardId: string, amount: number, accountId: string, description?: string
})
```

### İş Kuralları
1. Kart ödemesi yapıldığında seçilen hesap bakiyesi düşmeli
2. LedgerEntry (type: CARD_PAYMENT) oluşmalı
3. `useGlobalRates = true` olan kartlar genel ayarlardan faiz hesaplamalı
4. Genel ayar değiştiğinde mevcut kart hesaplamaları otomatik güncellenmeli
5. Faiz geçmişi tutulabilir yapı (settings updatedAt + not alanı)

## Frontend İşleri

### Mevcut Sayfa Güncellemeleri

#### `/cards` sayfası iyileştirmeleri
- Son ödeme tarihi yaklaşan kartları üstte göster (kırmızı banner)
- Toplam asgari ödeme kartı
- Toplam kart borcu kartı
- Kart ödeme butonunda hesap seçimi

#### Yeni: Kart ayarları bölümü (Faz-14 ayarlar sayfasında da yer alacak)
- Genel akdi faiz oranı input
- Genel gecikme faiz oranı input
- Genel nakit avans faiz oranı input
- Asgari ödeme oranları (≤50k ve >50k)
- KKDF/BSMV oranları
- "Güncelle" butonu
- Son güncelleme tarihi gösterimi

## Dashboard / Rapor Etkisi
- Faz-8: kart toplam borcu, asgari ödeme toplamı, riskli kartlar

## Ayarlar Etkisi
- Kart finans ayarları Faz-14'te ayarlar sayfasına da entegre edilecek

## AI Etkisi
- Kart durumu AI context'ine eklenecek (Faz-12)

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1 (CardFinanceSettings modeli), Faz-2 (Account)
- **Sonraki:** Faz-7 (Borç önceliklendirme), Faz-8 (Dashboard)

## Kabul Kriterleri
- [ ] Genel faiz ayarları kaydedilebiliyor
- [ ] `useGlobalRates = true` olan kartlar genel ayarları kullanıyor
- [ ] Kart ödemesi hesap bakiyesini düşürüyor
- [ ] LedgerEntry oluşuyor
- [ ] Son ödeme yaklaşan kartlar öne çıkıyor
- [ ] Toplam asgari ödeme doğru hesaplanıyor
- [ ] Mevcut card-engine fonksiyonları hata vermeden çalışıyor

## Test Senaryoları

### Mutlu Senaryo
1. Genel ayarları güncelle (akdi: 4.42 → 4.75)
2. useGlobalRates=true olan kartın faiz hesabı yeni oranı kullanmalı
3. useGlobalRates=false olan kart kendi oranını kullanmalı
4. Kart ödemesi yap → hesap bakiye düşer, LedgerEntry oluşur

### Edge Case
- Genel ayar olmadan kart oluşturma → default değerler kullanılmalı
- Sıfır borçlu kart → asgari ödeme 0

## Uygulama Sırası
1. Migration: CreditCard'a useGlobalRates ekle
2. `lib/card-finance-settings-service.ts` oluştur
3. `lib/card-priority-service.ts` oluştur
4. Card-engine dosyalarını güncelle (getEffectiveRates kullan)
5. `app/cards/actions.ts`'e yeni actions ekle
6. Kart sayfasını güncelle (ödeme + hesap seçimi, öncelikli kartlar)
7. Faiz ayarları UI bileşeni oluştur
8. Test ve build

## Tahmini Riskler
- Card-engine fonksiyon imzalarının değişmesi → mevcut çağrıları güncelle
- Mevcut kart verilerinde oranlar hardcode → useGlobalRates default true ile smooth geçiş

## Sonraki Faz
→ `06-unified-transaction-ledger.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesinde kredi kartı faiz ayarlarını merkezi yönetilebilir hale getir.

Kritik kural: Kart faiz oranları varsayılan olarak genel ayarlardan gelsin, kart bazlı override istenirse useGlobalRates=false ile mümkün olsun.

Adımlar:
1. CreditCard modeline useGlobalRates (Boolean, default true) ekle, migrate et
2. lib/card-finance-settings-service.ts oluştur (getOrCreate, update, getEffectiveRates)
3. lib/card-priority-service.ts oluştur (yaklaşan vade, yüksek kullanım, asgari ödeme toplamı)
4. card-engine/ dosyalarını güncelle: getEffectiveRates() kullanarak faiz hesapla
5. Kart ödemesine hesap seçimi ekle (Account + LedgerEntry)
6. /cards sayfasını güncelle (toplam borç kartı, asgari ödeme, yaklaşan vadeler)
7. Faiz ayarları UI bileşeni oluştur

Kurallar:
- Mevcut card-engine mantığını koru, sadece veri kaynağını genişlet
- addCreditCard action'ını bozmadan güncelle
- Mevcut kart verileri çalışmaya devam etmeli
- npm run build ile doğrula
```
