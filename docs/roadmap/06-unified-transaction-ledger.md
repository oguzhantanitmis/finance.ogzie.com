# Faz 6 — Birleşik İşlem Defteri (Unified Transaction Ledger)

## Amaç
Tüm finansal hareketleri tek bir merkezi defterde toplamak. Gelir, gider, tahsilat, kişiye ödeme, kart ödemesi, abonelik ödemesi, borç ekleme, transfer ve bakiye düzeltme işlemlerinin hepsini `LedgerEntry` tablosunda tutarak tam bir finansal geçmişe ve audit trail'e sahip olmak.

## Kapsam
**Yapılacak:**
- LedgerEntry servis katmanı
- Tüm mevcut finansal işlemlerin LedgerEntry oluşturmasını sağlama
- Birleşik hareket geçmişi sayfası (`/transactions`)
- Filtre ve arama (tarih, tip, kategori, hesap, kişi)
- Mevcut `Transaction` modelinden `LedgerEntry`'ye bridge/adapter

**Yapılmayacak:**
- Mevcut `Transaction` modelini silmek (backward compatibility)
- Raporlama (Faz-9)
- Otomatik kategorizasyon (Faz-12 AI)

## Mevcut Durum Analizi
- `Transaction` modeli basit: sadece amount, type (string), category, description
- Kredi kartı işlemleri `CardTransaction` ve `CardPayment` olarak ayrı tutuluyor
- Tahsilat, kişiye ödeme gibi işlem tipleri hiç kayıt altında değil
- Abonelik ödemeleri izlenmiyor

**Mevcut Transaction modeli korunacak ama yeni işlemler LedgerEntry'ye yazılacak.**

## Veri Modeli Etkisi
Faz-1'de oluşturulan `LedgerEntry` modeli ve `LedgerEntryType` enum'u kullanılır. Ek model gerekmez.

## Backend İşleri

### Servis: `lib/ledger-service.ts`
```typescript
// Oluşturma
createEntry(userId, data: CreateLedgerEntryInput): Promise<LedgerEntry>

// Sorgulama
getEntries(userId, filters: LedgerFilter): Promise<PaginatedLedger>
getEntriesByAccount(accountId): Promise<LedgerEntry[]>
getEntriesByPerson(personId): Promise<LedgerEntry[]>
getEntriesByDateRange(userId, start, end): Promise<LedgerEntry[]>

// Özet
getMonthlySummary(userId, month): Promise<MonthlySummary>
  // { totalIncome, totalExpense, totalCollections, totalPayments, netFlow }

// Bridge: mevcut Transaction'lardan LedgerEntry'ye dönüşüm (tek seferlik migration)
bridgeExistingTransactions(userId): Promise<number> // oluşturulan entry sayısı
```

### Entegrasyon Noktaları
Önceki fazlardaki tüm finansal işlemler LedgerEntry oluşturmalı:

| Kaynak | İşlem | LedgerEntryType |
|--------|-------|-----------------|
| Faz-2 | Bakiye düzeltme | BALANCE_ADJUSTMENT |
| Faz-2 | Hesap transferi | TRANSFER (2 entry) |
| Faz-3 | Tahsilat | COLLECTION |
| Faz-3 | Kişiye ödeme | PAYMENT_TO_PERSON |
| Faz-4 | Abonelik ödemesi | SUBSCRIPTION_PAYMENT |
| Faz-5 | Kart ödemesi | CARD_PAYMENT |
| Mevcut | Manuel gelir | INCOME |
| Mevcut | Manuel gider | EXPENSE |
| Sonraki | Borç ekleme | DEBT_ADDITION |
| Sonraki | Borç ödemesi | DEBT_PAYMENT |

### İş Kuralları
1. Her LedgerEntry immutable olmalı (oluşturulduktan sonra değiştirilemez)
2. Silme yerine karşı entry oluşturulur (storno)
3. LedgerEntry oluşturma diğer servislerin sorumluluğundadır, bu servis sadece CRUD ve sorgulama yapar
4. Filtreleme performansı için index'ler kritik

## Frontend İşleri

### Sayfa: `/transactions`
- Kronolojik işlem listesi (en yeniden eskiye)
- Her satırda: tarih, tip ikonu, açıklama, kategori, tutar (+/-), hesap
- Filtreler:
  - Tarih aralığı (date picker)
  - İşlem tipi (çoklu seçim)
  - Hesap
  - Kişi
  - Kategori
- Arama: açıklama içinde
- Aylık özet kartı (toplam gelir, toplam gider, net)
- Sayfalama (infinite scroll veya pagination)

