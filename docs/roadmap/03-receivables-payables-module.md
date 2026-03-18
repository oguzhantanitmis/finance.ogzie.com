# Faz 3 — Alacak / Verecek Modülü

## Amaç
Kişi bazlı borç ve alacak takibi yapabilmek. Tahsilat girişi yapıldığında kalan alacağı düşürmek, toplanan parayı o ayın gelirine ve seçilen hesap bakiyesine yansıtmak. Kişiye ödeme yapıldığında ise gider ve hesap bakiyesine yansıtmak. Böylece "bu ay gerçekte ne kadar param var?" sorusu doğru cevaplanabilir.

## Kapsam
**Yapılacak:**
- Kişi kartı CRUD (Person)
- Alacak/verecek kaydı ekleme
- Tahsilat ve ödeme girişi
- Kalan tutar otomatik hesaplama
- Tahsilatın gelir + hesap bakiyesine yansıması
- Vade tarihi ve durum takibi (açık, kısmi, kapandı, gecikti)
- Taksitli/parçalı ödeme desteği
- Hareket geçmişi
- `/people` ve `/people/[id]` sayfaları

**Yapılmayacak:**
- Otomatik ödeme hatırlatma (Faz-14 bildirim sisteminde)
- AI tahsilat tahmini (Faz-12)
- Dashboard entegrasyonu (Faz-8)

## Mevcut Durum Analizi
- Kişi ve alacak/verecek kavramı projede **hiç yok**
- `Asset` modelinde `RECEIVABLE` tipi var ama sadece statik tutar, kişi ilişkisi veya hareket geçmişi yok
- Tahsilat = gelir + bakiye artışı mantığı hiçbir yerde uygulanmamış
- Mevcut `Transaction` modeli tipi sadece `INCOME` ve `EXPENSE` — granüler değil

**Riskler:**
- Mevcut Asset RECEIVABLE kayıtları varsa, göç planı gerekebilir
- Tahsilat → Gelir → Bakiye zinciri doğru kurulmazsa mali hesaplar tutmaz

## Veri Modeli Etkisi
Faz-1'de tanımlanan `Person`, `ReceivablePayable`, `RPTransaction` modelleri kullanılır.

## Backend İşleri

### Servisler

#### `lib/people-service.ts`
```typescript
createPerson(userId, data): Promise<Person>
updatePerson(personId, data): Promise<Person>
getPeople(userId): Promise<PersonWithSummary[]> // toplam alacak/verecek ile
getPersonDetail(personId): Promise<PersonWithHistory>
```

#### `lib/receivable-payable-service.ts`
```typescript
createRP(userId, data): Promise<ReceivablePayable>
recordCollection(rpId, amount, accountId, description): Promise<void>
  // 1. RPTransaction oluştur
  // 2. ReceivablePayable.remainingAmount güncelle
  // 3. Account.balance += amount (tahsilat ise)
  // 4. LedgerEntry oluştur (type: COLLECTION)
  // 5. Status güncelle

recordPaymentToPerson(rpId, amount, accountId, description): Promise<void>
  // 1. RPTransaction oluştur
  // 2. ReceivablePayable.remainingAmount güncelle
  // 3. Account.balance -= amount (ödeme ise)
  // 4. LedgerEntry oluştur (type: PAYMENT_TO_PERSON)
  // 5. Status güncelle

getRPsByPerson(personId): Promise<ReceivablePayable[]>
getRPDetail(rpId): Promise<RPWithTransactions>
getSummary(userId): Promise<RPSummary>
  // toplam alacak, toplam verecek, net
  // bu ay tahsil edilen
  // geciken tahsilatlar
  // yaklaşan vadeler
```

### İş Kuralları
1. **Tahsilat girişi yapıldığında:**
   - `ReceivablePayable.remainingAmount -= tahsilat tutarı`
   - remainingAmount == 0 → status = CLOSED
   - remainingAmount > 0 ve remainingAmount < originalAmount → status = PARTIAL
   - Seçilen hesap bakiyesi += tahsilat tutarı
   - `LedgerEntry` type = COLLECTION olarak oluşturulur
   
2. **Kişiye ödeme yapıldığında:**
   - `ReceivablePayable.remainingAmount -= ödeme tutarı`
   - Seçilen hesap bakiyesi -= ödeme tutarı
   - `LedgerEntry` type = PAYMENT_TO_PERSON olarak oluşturulur
   
3. **Vade tarihi geçmiş ve remainingAmount > 0 ise** → status = OVERDUE

4. **Tüm işlemler Prisma `$transaction` ile atomic olmalı**

### Validation
- Tahsilat/ödeme tutarı > 0 ve <= remainingAmount
- Kişi adı boş olamaz
- Alacak/verecek tutarı > 0

## Frontend İşleri

### Sayfalar

#### `/people` — Kişi Listesi
- Kişi kartları: ad, toplam alacak, toplam verecek, net durum
- "Kişi Ekle" butonu
- Filtreler: tümü, bana borçlu, benim borçlu olduğum
- Toplam alacak / toplam verecek / net durumu özet kartları

#### `/people/[id]` — Kişi Detay
- Kişi bilgileri (ad, telefon, email, not)
- Alacak/verecek kayıtları listesi
- Her kayıt: tutar, kalan, durum, vade
- "Tahsilat Gir" / "Ödeme Yap" butonları
- Hareket geçmişi zaman çizelgesi

