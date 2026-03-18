# Faz 1 — Veri Modeli Temeli

## Amaç
Tüm yeni modüllerin ihtiyaç duyacağı ortak veri modellerini, enum'ları ve migration altyapısını tek seferde oluşturarak sonraki fazların bağımsız çalışmasını sağlamak. Mevcut modellere dokunmadan yeni tablolar eklemek ve mevcut modellerdeki küçük iyileştirmeleri yapmak.

## Kapsam
**Yapılacak:**
- Yeni Prisma modelleri: `Person`, `ReceivablePayable`, `RPTransaction`, `Account`, `AccountTransaction`, `LedgerEntry`, `CardFinanceSettings`, `AppSettings`, `FinancialGoal`, `HealthSnapshot`, `AIRecommendation`, `Simulation`
- Yeni enum'lar: `RPType`, `RPStatus`, `AccountType`, `LedgerEntryType`, `GoalStatus`, `SettingCategory`
- Mevcut modellerde küçük alan eklentileri (ilişki alanları)
- Migration dosyası üretimi

**Yapılmayacak:**
- Mevcut tabloların yapısını bozmak
- Servis veya frontend kodu yazmak
- Mevcut verileri silmek veya dönüştürmek

## Mevcut Durum Analizi
- 18+ model mevcut ve çalışıyor
- `Float` tipi para alanlarında kullanılıyor — `Decimal` geçişi bu fazda planlanabilir ama riskli, ayrı migration olarak ele alınmalı
- `userId` bazı modellerde opsiyonel — yeni modellerde zorunlu yapılacak
- `Transaction` modeli çok basit — yeni `LedgerEntry` ile birleşik defter oluşturulacak
- Hesap/cüzdan kavramı yok — `Account` modeli eklenecek

## Veri Modeli Etkisi

### Yeni Modeller

