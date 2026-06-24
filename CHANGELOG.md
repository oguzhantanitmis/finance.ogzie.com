# CHANGELOG

## 2026-06-24 - Giriş Deneyimi Yenileme, Marka Logoları, SSO Yükleme Şablonu ve Erişilebilirlik

Giriş (login + ogzie SSO) deneyimi yenilendi, marka logoları dayanıklı hale getirildi, ogzie SSO yükleme animasyonu taşınabilir bir şablona çıkarıldı ve birkaç erişilebilirlik/lint iyileştirmesi yapıldı. Tüm auth akışları (NextAuth `signIn`, 5 login modu, `signIn('ogzie')`) **korundu**. Operasyon: auto-deploy webhook'u devreye alındı.

### Eklendi

- `app/login/page.tsx` (yeniden tasarım): premium **split-screen** — solda markalı hero panel (`lg+`), sağda auth kartı, framer-motion giriş animasyonu. 5 mod (login/forgot/forgot-sent/reset/reset-done) korunur.
- `components/AlienDialLoader.tsx`: tam ekran "alien bileklik kadranı" intro animasyonu — self-contained; props `size`/`primaryColor`/`durationMs`/`loop` (+`onComplete`); `prefers-reduced-motion` desteği; yalnız transform/opacity (GPU dostu), dış varlık yok. Login açılışında `loop=false` bir kez oynar; tık/Esc/Enter/"Geç" ile atlanır.
- `components/OgzieSsoLoader.tsx`: ogzie SSO yükleme/hata animasyonu — **taşınabilir tek dosyalık şablon**. Projeye özel token/class zorunlu değil; renkler `var(--token, fallback)` ile gelir, prop'larla override edilir (`primaryColor`, `brandInitial`, `message`, `fullScreen`, `state`, …).
- `components/ContentWidthSetter.tsx`: aktif `PageShell` genişliğini `--content-max` CSS değişkenine yazar (TopBar kümesinin içerik hizası için).
- `lib/logo-utils.ts`: `brandFaviconFromName`, `brandDomainFromName`, `brandLogoCandidates` (Google favicon → DuckDuckGo → Clearbit → kayıtlı `src` fallback zinciri). `BRAND_DOMAINS`'e yeni markalar: Tabii, beIN, Twitch, Copilot/GitHub, Claude, Gemini, Perplexity, Cursor, LinkedIn, Vercel, Telegram, Discord.
- `lib/subscription-enrichment.ts`: `BRAND_CATALOG` aynı markalarla genişletildi (kategori + renk + keyword).
- `docs/ogzie-sso-loader/`: `OgzieSsoLoader` için kendi kendine yeten **teslim paketi** — `README.md` (kurulum, props, temalama, App Router + NextAuth ve genel entegrasyon örnekleri, AppShell muafiyeti notu, SSS), bileşenin taşınabilir kopyası ve `examples/` (auto-login, page, standalone-demo).

### Değişti

- `components/BrandLogo.tsx`: logo artık **beyaz tile + `object-contain` + padding** üzerine basılıyor → koyu/tek renk logolar (OpenAI/ChatGPT/Notion) koyu temada da net görünür. Bilinen markalar **isimden tazelenir** (eski/`globe` dönen `logoUrl` geçersiz kalır; migration gerekmez). `onError`'da aday kaynaklar arasında ilerler, hepsi tükenirse baş harf rozeti.
- `app/ogzie-sso/page.tsx` + `app/ogzie-sso/auto-login.tsx`: `/ogzie-sso` `AppShell`'den muaf → çıplak shell yerine tam ekran markalı yükleme animasyonu; sonra ortak `OgzieSsoLoader` şablonuna refactor edildi (`fullScreen=false`). `signIn('ogzie')` akışı birebir korunur.
- `components/AppShell.tsx`: `PUBLIC_PATHS`'e `/ogzie-sso` eklendi.
- `components/TopBar.tsx`: küme artık aktif sayfa genişliğini (`--content-max`) takip eder (`width="normal"` sayfalarda hizalı). Hesap menüsü **tam ARIA klavye navigasyonu**: `role=menu/menuitem`, açılışta ilk öğeye odak, `ArrowUp/Down/Home/End`.
- `components/PageShell.tsx`: `ContentWidthSetter` render edilir.
- `components/notifications/NotificationBell.tsx`: açılır panel tamamen tema token'larına geçirildi (açık tema uyumu); zil butonuna `aria-haspopup`/`aria-expanded`/`aria-label` + `Escape`; `buttonClassName` propu (TopBar pill); okunmamış nokta ring rengi yüzeye uyduruldu.
- `tsconfig.json`: `docs` `exclude`'a eklendi (şablon örnek `.tsx`'leri build/typecheck dışı).

### Sabitlendi

- `components/notifications/NotificationBell.tsx`: mount efektindeki senkron `setState` kaldırıldı (fetch inline async, `setState` yalnız `await` sonrası) → `react-hooks/set-state-in-effect` lint hatası giderildi + unmount guard.
- Marka logosu kontrastı: `chatgpt` gibi koyu logolar koyu temada görünmüyordu → beyaz tile ile çözüldü; eski kaydın `globe` dönen `logoUrl`'ü isimden tazelenerek düzeldi.

### Doğrulandı

