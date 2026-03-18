# Faz 2 — Hesap / Cüzdan ve Nakit Akışı Sistemi

## Amaç
Kullanıcının banka hesapları, nakit ve cüzdan bakiyelerini yönetebileceği bir hesap sistemi kurmak. Tüm finansal hareketlerin (tahsilat, gider, kart ödemesi vb.) ilgili hesap bakiyesine doğru yansımasını sağlamak. "Bugün gerçekten kullanabileceğim param ne kadar?" sorusuna güvenilir cevap vermek.

## Kapsam
**Yapılacak:**
- Hesap CRUD (banka, nakit, cüzdan ekleme/düzenleme/silme)
- Hesap bakiyesi gösterimi
- Manuel bakiye düzeltme
- Hesaplar arası transfer
- Bakiye değişim servis katmanı
- Hesap seçim bileşeni (diğer modüllerde kullanılacak)
- Serbest nakit / borç ödemeye uygun nakit hesaplaması
- `/accounts` sayfası

**Yapılmayacak:**
- Otomatik banka entegrasyonu (API ile veri çekme)
- Yatırım hesabı detay yönetimi
- Tahsilat ve gider hareketleri (Faz-3 ve Faz-6'da)

## Mevcut Durum Analizi
- **Hesap kavramı yok**: Mevcut sistemde `Asset` modeli var ama bakiye takibi yapmıyor
- `Asset` modeli `CASH`, `BANK` tiplerini içeriyor ama bunlar statik sayılar, hareket bazlı güncelleme yok
- monthly-planner serbest nakiti `plannedIncome - fixedCommitments - debtCommitments` ile hesaplıyor — gerçek hesap bakiyesine dayanmıyor
- Tahsilat, ödeme, gider gibi işlemler hiçbir hesap bakiyesini güncellemiyor

**Riskler:**
- Asset tablosuyla Account tablosu arasında kavram çakışması — bridge mantığı kurulmalı
- Mevcut `serbest nakit` hesaplaması değişecek — monthly-planner güncellenmeli

## Veri Modeli Etkisi
Faz-1'de oluşturulan `Account` modeli kullanılır. Ek alan gerekmez.

## Backend İşleri

### Servisler

#### `lib/account-service.ts`
```typescript
// Hesap CRUD
createAccount(userId, data): Promise<Account>
updateAccount(accountId, data): Promise<Account>
deleteAccount(accountId): Promise<void> // soft delete önerilir
getAccounts(userId): Promise<Account[]>
getDefaultAccount(userId): Promise<Account | null>

// Bakiye İşlemleri
adjustBalance(accountId, amount, description): Promise<Account>
transferBetweenAccounts(fromId, toId, amount, description): Promise<void>

// Hesaplama
getTotalBalance(userId): Promise<number>
getAvailableCash(userId): Promise<number> // toplam bakiye - ayrılmış tutarlar
getDebtPayableAmount(userId): Promise<number> // borç ödemeye müsait nakit
```

### Server Actions — `app/accounts/actions.ts`
```typescript
export async function createAccountAction(formData: FormData)
export async function updateAccountAction(formData: FormData)
export async function deleteAccountAction(accountId: string)
export async function adjustBalanceAction(formData: FormData)
export async function transferAction(formData: FormData)
```

### İş Kuralları
1. Her kullanıcının en az bir varsayılan hesabı olmalı
2. Hesap silinirken bakiye > 0 ise uyarı ver
3. Transfer işlemi atomic olmalı (transaction kullan)
4. Negatif bakiye izin verilmeli ama uyarı oluşturulmalı
5. Bakiye düzeltme işlemi `LedgerEntry` olarak kaydedilmeli
6. Transfer işlemi iki `LedgerEntry` oluşturmalı (çıkış + giriş)

### Validation
- Hesap adı boş olamaz
- Bakiye ve tutar sayısal olmalı
- Transfer tutarı > 0 olmalı
- Aynı hesaba transfer yapılamaz

## Frontend İşleri

### Sayfa: `/accounts`
- Hesap listesi kartları (ad, tip, bakiye, banka adı)
- "Hesap Ekle" butonu → modal/form
- Her kart üzerinde: düzenle, bakiye düzelt, sil butonları
- Toplam bakiye kartı
- Serbest nakit kartı

### Bileşenler
1. `AccountCard` — tek hesap kartı (ikon, ad, bakiye, tip)
2. `AccountForm` — hesap ekleme/düzenleme formu
3. `BalanceAdjustModal` — bakiye düzeltme modalı
4. `TransferModal` — hesaplar arası transfer modalı
5. `AccountSelect` — diğer modüllerde kullanılacak hesap seçici dropdown

### Kullanıcı Akışları
1. **Hesap ekleme**: Buton → Form (ad, tip, banka, bakiye, para birimi) → Kaydet → Liste güncellenir
2. **Bakiye düzeltme**: Kart üzerinde buton → Modal (yeni bakiye + açıklama) → Kaydet → LedgerEntry oluşur
3. **Transfer**: Buton → Modal (kaynak, hedef, tutar, açıklama) → Kaydet → Her iki bakiye güncellenir

## Dashboard / Rapor Etkisi
- Dashboard'a "Kullanılabilir nakit" kartı eklenecek (Faz-8'de)
- `monthly-planner.ts`'deki serbest nakit hesaplaması gerçek hesap bakiyelerini kullanabilir hale gelecek