```prisma
// ============================================================
// 👤 KİŞİ YÖNETİMİ
// ============================================================

model Person {
  id          String   @id @default(cuid())
  userId      String
  name        String
  phone       String?
  email       String?
  notes       String?  @db.Text
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user                 User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  receivablesPayables  ReceivablePayable[]

  @@index([userId])
}

// ============================================================
// 💰 ALACAK / VERECEK SİSTEMİ
// ============================================================

enum RPType {
  RECEIVABLE   // Bana borçlu (alacak)
  PAYABLE      // Benim borçlu olduğum (verecek)
}

enum RPStatus {
  OPEN
  PARTIAL
  CLOSED
  OVERDUE
}

model ReceivablePayable {
  id              String    @id @default(cuid())
  userId          String
  personId        String
  type            RPType
  description     String
  originalAmount  Float     // İlk toplam tutar
  remainingAmount Float     // Kalan tutar
  currency        String    @default("TRY")
  dueDate         DateTime?
  status          RPStatus  @default(OPEN)
  notes           String?   @db.Text
  isInstallment   Boolean   @default(false)
  installmentCount Int?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  person          Person        @relation(fields: [personId], references: [id], onDelete: Cascade)
  transactions    RPTransaction[]

  @@index([userId])
  @@index([personId])
  @@index([status])
}

model RPTransaction {
  id                  String   @id @default(cuid())
  receivablePayableId String
  amount              Float
  transactionDate     DateTime @default(now())
  accountId           String?  // Hangi hesaba yansıdı
  description         String?
  createdAt           DateTime @default(now())

  receivablePayable   ReceivablePayable @relation(fields: [receivablePayableId], references: [id], onDelete: Cascade)
  account             Account?          @relation(fields: [accountId], references: [id])
  ledgerEntries       LedgerEntry[]

  @@index([receivablePayableId])
}

// ============================================================
// 🏦 HESAP / CÜZDAN SİSTEMİ
// ============================================================

enum AccountType {
  BANK_ACCOUNT
  CASH
  WALLET
  INVESTMENT
  OTHER
}

model Account {
  id          String      @id @default(cuid())
  userId      String
  name        String      // "Ziraat Vadesiz", "Nakit Cüzdan"
  type        AccountType
  balance     Float       @default(0)
  currency    String      @default("TRY")
  bankName    String?
  iban        String?
  isDefault   Boolean     @default(false)
  isActive    Boolean     @default(true)
  notes       String?     @db.Text
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  rpTransactions    RPTransaction[]
  ledgerEntries     LedgerEntry[]

  @@index([userId])
}

// ============================================================
// 📒 BİRLEŞİK İŞLEM DEFTERİ
// ============================================================

enum LedgerEntryType {
  INCOME
  EXPENSE
  COLLECTION          // Tahsilat
  PAYMENT_TO_PERSON   // Kişiye ödeme
  CARD_PAYMENT        // Kredi kartı ödemesi
  SUBSCRIPTION_PAYMENT
  DEBT_PAYMENT
  DEBT_ADDITION
  RECEIVABLE_ADDITION
  TRANSFER            // Hesaplar arası transfer
  BALANCE_ADJUSTMENT  // Manuel bakiye düzeltme
}

model LedgerEntry {
  id              String          @id @default(cuid())
  userId          String
  type            LedgerEntryType
  amount          Float
  currency        String          @default("TRY")
  description     String?
  category        String?
  date            DateTime        @default(now())

  // İlişkiler (opsiyonel — işlem tipine göre)
  accountId       String?
  personId        String?
  creditCardId    String?
  debtId          String?
  subscriptionId  String?
  rpTransactionId String?

  metadata        Json?           // Ek detaylar

  createdAt       DateTime        @default(now())

  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  account         Account?        @relation(fields: [accountId], references: [id])
  rpTransaction   RPTransaction?  @relation(fields: [rpTransactionId], references: [id])

  @@index([userId])
  @@index([type])
  @@index([date])
  @@index([accountId])
}

// ============================================================
// ⚙️ AYARLAR SİSTEMİ
// ============================================================

model CardFinanceSettings {
  id                    String   @id @default(cuid())
  userId                String
  contractualRate       Float    @default(4.42)   // Genel akdi faiz (aylık %)
  defaultRate           Float    @default(5.42)   // Genel gecikme faizi
  cashAdvanceRate       Float    @default(5.92)   // Genel nakit avans faizi
  minPaymentRateBelow50k Float   @default(0.20)
  minPaymentRateAbove50k Float   @default(0.40)
  kkdfRate              Float    @default(0.15)
  bsmvRate              Float    @default(0.15)
  lastUpdated           DateTime @default(now())
  notes                 String?  @db.Text
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId])
}

model AppSettings {
  id              String   @id @default(cuid())
  userId          String
  key             String   // "ai.apiKey", "ai.model", "notification.paymentReminder"
  value           String   @db.Text
  isEncrypted     Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, key])
  @@index([userId])
}

// ============================================================
// 🎯 HEDEF & MOTİVASYON
// ============================================================

enum GoalStatus {
  ACTIVE
  COMPLETED
  ABANDONED
}

model FinancialGoal {
  id              String     @id @default(cuid())
  userId          String
  title           String
  description     String?    @db.Text
  targetAmount    Float
  currentAmount   Float      @default(0)
  targetDate      DateTime
  status          GoalStatus @default(ACTIVE)
  category        String?    // "debt_payoff", "savings", "subscription_cut"
  relatedDebtId   String?    // Belirli bir borca bağlı mı
  relatedCardId   String?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
}

// ============================================================
// 📊 FİNANSAL SAĞLIK
// ============================================================

model HealthSnapshot {
  id                    String   @id @default(cuid())
  userId                String
  score                 Int      // 0-100
  level                 String   // CRITICAL, HIGH, MODERATE, GOOD, EXCELLENT
  totalAssets           Float
  totalDebts            Float
  netWorth              Float
  liquidityRatio        Float
  leverageRatio         Float
  creditUtilization     Float?
  monthlyDebtService    Float?
  fixedExpenseRatio     Float?
  improvementTips       Json?    // ["Öneri 1", "Öneri 2", "Öneri 3"]
  breakdown             Json?    // Detaylı puan dağılımı
  calculatedAt          DateTime @default(now())

  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([calculatedAt])
}

// ============================================================
// 🤖 AI ÖNERİLERİ
// ============================================================

model AIRecommendation {
  id              String   @id @default(cuid())
  userId          String
  type            String   // "payment_plan", "savings_tip", "risk_alert", "monthly_summary"
  title           String
  content         String   @db.Text
  reasoning       String?  @db.Text   // Neden bu öneri verildi
  risk            String?
  suggestedAction String?  @db.Text
  isRead          Boolean  @default(false)
  isActedOn       Boolean  @default(false)
  metadata        Json?
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([type])
}
```

### User Modeline Eklenecek İlişkiler

```prisma
model User {
  // ... mevcut alanlar korunur
  
  // Yeni ilişkiler
  persons             Person[]
  receivablesPayables ReceivablePayable[]
  accounts            Account[]
  ledgerEntries       LedgerEntry[]
  cardFinanceSettings CardFinanceSettings?
  appSettings         AppSettings[]
  financialGoals      FinancialGoal[]
  healthSnapshots     HealthSnapshot[]
  aiRecommendations   AIRecommendation[]
}
```