- `npx tsc --noEmit` — 0 hata
- `npm test` (vitest) — 9 dosya, 133 test PASS
- eslint — değişen dosyalar temiz (NotificationBell lint hatası **dahil** giderildi)
- Next.js 16 dev derleme — `/login`, `/ogzie-sso` 200, hatasız
- Production (Dokploy `finance-web`) — PR #11–#16 deploy edildi; canlı 200.

### Bilinen Notlar / Operasyon

- **Auto-deploy webhook'u devreye alındı**: `main`'e merge artık Dokploy deploy'unu otomatik tetikler (önceki sürümlerde elle tetikleniyordu).
- `docs/ogzie-sso-loader/` paketi diğer ogzie sistemlerine (mesai360 …) taşınmak üzere hazırlandı; global shell'i olan sistemlerde `/ogzie-sso` rotasını muaf tutmak gerekir.

## 2026-06-23 - Üst Header Kümesi (TopBar): Sidebar Footer Kontrollerinin Taşınması

Masaüstü kenar çubuğunun dikey footer kontrolleri (tema, gizli mod, bildirim, çıkış) ogzie uygulaması referans alınarak içerik alanının üstüne, **sağa yaslı yatay bir header kümesine** taşındı. Yalnızca sunum katmanı — auth helper'ları, server action'lar ve Prisma sorguları **dokunulmadı**.

### Eklendi

- `components/TopBar.tsx`: Yeni client component — masaüstü (`lg+`) sticky üst bar. **Solda** kenar çubuğunu daralt/genişlet butonu (`PanelLeft`); **sağda** kontrol kümesi: tema toggle (Sun/Moon), Gizli Mod toggle (Shield/ShieldOff), `NotificationBell`, dikey ayraç ve **hesap pill'i** (avatar baş harfi + ad + "Hesap" + chevron). Hesap açılır menüsü: profil (ad + e-posta), **Ayarlar** linki, **Çıkış Yap**. Dışarı tıklayınca ve `Escape` ile kapanır; kapanışta odak tetikleyici butona döner. Tüm renkler tema token'ları üzerinden (açık/koyu uyumlu).
- `components/SidebarContext.tsx`: Yeni `SidebarProvider` + `useSidebar()` — kenar çubuğunun `collapsed` durumunu Navbar (genişlik) ile TopBar (toggle butonu) arasında paylaşır ve `--sidebar-width` CSS değişkenini senkronlar.

### Değişti

- `components/AppShell.tsx`: `<TopBar />` `<main>` içeriğinin başına eklendi (masaüstünde sticky, mobilde gizli). Ağaç `<SidebarProvider>` ile sarıldı.
- `components/Navbar.tsx`: Masaüstü kenar çubuğunun alt "Bottom Actions" bölümü **tamamen kaldırıldı** — tema, gizli mod, bildirim, çıkış ve daralt/genişlet kontrollerinin tümü TopBar'a taşındı. `collapsed` local state'i ve `--sidebar-width` efekti `SidebarContext`'e taşınarak `useSidebar()` ile tüketiliyor. Mobil üst bar ve mobil menü **değişmedi**.
- `components/notifications/NotificationBell.tsx`:
  - Geriye uyumlu `buttonClassName` prop'u — bileşen TopBar'da yuvarlak pill buton olarak render edilebiliyor.
  - Açılır panel tamamen tema token'larına geçirildi (`bg-zinc-*` / `text-white` hardcoded sınıfları kaldırıldı). `globals.css` light-mode savunma katmanının yakalamadığı opacity/hover varyantları (`bg-zinc-900/50`, `hover:bg-zinc-900` vb.) düzeltildiği için açık temada da doğru görünüyor.
  - Erişilebilirlik: zil butonuna `aria-haspopup`, `aria-expanded` ve okunmamış durumu yansıtan `aria-label`; `Escape` ile kapanma; okunmamış bildirim noktasının ring rengi yeni pill yüzeyine uyduruldu.

### Erişilebilirlik (a11y)

- Hesap menüsündeki gerçeklenmeyen `role="menu"` / `role="menuitem"` kaldırıldı; native link/buton semantiği korundu (`aria-haspopup="true"`).
- `Escape` ile kapanma + odak yönetimi (TopBar hesap menüsü ve NotificationBell).
- Hesap açılır menüsündeki e-posta satırı WCAG AA kontrastı için `--text-muted` → `--text-secondary`.

### Doğrulandı

- `npx tsc --noEmit` — 0 hata
- `npm test` (vitest) — 9 dosya, 133 test PASS
- Next.js 16 dev derleme (Turbopack) — hatasız
- Production deploy (Dokploy `finance-web`, commit `218e1c5`) başarılı; canlı `https://finance.ogzie.com` 200 yanıtı doğrulandı.

### Bilinen Notlar

- Header kümesi içerik genişliği `genis` (`max-w-[1820px]`) ile hizalıdır; `width="normal"` kullanan sayfalarda (örn. `/settings`) çok geniş ekranlarda küme içeriğin sağ kenarından bir miktar dışarıda kalabilir (kozmetik, düşük öncelik).
- Dokploy `autoDeploy: true` olmasına rağmen repoda GitHub webhook'u bağlı olmadığından `main`'e merge otomatik deploy tetiklemiyor; deploy elle (Dokploy) tetiklendi.

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