### Bileşenler
1. `PersonCard` — kişi özet kartı
2. `PersonForm` — kişi ekleme/düzenleme
3. `RPForm` — alacak/verecek kaydı ekleme
4. `CollectionModal` — tahsilat girişi (tutar + hesap seçimi + açıklama)
5. `PaymentToPersonModal` — kişiye ödeme
6. `RPHistoryTimeline` — hareket geçmişi
7. `RPStatusBadge` — durum etiketi (açık, kısmi, kapandı, gecikti)

### Kullanıcı Akışları

**Tahsilat Akışı (Ana Senaryo):**
1. `/people` → Mehmet Kılıç kartına tıkla
2. "80.000 TL alacak" kaydını gör
3. "Tahsilat Gir" butonuna bas
4. Modal açılır: tutar (10.000), hesap seçimi (Ziraat), açıklama
5. Kaydet
6. Kalan alacak: 70.000 TL
7. Ziraat hesap bakiyesi: +10.000 TL
8. LedgerEntry: COLLECTION, 10.000 TL
9. Durum: PARTIAL

## Dashboard / Rapor Etkisi
Faz-8'de dashboard'a eklenecek:
- Toplam alacak / toplam verecek kartları
- Bu ay tahsil edilenler
- Geciken tahsilatlar listesi
- Yaklaşan tahsilatlar listesi

## Ayarlar Etkisi
Doğrudan ayar gerektirmez.

## AI Etkisi
- AI, kişi bazlı tahsilat gecikmelerini analiz edebilecek (Faz-12)
- Tahsilat tahmini ve nakit akışı önerisi verebilecek

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1 (Person, ReceivablePayable, RPTransaction modelleri), Faz-2 (Account sistemi — tahsilat hesaba yansıması için)
- **Opsiyonel önceki:** —
- **Sonraki:** Faz-6 (LedgerEntry entegrasyonu), Faz-8 (Dashboard)

## Kabul Kriterleri
- [ ] Kişi CRUD çalışıyor
- [ ] Alacak ve verecek kaydı eklenebiliyor
- [ ] Tahsilat girişi yapıldığında:
  - [ ] Kalan alacak doğru düşüyor
  - [ ] Seçilen hesap bakiyesi artıyor
  - [ ] LedgerEntry oluşuyor
  - [ ] Durum otomatik güncelleniyor
- [ ] Kişiye ödeme yapıldığında hesap bakiyesi düşüyor
- [ ] Hareket geçmişi doğru görüntüleniyor
- [ ] Vade geçmiş kayıtlar OVERDUE oluyor
- [ ] Tüm işlemler atomic

## Test Senaryoları

### Mutlu Senaryo
- Mehmet oluştur → 80.000 TL alacak ekle
- 10.000 TL tahsilat gir (Ziraat hesabına)
- Kalan: 70.000, Ziraat: +10.000, Durum: PARTIAL
- 70.000 TL daha tahsilat → Durum: CLOSED, Kalan: 0

### Hata Senaryosu
- remainingAmount'tan fazla tahsilat girişi → hata
- Hesap seçmeden tahsilat → validation hatası
- Negatif tutar → hata

### Edge Case
- 0.01 TL kalan → CLOSED mu PARTIAL mu?
- Vade tarihi bugün olan kayıt → OPEN mı OVERDUE mu?
- Silinen kişinin alacakları ne olur? → Cascade kontrolü

## Uygulama Sırası
1. `lib/people-service.ts` oluştur
2. `lib/receivable-payable-service.ts` oluştur
3. `app/people/actions.ts` server actions
4. `components/people/` altında bileşenler
5. `app/people/page.tsx` — kişi listesi
6. `app/people/[id]/page.tsx` — kişi detay
7. Navbar'a "Kişiler" linki ekle
8. Test et: tahsilat akışında hesap bakiyesi ve LedgerEntry doğru mu?
9. `npm run build` ile doğrula

## Tahmini Riskler
- Tahsilat → Gelir → Bakiye zincirinde bir hata tüm mali hesapları bozar
- `$transaction` kullanılmazsa kısmi güncelleme riski
- Mevcut `Transaction` modeliyle karışıklık (LedgerEntry kullanılmalı)

## Sonraki Faz
→ `04-subscriptions-recurring-upgrade.md` — Abonelik ve düzenli gider modülü genişletmesi

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesine Alacak/Verecek (Receivables/Payables) modülünü ekle.

Kritik iş kuralı: Tahsilat girişi yapıldığında:
1. ReceivablePayable.remainingAmount düşmeli
2. Seçilen Account.balance artmalı
3. LedgerEntry (type: COLLECTION) oluşmalı
4. Durum otomatik güncellenmeli
Bu 4 işlem Prisma $transaction ile atomic yapılmalı.

Adımlar:
1. lib/people-service.ts oluştur (kişi CRUD)
2. lib/receivable-payable-service.ts oluştur (alacak/verecek CRUD + tahsilat/ödeme)
3. app/people/actions.ts server actions yaz
4. components/people/ altında: PersonCard, PersonForm, RPForm, CollectionModal, PaymentToPersonModal, RPStatusBadge, RPHistoryTimeline
5. app/people/page.tsx (kişi listesi, toplam alacak/verecek özeti)
6. app/people/[id]/page.tsx (kişi detay, kayıtlar, hareket geçmişi)
7. Navbar.tsx'e "Kişiler" linki ekle

Kurallar:
- Faz-1 ve Faz-2'nin tamamlanmış olduğunu varsay
- Account modelini ve AccountSelect bileşenini import et
- Mevcut kodları silme
- UI: fintech-card, siyah tema, rounded, mobil uyumlu
- npm run build ile doğrula
```