### Migration Stratejisi
1. `prisma migrate dev --name add_core_data_models` ile yeni tabloları ekle
2. Mevcut tabloları hiç değiştirme (ilişki alanları `User` modeline eklenir ama bu sadece Prisma Client tarafı)
3. Mevcut `Asset` tablosundaki `RECEIVABLE` tipi `AssetType` enum'unda kalsın — ileride bridge logic yazılır
4. `Float` → `Decimal` geçişi ayrı bir migration olarak planlanır (Faz-15'te)

## Backend İşleri
Bu fazda backend kodu yazılmaz. Sadece Prisma şema ve migration dosyaları üretilir.

## Frontend İşleri
Bu fazda frontend kodu yazılmaz.

## Dashboard / Rapor Etkisi
Doğrudan yok. Sonraki fazlarda bu modeller üzerinden dashboard verileri çekilecek.

## Ayarlar Etkisi
`CardFinanceSettings` ve `AppSettings` modelleri bu fazda oluşturulur ama ayarlar UI'ı Faz-14'te yapılır.

## AI Etkisi
`AIRecommendation` modeli bu fazda tanımlanır. AI servisi Faz-12'de oluşturulur.

## Bağımlılıklar
- **Önceki:** `00-project-analysis.md` (tamamlanmış)
- **Sonraki:** Tüm diğer fazlar bu modelleri kullanır

## Kabul Kriterleri
- [ ] Tüm yeni modeller Prisma şemasına eklenmiş
- [ ] Migration başarılı çalışıyor ve mevcut veriler korunuyor
- [ ] `npx prisma generate` sonrası PrismaClient yeni tipleri içeriyor
- [ ] Mevcut uygulamada hiçbir sayfa kırılmamış
- [ ] `npx prisma db push` veya `prisma migrate dev` hatasız tamamlanıyor

## Test Senaryoları

### Mutlu Senaryo
- Migration çalıştır → mevcut veriler kaybolmamalı
- Yeni tablo oluşmuş mu: `SELECT * FROM Person` → boş ama hatasız

### Hata Senaryosu
- Migration çakışması → rollback planı olmalı
- Mevcut `User` modelinde breaking change olmamalı

### Edge Case
- MySQL'de `Decimal` precision sınırları
- `cuid()` ID üretiminde çakışma riski (pratikte yok)

## Uygulama Sırası
1. `schema.prisma` dosyasını yedekle
2. Yeni model ve enum tanımlarını ekle
3. `User` modeline ilişki alanlarını ekle
4. `npx prisma format` ile formatla
5. `npx prisma migrate dev --name add_core_data_models`
6. `npx prisma generate`
7. Mevcut sayfaları aç ve kırılmadığını doğrula
8. `npm run build` ile derleme kontrolü yap

## Tahmini Riskler
- Migration sırası yanlışsa foreign key hataları
- Mevcut `Transaction` modeliyle `LedgerEntry` arasında karışıklık — sonraki fazlarda bridge yazılacak
- `AppSettings` key/value yapısı: type-safety eksikliği — özel service katmanında sarılacak

## Sonraki Faz
→ `02-accounts-cashflow-balance.md` — Hesap/cüzdan sistemi ve nakit akışı mantığı

## Claude Code Uygulama Promptu

```
Bu projedeki Prisma şemasına yeni veri modellerini ekle. Mevcut modelleri ASLA silme veya değiştirme (sadece User modeline yeni relation alanları ekle).

Adımlar:
1. Önce mevcut prisma/schema.prisma dosyasını oku ve yedekle
2. Şu modelleri ekle: Person, ReceivablePayable, RPTransaction, Account, LedgerEntry, CardFinanceSettings, AppSettings, FinancialGoal, HealthSnapshot, AIRecommendation
3. Şu enum'ları ekle: RPType, RPStatus, AccountType, LedgerEntryType, GoalStatus
4. User modeline yeni ilişki alanlarını ekle (mevcut alanları silme)
5. npx prisma format çalıştır
6. npx prisma migrate dev --name add_core_data_models çalıştır
7. npx prisma generate çalıştır
8. npm run build ile mevcut kodun kırılmadığını doğrula

Kritik kurallar:
- Mevcut tabloları silme
- Mevcut enum'ları değiştirme
- Float tipini şimdilik koru (Decimal geçişi ayrı fazda)
- Her yeni modelde userId zorunlu olsun
- @@index alanlarını eklemeyi unutma
```
