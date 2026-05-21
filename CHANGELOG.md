# CHANGELOG

## 2026-05-21 - Canonical Debt Model Tamamlama

### Değişti

- `lib/health-score-service.ts`: `prisma.debt` → `prisma.debtAccount`; `estimateDebtMonthlyLoad` legacy helper kaldırıldı; borç baskısı ve gecikme sayısı artık `DebtObligation` üzerinden canonical olarak hesaplanıyor. `saveHealthSnapshot` da `DebtAccount.currentBalance` toplamını kullanıyor.
- `lib/dashboard-service.ts`: `prisma.debt.remainingBalance` → `prisma.debtAccount.currentBalance` toplamı.
- `lib/insight-engine.ts`: `prisma.debt` → `prisma.debtAccount`; kısa vadeli borç filtresi `sourceType` ile, toplam borç `currentBalance` ile hesaplanıyor.
- `lib/simulation-engine.ts`: `simulateExtraPayment` artık `debtId` parametresini `DebtAccount.id` olarak alıyor; `prisma.debt.findFirstOrThrow` → `prisma.debtAccount.findFirstOrThrow`.
- `lib/ai/context-composer.ts`: `prisma.debt` → `prisma.debtAccount`; bağlı taraf adı (`counterpartyName`) context'e dahil edildi.
- `app/simulations/page.tsx`: borç listesi `DebtAccount` üzerinden yükleniyor; `id` ve `balance` canonical veriden geliyor.

### Sabitlendi

- `lib/debt-views.ts`: "Ödeme Gereken Borçlar" (Due/Required Payments) panelinde vadesi gelmemiş gelecekteki taksitlerin ve ödemelerin gösterilmesi engellendi. Artık bu panelde sadece vadesi geçmiş (`OVERDUE`), bu ay vadesi gelen veya önümüzdeki 10 gün içinde vadesi gelecek olan (`dueDate <= 10 days`) ödemeler listeleniyor. Bütçe planlayıcının (`getMonthlyBudgetSummary`) tüm ödemeleri görebilmesi için `getDebtWorkspaceData` fonksiyonuna `{ allObligations: true }` seçeneği eklendi.

### Doğrulandı

- `npx tsc --noEmit` — 0 hata
- `npm run lint` — 0 uyarı
- `npm run test` — 8 dosya, 131 test başarılı

## 2026-05-03 - Personal Finance Cockpit

### Eklendi

- TCMB EVDS ayar ekranı, güvenli API anahtarı saklama, seri kod yönetimi, cache ve manuel yenileme.
- Dashboard için `Piyasa Kartları` bileşeni ve son başarılı veri fallback'i.
- `market_rates` tablosu ve raporlarda kullanılabilir kur geçmişi altyapısı.
- Alacak/verecek kayıtlarına başlık, kategori, ana/toplam/ödenen/kalan tutar, plan tipi, risk, iç not, hatırlatma ve belge alanları.
- Taksit modeli, otomatik taksit planı, kısmi ödeme, ödeme geçmişi ve gecikme hesaplama.
- Kalan borcu/alacağı yeniden taksitlendirme akışı.
- Kayıt bazlı not ve timeline modeli.
- Gelir/gider işlemlerinde `Nakit işlem` seçeneği; nakit seçildiğinde hesap seçimi devre dışı kalır.
- Kredi kartı modeline kart programı, kart ağı, kullanılabilir limit, güncel borç, hesap kesim/son ödeme tarihi ve görsel mapping alanları.
- American Express kart ağı desteği.
- Kredi kartı faiz geçmişi modeli.
- Aylık bütçe ayarlarında TL formatlı, etiketli ve açıklamalı alanlar.
- Borç ödeme planı için kartopu, çığ, nakit akışı, risk ve hedef odaklı strateji motoru.
- Hedef türleri, öncelik ve aylık gerekli katkı alanları.
- Profesyonel rapor dashboard'u: nakit akışı, alacak, verecek, kart, faiz, kişi, hedef ve piyasa verisi özetleri.
- Finans asistanı için deterministik intent sistemi ve veri tabanlı cevaplar.
- Açık/koyu tema için semantik CSS değişkenleri ve legacy koyu form düzeltmeleri.

### Değişti

- Mevcut alacak/verecek kayıtları yeni kişisel muhasebe modeline geriye dönük uyumlu taşınacak şekilde migration hazırlandı.
- Kredi kartı borç hesaplarında manuel `currentDebt` değeri varsa öncelikli kullanılacak şekilde kart listesi ve detayları güncellendi.
- Borç listesi alacak, verecek, kart, KMH, taksitli, geciken, riskli ve kapanmış filtreleriyle yeniden düzenlendi.
- Raporlar sayfası KPI ve detaylı rapor alanlarına ayrıldı.
- Domain servislerinden gereksiz `use server` işaretleri kaldırıldı; server action dosyaları ayrı tutuldu.

### Doğrulandı

- `npx prisma format`
- `npx prisma generate`
- `npx tsc --noEmit`
- `npm run test` - 8 dosya, 131 test başarılı
- `npm run build` - production build başarılı

### Bilinen Notlar

- EVDS altın/emtia seri kodları varsayılan olarak kapalıdır. Güncel ve desteklenen seri kodları Ayarlar ekranından girilmelidir.
- Repo genelindeki ESLint kontrolü, revizyon öncesinden gelen legacy dosyalardaki kurallara takılmaktadır; üretim build'i ve testler başarılıdır.

