# CHANGELOG

## 2026-05-22 - UI Redesign Aşama 1: Tasarım Sistemi Altyapısı

Premium finans kokpiti redesign'ının 1. aşaması. Mevcut `globals.css` tasarım sistemi (token + 12 utility class) bozulmadan üstüne **eklemeler** yapıldı; React component katmanı zenginleştirildi. Domain motorları, auth helper'ları, server action'lar ve Prisma sorguları **dokunulmadı** — sadece sunum katmanı.

### Eklendi

- `app/globals.css`:
  - **Critical token seti**: `--accent-critical`, `--accent-critical-bg`, `--accent-critical-border`, `--accent-critical-glow` (dark/light her iki temada). "Danger"dan ayrı bir kanal — sadece kritik borç/hesap durumları için.
  - **Overdue token alias'ları**: `--accent-overdue`, `--accent-overdue-bg`, `--accent-overdue-border` (warning üstünde semantik wrapper).
  - **Yeni component class'ları**: `.fintech-card-critical` (kırmızı border + glow), `.fintech-card-elevated` (default elevated shadow), `.fintech-card-glass` (hero overlay'ler için backdrop-blur'lı varyant), `.kpi-card-critical`, `.status-badge-critical`, `.metric-row` + `.metric-row-label` + `.metric-row-value` (StatRow component'in CSS tabanı).
- `components/ui/MoneyAmount.tsx`: `formatCurrency` + `tabular-nums` + `privacy-blur` otomatik sarmalayıcı. `intent: positive | negative | neutral | auto`, `size: sm/md/lg/xl/hero`, `showSign` ve `sensitive` (privacy off için) prop'larıyla. Server Component.
- `components/ui/MoneyDelta.tsx`: İşaretli para değişimi — `+₺X` / `-₺Y` + yukarı/aşağı ok ikonu, semantik renk. Server Component.
- `components/ui/RiskBadge.tsx`: 7 risk seviyesi varyantı — `low | medium | high | critical | closed | overdue | due_today` + Türkçe etiket + lucide ikon + status-badge class haritası. Server Component.
- `components/ui/StatusDot.tsx`: 7 tonda küçük renkli daire (icon-only badge alternatifi). `pulsing` ve `label` (a11y) prop'ları. Server Component.
- `components/ui/SectionHeader.tsx`: Eyebrow + başlık + açıklama + sağda aksiyon slot + opsiyonel filter row + tone'lu ikon kutusu. `as`, `size` ve `iconTone` varyantları. Server Component.
- `components/ui/StatRow.tsx`: Label + tabular-nums değer iki-kolonlu satır. `tone` varyantı, opsiyonel `icon` + `hint`. `.metric-row` CSS'ini tüketir. Server Component.
- `components/ui/ProgressBar.tsx`: Mevcut `.progress-bar*` CSS'i typed wrapper'a kavuşturuldu — `tone`, `label`, `showValue`, ARIA `progressbar` rolü ve `aria-valuenow`. Server Component.
- `components/ui/UtilizationRing.tsx`: SVG progress circle — `auto` tone modunda eşiklere göre (varsayılan: 50/75/90 → warning/danger/critical) otomatik renkleniyor. `size: sm/md/lg`. Server Component, role="img".
- `components/ui/Skeleton.tsx`: `text | title | paragraph | card | kpi | avatar | pill` varyantları + `lines` prop'u. Mevcut `.animate-shimmer` keyframe'ini tüketir. Server Component.
- `components/ui/FinanceMetricCard.tsx`: KPI compose — label + value (MoneyAmount) + trend ok + helper text + opsiyonel CTA link + accent (success/danger/warning/purple/info/critical). `href` verilirse Link'e dönüşür. Server Component.

### Değişti

- `components/ui/Modal.tsx`:
  - `size: sm | md | lg | xl | 2xl | 4xl` prop'u eklendi; `maxWidthClassName` **deprecated** olarak geriye uyumlu korundu.
  - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (`useId`) + `aria-describedby` eklendi.
  - **Focus trap**: Tab/Shift+Tab modal içinde dolaşır, açılırken ilk focusable'a focus verilir, kapanırken önceki active element'e focus döner.
  - **Scroll lock**: `document.body.style.overflow` modal açıkken kilitlenir, cleanup'ta restore edilir.
  - Close butonu `X` (lucide-react) ikon + `aria-label` ile değiştirildi (önceden ✕ string).
  - `closeOnOverlayClick` (default `true`) ve `hideClose` opsiyonel prop'ları.
  - Modal entrance animasyonu için `toast-enter` keyframe'i kullanıldı.
- `components/ui/EmptyState.tsx`:
  - `action` prop'u `() => void` yerine `ReactNode` slot oldu (kullanıcı kendi buton/link/form'unu geçebiliyor).
  - `cta?: { label; href }` shortcut'ı eklendi (Server Component'te kullanılabilir Link).
  - `tone` (7 ton) eklendi — icon kutusunun arka plan/renk semantiği.
  - `bare` prop'u eklendi — fintech-card sarmalayıcısı olmadan render (başka bir kart içine gömülürken).

### Doğrulandı

- `npm run build` — TypeScript dahil temiz build ✓
- `npm test` — 9 dosya, 133 test PASS ✓
- Mevcut sayfaların hiçbiri değişmedi; yeni primitive'ler şu an için kullanılmıyor (Aşama 2'den itibaren dashboard'a entegre edilecek).
- Auth helper'ları, server action imzaları, Prisma sorgu pattern'leri **değişmedi**.

## 2026-05-21 - Kredi Kartları Bölümü Premium Modernizasyonu (UI/UX)

### Eklendi

