# Changelog

## 2026-07-04

### Değiştirilen dosyalar
- `app/login/page.tsx`
- `app/globals.css`
- `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/checkbox.tsx` (yeni — shadcn/ui)
- `components/ui/animated-characters-login-page.tsx` (yeni — referans/demo)
- `package.json` (yeni bağımlılıklar)

### Değişiklik
- Giriş ekranı fareyi/yazmayı takip eden **animasyonlu karakter** tasarımına geçirildi (solda göz-takipli karakterler + markalı gradyan, sağda shadcn form). Gerçek NextAuth `signIn` + 5 mod + beni-hatırla + `?reset=` korundu (mock auth yok). Önceki split-screen + `AlienDialLoader` intro kaldırıldı (`AlienDialLoader.tsx` repoda kalır).
- Projeye ilk **shadcn/ui** primitive'leri eklendi (button/input/label/checkbox; Radix + CVA). `app/globals.css`'e `@theme inline` **token köprüsü**: shadcn utility'leri (`bg-primary`, `text-muted-foreground`, `border-border` …) projenin runtime tasarım değişkenlerine eşlendi → dark/light tema geçişi korunur (proje shadcn-CLI projesi değil).
- **Perf (PR #23):** animasyon fare-takibi tek rAF-throttle'lı paylaşımlı kaynağa indirildi (9 dinleyici → 1) + `left/top` yerine `transform: translate` + `will-change`. Görsel birebir aynı; render commit'leri ~247 olay/sn altında ~60/sn'ye sabit.
- Doğrulama: tsc 0 hata, eslint temiz, 154 test PASS, `/login` 200, token köprüsü dark/light computed-style ile teyit. main'e merge (PR #22, #23).

## 2026-06-24

### Değiştirilen dosyalar
- `app/login/page.tsx`
- `app/ogzie-sso/page.tsx`, `app/ogzie-sso/auto-login.tsx`
- `components/AlienDialLoader.tsx` (yeni)
- `components/OgzieSsoLoader.tsx` (yeni)
- `components/ContentWidthSetter.tsx` (yeni)
- `components/BrandLogo.tsx`, `components/AppShell.tsx`, `components/TopBar.tsx`, `components/PageShell.tsx`
- `components/notifications/NotificationBell.tsx`
- `lib/logo-utils.ts`, `lib/subscription-enrichment.ts`
- `docs/ogzie-sso-loader/**` (yeni teslim paketi), `tsconfig.json`

### Değişiklik
- Giriş sayfası premium split-screen olarak yeniden tasarlandı; açılışta tam ekran `AlienDialLoader` intro animasyonu (atlanabilir) → form. NextAuth 5 modu korunur.
- ogzie SSO yükleme animasyonu taşınabilir `OgzieSsoLoader` şablonuna çıkarıldı (token-bağımsız, prop'larla yapılandırılır); `/ogzie-sso` AppShell'den muaf tutuldu (çıplak shell gizlendi). `docs/ogzie-sso-loader/` teslim paketi + dokümantasyonu eklendi.
- Marka logoları beyaz tile + isimden tazeleme + fallback zinciri (favicon→DuckDuckGo→Clearbit→baş harf); katalog genişletildi (Tabii, Twitch, Copilot, Claude, Gemini, Perplexity, LinkedIn …). `chatgpt` logo kontrast/globe sorunu giderildi.
- TopBar kümesi içerik genişliğini (`--content-max`) takip ediyor; hesap menüsüne tam ARIA klavye navigasyonu eklendi. NotificationBell `set-state-in-effect` lint hatası giderildi.
- Operasyon: auto-deploy webhook'u devreye alındı (main'e merge → otomatik Dokploy deploy). Doğrulama: tsc 0 hata, 133 test PASS, canlı 200.

## 2026-06-23

### Değiştirilen dosyalar
- `components/TopBar.tsx` (yeni)
- `components/SidebarContext.tsx` (yeni)
- `components/AppShell.tsx`
- `components/Navbar.tsx`
- `components/notifications/NotificationBell.tsx`

### Değişiklik
- Masaüstü kenar çubuğunun footer kontrolleri (tema, gizli mod, bildirim, çıkış) içerik alanının üstündeki yeni bir üst bara (`TopBar`, sticky, `lg+`) taşındı: **solda** daralt/genişlet toggle'ı, **sağda** kontrol kümesi. Kenar çubuğunun alt bölümü tamamen kaldırıldı. `collapsed` durumu `SidebarContext` ile Navbar↔TopBar arasında paylaşılıyor. Hesap pill'i açılır menüsü: profil (ad + e-posta), Ayarlar, Çıkış Yap.
- `NotificationBell`'e geriye uyumlu `buttonClassName` prop'u eklendi; açılır panel tema token'larına geçirilerek açık tema uyumu sağlandı ve a11y iyileştirildi (`aria-haspopup`/`aria-expanded`/`aria-label`, `Escape` ile kapanma).
- Mobil üst bar ve menü değişmedi. Doğrulama: `tsc` 0 hata, 133 test PASS, prod deploy (`218e1c5`) başarılı.

## 2026-05-21

- Canonical borç refaktörü başlatıldı; `DebtAccount`, `DebtObligation`, `DebtPayment` modelleri ve ilgili enumlar Prisma şemasına eklendi.
- Canonical borç tabloları için veri kaybı yaratmayan migration oluşturuldu; eski `Debt`, `PaymentPlan`, `CreditCard`, `Account/KMH` ve `ReceivablePayable` tabloları uyumluluk için korunuyor.
- Eski kredi, kredi kartı, KMH ve kişisel borç kayıtlarını `DebtAccount/DebtObligation` kaynağına dönüştüren canonical sync/ödeme servisi eklendi.
- `/debts`, `/payment-plan` ve bütçe borç baskısı hesapları canonical `DebtObligation.remainingAmount` kaynağına taşındı.
- Kredi, kart, KMH hesap ve kişisel borç mutasyonlarında canonical borç hesabını güncelleyen bağlantılar eklendi.
- Canonical borç ödeme akışında `obligationId` ve opsiyonel ödeme hesabı `userId` ile doğrulanarak IDOR riski kapatıldı.
- Idempotent backfill için `scripts/migrate-canonical-debts.mjs` eklendi.
- Üretim veritabanında canonical borç migration ve backfill çalıştırıldı; 4 canonical borç hesabı, 14 ödeme yükümlülüğü doğrulandı.
- Root README internal teknik/handoff dokümanı olarak yeniden yazıldı; mimari, veri modeli, finans motorları, güvenlik, entegrasyon ve operasyon akışları tek dosyada toplandı.
- KMH borç görünümü Yapı Kredi hesap özeti açıklamalarına göre netleştirildi; tahmini asgari satırı kaldırıldı, zorunlu asgari yalnızca ekstre formülüyle gösterilir.
- KMH maliyet analizinde asgari anapara (%5), dönem faizi/vergi, zorunlu asgari, gecikme artışı ve güncel borç ayrı satırlara bölündü.
- KMH kart başlığındaki güncel borç, son ödeme tarihi geçtiyse hesaplanan gecikme artışını da içerecek şekilde güncellendi.

## 2026-05-18

- Bütçe özeti borç baskısı eski borç tahmininden çıkarıldı; artık Borçlar sayfasındaki kredi taksidi/KMH/kart ödeme yükümlülükleriyle aynı kaynaktan hesaplanır.
- Gecikmiş borç ödeme yükümlülükleri bütçe yaklaşan ödemeler listesinde de görünür hale getirildi.
- Borçlar sayfasına "Ödemen gereken borçlar" paneli eklendi; kredi taksidi, KMH asgari ödemesi ve kredi kartı asgari ödemesi tek yerden ödendi olarak işaretlenebilir.
- KMH için aylık gecikme faizi alanı eklendi; asgari ödeme vadesi geçerse gecikme günü ve gecikme maliyeti otomatik hesaplanır.
- KMH asgari ödemesi ödendiğinde dönem faizi/gecikme maliyeti önce kapatılır, kalan tutar anaparadan düşülür.
- KMH asgari ödemesi sonrası eski son ödeme tarihi üzerinden tekrar gecikme faizi üretmemesi için dönem otomatik ileri alınır; ödeme günü hafta sonuna denk gelirse sonraki iş gününe taşınır.
- Kredi kartı asgari ödemesi ödendiğinde ilgili ekstreye kart ödeme kaydı açılır; gecikme varsa faiz/vergi hareketi de karta işlenir ve borç görünümü net tutardan düşer.
- Yapı Kredi İhtiyaç kredisi ödeme planı PDF değerlerine göre hedeflendi: 343.156,99 TL anapara, %4,49 faiz, 12 vade, ilk taksit 04.04.2026, ilk taksit ödendi.
- Kredi ödeme planı görünümünde aynı taksit numarasına ait eski seed satırları tekilleştirildi; eski 2025 satırlarının ödenmiş/gecikmiş durum üretmesi engellendi.
- Kredi maliyet analizi sıradaki taksit, ödenen/kalan taksit, toplam vade, toplam faiz, toplam vergi ve kalan anapara üzerinden sadeleştirildi.
- Yapı Kredi Esnek Hesap/KMH için hesap özeti alanları eklendi: hesap kesim tarihi, son ödeme tarihi, anapara borcu, dönem faizi + vergi, asgari ödeme, sonraki kesim tarihi.
- KMH borç görünümü Yapı Kredi Esnek Hesap mantığına göre düzenlendi: dönem borcu = anapara borcu + dönem faizi/vergi; asgari ödeme = anapara %5 + dönem faizi/vergi.
- Üretim verisi düzeltmesi için `scripts/repair-yapikredi-data.mjs` eklendi; Oğuzhan kullanıcısının Yapı Kredi İhtiyaç ve Yapı Kredi KMH kayıtlarını PDF değerleriyle günceller.

## 2026-05-22 00:15

### Değiştirilen dosyalar
- `components/assets/AssetsWorkspace.tsx`

### Değişiklik
- Varlıklar sayfası header KPI kartları: USD/TRY ve Gram Altın kurları yerine kullanıcının biriktirdiği yabancı para toplamları gösterilir (örn. "Toplam USD: 250,00 USD ≈ ₺11.402,50 • 1 USD = ₺45,61")
- Para birimi yoksa ikinci/üçüncü kart görünmez

### Doğrulama
- tsc --noEmit: hata yok
- git push: başarılı

## 2026-05-22 00:25

### Değiştirilen dosyalar
- `app/page.tsx`

### Değişiklik
- Dashboard "Kritik sinyaller": uyarı kartları `space-y-3` → `grid-cols-2` iki sütunlu grid, padding/font küçültüldü, içerik `line-clamp-2` ile kırpıldı

## 2026-05-22 01:15

### Değiştirilen dosyalar
- `prisma/schema.prisma`
- `types/next-auth.d.ts`
- `lib/auth.ts`
- `lib/server-auth.ts`
- `app/login/page.tsx`
- `app/settings/profile-actions.ts`
- `components/settings/SettingsWorkspace.tsx`

### Değişiklik
- **Schema**: `failedLoginAttempts`, `lockedUntil`, `sessionVersion`, `passwordResetToken`, `passwordResetExpiry`, `lastLoginIp` alanları eklendi
- **Brute-force koruması**: 5 başarısız giriş → 15 dk hesap kilidi; kalan deneme sayısı mesajı
- **Beni hatırla**: JWT maxAge dinamik — seçilmezse 8 saat, seçilirse 30 gün
- **Session invalidation**: `sessionVersion` ile tüm aktif JWT'ler geçersiz kılınabilir; şifre değişiminde otomatik tetiklenir
- **Login UI**: premium redesign, şifre göster/gizle, beni hatırla checkbox, detaylı hata mesajları
- **TypeScript**: next-auth augmentation'a `id`, `sessionVersion` eklendi (artık optional değil)
- **Settings**: "Tüm oturumları sonlandır" butonu — `sessionVersion++` tetikler

### Doğrulama
- tsc --noEmit: hata yok
- npm run build: temiz

### ⚠️ Gerekli adım
Yeni DB sütunları için terminalde çalıştırın:
```bash
npm run db:push
```
Bu yapılmadan auth özellikleri (brute-force, sessionVersion) çalışmaz.