## Ayarlar Etkisi
- Varsayılan hesap seçimi ayarlar sayfasında olacak (Faz-14)

## AI Etkisi
- AI, hesap bakiyelerini context olarak kullanacak (Faz-12)
- Nakit açığı uyarısı verilecek

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1 (Account modeli)
- **Sonraki fazlar:** Faz-3 (tahsilat hesaba yansıması), Faz-6 (işlem defteri), Faz-7 (borç önceliklendirme)

## Kabul Kriterleri
- [ ] Hesap ekleme, düzenleme, silme çalışıyor
- [ ] Hesap bakiyesi doğru gösteriliyor
- [ ] Manuel bakiye düzeltme LedgerEntry oluşturuyor
- [ ] Hesaplar arası transfer her iki bakiyeyi güncelliyor
- [ ] Toplam bakiye doğru hesaplanıyor
- [ ] Negatif bakiye uyarısı gösteriliyor
- [ ] AccountSelect bileşeni çalışıyor ve export ediliyor
- [ ] Sayfa mobil uyumlu

## Test Senaryoları

### Mutlu Senaryo
- 3 hesap ekle (banka, nakit, cüzdan)
- Toplam bakiye = üçünün toplamı
- Transfer yap → kaynak düşer, hedef artar, toplam aynı kalır
- Bakiye düzelt → değişiklik LedgerEntry olarak kaydedilir

### Hata Senaryosu
- Negatif tutar girme → validation hatası
- Aynı hesaba transfer → hata mesajı
- Yetersiz bakiye transfer → uyarı (işlem yine de yapılabilir)

### Edge Case
- Bakiye 0 olan hesap silme
- 0.01 TL gibi küçük tutarlar
- Farklı para birimli hesaplar (şimdilik görsel ayrım, kur dönüşümü yok)

## Uygulama Sırası
1. `lib/account-service.ts` oluştur
2. `app/accounts/actions.ts` server actions yaz
3. `components/accounts/AccountCard.tsx` oluştur
4. `components/accounts/AccountForm.tsx` oluştur
5. `components/accounts/AccountSelect.tsx` oluştur (export et, diğer fazlarda kullanılacak)
6. `components/accounts/BalanceAdjustModal.tsx` oluştur
7. `components/accounts/TransferModal.tsx` oluştur
8. `app/accounts/page.tsx` sayfasını oluştur
9. `Navbar.tsx`'e "Hesaplar" linkini ekle
10. Test et: CRUD, transfer, bakiye düzeltme

## Tahmini Riskler
- `Asset` modeliyle `Account` modeli arasındaki kavram karışıklığı
- Mevcut `monthly-planner.ts`'teki serbest nakit hesabının bozulma riski
- Transaction atomicity hatası → Prisma `$transaction` kullanılmalı

## Sonraki Faz
→ `03-receivables-payables-module.md` — Alacak/Verecek modülü

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesine Hesap/Cüzdan (Account) modülünü ekle.

Kurallar:
- Faz-1'de eklenen Account modelini kullan (schema.prisma'da zaten olmalı)
- Mevcut dosyaları silme veya bozmadan ilerle
- Önce lib/account-service.ts servisini yaz
- Sonra app/accounts/ altında server actions ve sayfa oluştur
- components/accounts/ altında bileşenleri yaz
- AccountSelect bileşenini diğer modüllerin kullanabilmesi için export et
- Transfer işleminde Prisma $transaction kullan (atomicity)
- Bakiye düzeltme işlemi LedgerEntry oluşturmalı
- Navbar.tsx'e "Hesaplar" linkini ekle
- Her hesap kartında tip ikonu, bakiye ve banka adı göster
- Mevcut UI diline uy: fintech-card sınıfı, siyah tema, rounded-2xl/3xl
- Mobil uyumlu yap
- Son olarak npm run build ile doğrula
```