- `components/cards/CreditCardVisual.tsx`: Framer Motion `useMotionValue`, `useSpring` ve `useTransform` kancalarıyla entegre, fare hareketine (hover) duyarlı 3D eğilme (tilt) efektine sahip interaktif dijital kart bileşeni oluşturuldu. Detay sayfasında tıklandığında Y ekseninde 180 derece dönen (flip) akdi faiz, gecikme faizi ve hesap kesim günü detaylarını barındıran arka yüz tasarımı eklendi. Visa, Mastercard, Troy ve Amex ağ logoları entegre edildi.
- `components/cards/CardGrid.tsx`: Toplam limit kullanımı, toplam güncel borç, kullanılabilir limit KPI kartları ve renklendirilmiş (limit aşımına göre yeşil/sarı/kırmızı) kullanım oranı barı içeren **Limits Overview Dashboard** eklendi. Toplam mil/puan özeti ile vade yakınlığına göre (3 gün kala kırmızı alarm, 7 gün kala sarı alarm) yaklaşan kart ödemesi uyarı sistemi entegre edildi.
- `components/cards/CardDetailView.tsx`: Sol tarafta 3D dijital kart ve özet metrikleri, sağ tarafta tablı (tabbed) içerik alanını barındıran premium split yerleşim planı uygulandı.
- **Akıllı Ödeme ve Faiz Simülatörü**: `components/cards/CardDetailView.tsx` içerisine asgari ödeme ile toplam borç arasında dinamik olarak kaydırılabilen (range slider) interaktif faiz ve vade projeksiyon simülasyonu eklendi. Ödeme miktarı aylık faiz+vergi yükünü karşılamadığında **Sonsuz Borç Döngüsü (Infinite Loop)** uyarısı, sadece asgari yatırıldığında ise **Asgari Ödeme Tuzağı (Minimum Payment Trap)** uyarısı anlık reaktif uyarı kutularıyla (warning alerts) görselleştirildi.
- **Gelişmiş İşlem Arama ve Filtreleme**: Kart detayında harcama işlemlerini metinsel arama kutusu ve işlem türü filtreleme düğmeleri (pills) ile süzme özelliği eklendi.

### Sabitlendi

- Kredi kartları sayfalarında bulunan kullanılmayan lucide-react importları ve atanıp kullanılmayan değişkenler (linter uyarıları) tamamen temizlenerek `npm run lint` kontrolü 0 uyarı ile tamamlandı.

## 2026-05-21 - Canonical Debt Model Tamamlama

### Eklendi

- `__tests__/lib/debt-views.test.ts`: `getDebtWorkspaceData` için kapsamlı birim testleri eklendi. `allObligations` parametresiyle vade filtreleme ve serbest mod test edildi.
- `components/debts/DebtsWorkspace.tsx`: `DueDebtPanel` içindeki borç ödeme kartlarına aciliyet seviyesine göre premium glassmorphism tasarımı eklendi (gecikmiş = kırmızı cam, kritik/son 3 gün = sarı cam, normal = yeşil/zümrüt cam). Durum rozetleri güncellendi, ikonlar eklendi ve hover ile yumuşak mikro animasyonlar entegre edildi.

### Değişti

- `lib/health-score-service.ts`: `prisma.debt` → `prisma.debtAccount`; `estimateDebtMonthlyLoad` legacy helper kaldırıldı; borç baskısı ve gecikme sayısı artık `DebtObligation` üzerinden canonical olarak hesaplanıyor. `saveHealthSnapshot` da `DebtAccount.currentBalance` toplamını kullanıyor.
- `lib/dashboard-service.ts`: `prisma.debt.remainingBalance` → `prisma.debtAccount.currentBalance` toplamı.
- `lib/insight-engine.ts`: `prisma.debt` → `prisma.debtAccount`; kısa vadeli borç filtresi `sourceType` ile, toplam borç `currentBalance` ile hesaplanıyor.
- `lib/simulation-engine.ts`: `simulateExtraPayment` artık `debtId` parametresini `DebtAccount.id` olarak alıyor; `prisma.debt.findFirstOrThrow` → `prisma.debtAccount.findFirstOrThrow`.
- `lib/ai/context-composer.ts`: `prisma.debt` → `prisma.debtAccount`; bağlı taraf adı (`counterpartyName`) context'e dahil edildi.
- `app/simulations/page.tsx`: borç listesi `DebtAccount` üzerinden yükleniyor; `id` ve `balance` canonical veriden geliyor.

### Sabitlendi

- `lib/prisma.ts`: Production/Vercel ortamındaki uyumsuz `PRISMA_CLIENT_ENGINE_TYPE="binary"` yapılandırmasından kaynaklanan `PrismaClientValidationError` hatası giderildi. Runtime sırasında bu değişken temizlenerek uygulamanın varsayılan/önerilen `library` (Node-API) engine ile sorunsuz çalışması sağlandı. Bu sayede canlı ortamdaki "Bir hata oluştu" ana sayfa çökmesi çözüldü.
- `lib/debt-views.ts`: "Ödeme Gereken Borçlar" (Due/Required Payments) panelinde vadesi gelmemiş gelecekteki taksitlerin ve ödemelerin gösterilmesi engellendi. Artık bu panelde sadece vadesi geçmiş (`OVERDUE`), bu ay vadesi gelen veya önümüzdeki 10 gün içinde vadesi gelecek olan (`dueDate <= 10 days`) ödemeler listeleniyor. Bütçe planlayıcının (`getMonthlyBudgetSummary`) tüm ödemeleri görebilmesi için `getDebtWorkspaceData` fonksiyonuna `{ allObligations: true }` seçeneği eklendi.

### Doğrulandı

- `npx tsc --noEmit` — 0 hata
- `npm run lint` — 0 uyarı
- `npm run test` — 9 dosya, 133 test başarılı

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

