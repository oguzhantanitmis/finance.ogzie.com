# Faz 15 — Test ve Doğrulama

## Amaç
Tüm kritik hesaplama servislerini, iş kurallarını ve veri akışlarını test ederek sistemin güvenilirliğini garanti altına almak. Özellikle para hesaplamalarında floating point hatalarından kaçınmak.

## Kapsam
**Yapılacak:**
- Birim testler: hesaplama servisleri (faiz, asgari ödeme, borç önceliklendirme, sağlık puanı)
- Entegrasyon testleri: tahsilat → gelir → bakiye zinciri, kart ödeme → bakiye düşüşü
- Edge case testleri: sıfır tutar, negatif bakiye, vade sınır durumları
- Decimal precision kontrolü
- Float → Decimal migration planı (opsiyonel, risk analizi)

**Yapılmayacak:**
- E2E testler (Playwright/Cypress)
- Performans testleri

## Mevcut Durum Analizi
- Projede **hiç test yok** (test dosyası bulunmadı)
- Test framework kurulu değil
- Hesaplama servisleri pure function'lar — test edilebilir yapıda

## Veri Modeli Etkisi
Test amacıyla opsiyonel: Mevcut `Float` alanlarının `Decimal` geçişinin risk analizi.

```
// Float → Decimal geçiş riski:
// - Prisma Decimal tipi JS'de Decimal.js objesi olarak gelir
// - Tüm aritmetik operasyonlar .toNumber() veya Decimal metodları gerektirir
// - Mevcut tüm hesaplama servisleri güncellenmeli
// - Bu geçiş KAPSAMLI bir refactor gerektirir → ayrı bir faz olarak yapılabilir
```

## Backend İşleri

### Test Framework Kurulumu
```bash
npm install -D vitest @testing-library/react
```

### Test Dosyaları

#### `__tests__/lib/banking-engine.test.ts`
- `calculateAccumulatedInterest`: bilinen değerlerle doğrulama
- `calculateMinPayment`: limit ≤ 50K → %20, > 50K → %40
- `calculateLoanSchedule`: toplam ödeme = anapara + faiz + vergi

#### `__tests__/lib/card-engine/interest-engine.test.ts`
- `calculateInterest`: (anapara × oran × gün) / 3000 doğrulaması
- `analyzeInterestForPeriod`: tam ödeme → faiz yok, asgari → akdi faiz, asgari altı → akdi + gecikme
- `simulateMinimumPaymentTrap`: borç kapanma süresi makul mü

#### `__tests__/lib/card-engine/payment-engine.test.ts`
- `allocatePayment`: 6 katmanlı dağıtım sırası doğru mu
- `previewPayment`: ödeme sonrası kalan borç doğru mu

#### `__tests__/lib/health-score-service.test.ts`
- Borçsuz kullanıcı → 90+ puan
- Aşırı borçlu → 20- puan
- Edge: hiç veri yok → 50 puan

#### `__tests__/lib/debt-priority-engine.test.ts`
- Safe mod: asgari ödemeler ilk sırada
- Avalanche: en yüksek faiz first
- Snowball: en küçük borç first
- Nakit < asgariler → risk uyarısı

#### `__tests__/lib/receivable-payable-service.test.ts`
- Tahsilat → kalan tutar düşüyor
- Tam tahsilat → status CLOSED
- remainingAmount > originalAmount → hata

### İş Kuralı Doğrulama Senaryoları

**Kritik Zincir 1: Tahsilat**
```
1. Mehmet'e 80.000 TL alacak var
2. 10.000 TL tahsilat gir
3. ✅ Kalan alacak = 70.000
4. ✅ Gelir +10.000
5. ✅ Hesap bakiye +10.000
6. ✅ LedgerEntry (COLLECTION) oluşmuş
7. ✅ Status = PARTIAL
```

**Kritik Zincir 2: Kart Ödemesi**
```
1. Kart borcu 25.000, hesap bakiye 30.000
2. 15.000 TL ödeme yap
3. ✅ Kart borcu = 10.000
4. ✅ Hesap bakiye = 15.000
5. ✅ LedgerEntry (CARD_PAYMENT) oluşmuş
```

**Kritik Zincir 3: Abonelik**
```
1. Netflix 99.99 TL aylık, hesap bakiye 5.000
2. Ödeme kaydı gir
3. ✅ Hesap bakiye = 4.900.01
4. ✅ LedgerEntry (SUBSCRIPTION_PAYMENT) oluşmuş
```

## Frontend İşleri
Bu fazda frontend testi yapılmaz (E2E Faz-16'da opsiyonel).

## Kabul Kriterleri
- [ ] Vitest kurulu ve çalışıyor
- [ ] En az 30 birim test yazılmış
- [ ] Tüm hesaplama servisleri test edilmiş
- [ ] Kritik iş kuralı zincirleri doğrulanmış
- [ ] `npm run test` hatasız geçiyor

## Uygulama Sırası
1. Vitest kur ve yapılandır
2. `__tests__/` dizin yapısını oluştur
3. Hesaplama servisleri testlerini yaz
4. İş kuralı zincir testlerini yaz
5. `package.json`'a test script ekle
6. CI/CD uyumluluğu kontrol et

## Sonraki Faz
→ `16-final-polish-release-checklist.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesine test altyapısı ve birim testler ekle.

Adımlar:
1. npm install -D vitest
2. vitest.config.ts oluştur (path alias desteği ile)
3. __tests__/ dizin yapısını oluştur
4. Şu servisler için birim testler yaz:
   - banking-engine (faiz, asgari ödeme, kredi planı)
   - card-engine/interest-engine (akdi, gecikme, nakit avans faizi)
   - card-engine/payment-engine (dağıtım, önizleme)
   - health-score-service (puan hesaplama)
   - debt-priority-engine (3 strateji)
5. package.json'a "test": "vitest run" ekle
6. npm run test ile tüm testlerin geçtiğini doğrula

Kurallar:
- Pure function'ları mock'suz test et
- DB bağımlı testlerde mock prisma kullan
- Her test dosyasında en az 5 test case
- Edge case'leri kapsa: 0 tutar, negatif, sınır değerler
- Floating point hassasiyeti kontrol et (0.01 TL tolerans)
```