### Bileşenler
1. `LedgerEntryRow` — tek satır (tip ikonu, renkli tutar, detay bilgileri)
2. `LedgerFilters` — filtre çubuğu
3. `LedgerMonthlySummary` — aylık gelir/gider/net kartı
4. `LedgerSearch` — arama kutusu

### İşlem Tipi İkon/Renk Haritası
| Tip | İkon | Renk |
|-----|------|------|
| INCOME | ArrowDownLeft | emerald-400 |
| EXPENSE | ArrowUpRight | red-400 |
| COLLECTION | HandCoins | emerald-400 |
| PAYMENT_TO_PERSON | Send | amber-400 |
| CARD_PAYMENT | CreditCard | sky-400 |
| SUBSCRIPTION_PAYMENT | Repeat | violet-400 |
| TRANSFER | ArrowLeftRight | zinc-400 |
| BALANCE_ADJUSTMENT | Settings | zinc-500 |

## Dashboard / Rapor Etkisi
- Faz-8'de: son 5 işlem listesi dashboard'da
- Faz-9'da: tüm raporlar LedgerEntry üzerinden çalışacak

## Ayarlar Etkisi
Doğrudan yok.

## AI Etkisi
- AI, LedgerEntry'leri context olarak kullanarak finansal analiz yapacak (Faz-12)

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1 (LedgerEntry modeli), Faz-2 (Account ilişkisi)
- **Opsiyonel önceki:** Faz-3, Faz-4, Faz-5 (bu fazlardan gelen entry'ler)
- **Sonraki:** Faz-8 (Dashboard son işlemler), Faz-9 (Raporlar)

## Kabul Kriterleri
- [ ] LedgerEntry CRUD servisi çalışıyor
- [ ] Tüm mevcut işlem tipleri doğru LedgerEntry oluşturuyor
- [ ] `/transactions` sayfası işlemleri doğru listeliyor
- [ ] Filtreler çalışıyor (tarih, tip, hesap, kişi)
- [ ] Aylık özet doğru hesaplanıyor
- [ ] Performans: 1000+ kayıtta sayfa hızlı yükleniyor

## Test Senaryoları

### Mutlu Senaryo
- Tahsilat gir → LedgerEntry (COLLECTION) listede görünür
- Kart ödemesi yap → LedgerEntry (CARD_PAYMENT) listede görünür
- Filtre: sadece COLLECTION → yalnızca tahsilatlar görünür

### Edge Case
- Aynı gün 50+ işlem → sayfalama çalışmalı
- Filtre kombinasyonları: tarih + tip + hesap
- Storno: yanlış giriş için karşı entry

## Uygulama Sırası
1. `lib/ledger-service.ts` oluştur
2. Önceki fazların servislerini kontrol et — LedgerEntry oluşturup oluşturmadıklarını doğrula
3. Eksik entegrasyonları ekle (mevcut actions.ts'deki addTransaction → LedgerEntry)
4. `components/transactions/` altında bileşenler
5. `app/transactions/page.tsx` sayfası
6. Navbar'a "İşlemler" linki ekle
7. Test et: senaryo akışları
8. Build doğrulama

## Tahmini Riskler
- Mevcut `Transaction` verilerinin LedgerEntry'ye bridge'lenmesi sırasında veri kaybı
- Performans: büyük veri setlerinde filtreleme yavaşlayabilir → index'ler kritik
- İlişki alanlarının (accountId, personId vb.) doğru doldurulması

## Sonraki Faz
→ `07-debt-priority-engine.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesine birleşik işlem defteri (Unified Transaction Ledger) ekle.

Adımlar:
1. lib/ledger-service.ts oluştur (CRUD, filtreleme, aylık özet)
2. Önceki fazlardaki servislerin LedgerEntry oluşturup oluşturmadığını kontrol et
3. Mevcut addTransaction, makeCardPayment gibi action'lara LedgerEntry oluşturma ekle
4. app/transactions/page.tsx sayfası oluştur
5. components/transactions/ altında: LedgerEntryRow, LedgerFilters, LedgerMonthlySummary
6. Navbar'a "İşlemler" linki ekle
7. Filtreler: tarih aralığı, tip, hesap, kişi, kategori, arama

Kurallar:
- Mevcut Transaction modelini SİLME
- LedgerEntry immutable olmalı
- Her entry'de userId, type, amount, currency, date zorunlu
- İlişki alanları (accountId, personId vb.) opsiyonel ama işlem tipine göre doldurulmalı
- Index'leri kullan: userId, type, date, accountId
- Performans için sayfalama uygula
- npm run build ile doğrula
```
