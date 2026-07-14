# Test Raporu

## 2026-07-14 — Arşiv Doğrulaması

| Kontrol | Durum |
| --- | --- |
| `npm ci` (Node.js 20.20.2) | Başarılı — lockfile'dan 557 paket kuruldu |
| `npm run lint` | Başarılı — 0 hata, 0 uyarı |
| `npx tsc --noEmit` | Başarılı — 0 hata |
| `npm test` | Başarılı — 11 dosya, 154 test |

İlk repo-geneli lint çalıştırması 24 hata ve 6 uyarı tespit etti. `any` kullanımları, Server Component `try/catch` sınırı, React 19 effect/state kuralları ve kullanılmayan importlar davranış korunarak düzeltildi; yukarıdaki kontroller temiz Node.js 20 container'ında tekrarlandı.

## 2026-07-05 — Güncel Durum

### Otomatik Kontroller

| Kontrol | Durum |
| --- | --- |
| `npx tsc --noEmit` | Başarılı — 0 hata |
| `npm test` (vitest) | Başarılı — 11 dosya, 154 test |
| `npx next dev` (Turbopack) derleme | Başarılı — `/login` 200, hatasız |
| `npm run lint` (değişen dosyalar) | Temiz (repo genelinde eski legacy lint borcu sürüyor) |

### Bu sürümde eklenen/etkilenen senaryolar

| Senaryo | Durum |
| --- | --- |
| Giriş (login) animasyonlu karakter tasarımı | tsc/eslint/derleme; gerçek NextAuth `signIn` + 5 mod + beni-hatırla + `?reset=` korunur |
| shadcn/ui primitive'leri (button/input/label/checkbox) | tsc/eslint temiz; `components/ui/` altında |
| `app/globals.css` shadcn token köprüsü (`@theme inline`) | tarayıcı computed-style ile doğrulandı: `bg-background`/`bg-primary`/`text-muted-foreground` dark↔light doğru |
| Login animasyon performansı (rAF throttle + transform + will-change) | ölçüldü: ~247 fare olayı/sn altında React commit ~59/sn (ekran tazeleme); görsel birebir aynı |

> Aşağıdaki **2026-06-24** ve **2026-05-03** bölümleri önceki sürümlerin raporlarıdır.

---

## 2026-06-24 — Güncel Durum

### Otomatik Kontroller

| Kontrol | Durum |
| --- | --- |
| `npx tsc --noEmit` | Başarılı |
| `npm test` (vitest) | Başarılı — 9 dosya, 133 test |
| `npx next dev` (Turbopack) derleme | Başarılı — hatasız |
| `npm run lint` (değişen dosyalar) | Temiz (repo genelinde eski legacy lint borcu sürüyor) |

### Bu sürümde eklenen/etkilenen senaryolar

| Senaryo | Durum |
| --- | --- |
| Üst bar (TopBar): tema · gizli mod · bildirim · hesap menüsü | tsc/derleme + 20-ajanlı adversarial review ile doğrulandı |
| Kenar çubuğu daralt/genişlet (TopBar solu, `SidebarContext`) | tsc/derleme ile doğrulandı |
| Marka logoları: beyaz tile + isimden tazeleme + fallback zinciri | tsc/derleme; production favicon optimizasyonu teyit edildi |
| Giriş (login) sayfası split-screen yeniden tasarım | tsc/derleme; tüm NextAuth akışı (5 mod) korunur |
| ogzie SSO tam ekran yükleme animasyonu (AppShell gizli) | tsc/derleme; `signIn('ogzie')` akışı korunur |
| Giriş açılış intro animasyonu (`AlienDialLoader`) | tsc/derleme; atlanabilir (tık/Esc/Enter/"Geç"), `prefers-reduced-motion` desteği |
| `OgzieSsoLoader` taşınabilir şablon + `docs/ogzie-sso-loader/` paketi | tsc/derleme; finance refactor sonrası görünüm birebir aynı |
| TopBar içerik-genişliği hizası (`--content-max`, `width="normal"` sayfalar) | tsc/derleme ile doğrulandı |
| Hesap menüsü tam ARIA klavye navigasyonu (ok/Home/End/Escape) | tsc/derleme ile doğrulandı |
| `NotificationBell` `set-state-in-effect` lint hatası giderildi | eslint temiz (hata yok) |

> Aşağıdaki **2026-05-03** bölümü ilk sürümün temel (baseline) raporudur.

---

Tarih: 2026-05-03

## Otomatik Kontroller

| Kontrol | Durum |
| --- | --- |
| `npx prisma format` | Başarılı |
| `npx prisma generate` | Başarılı |
| `npx tsc --noEmit` | Başarılı |
| `npm run test` | Başarılı - 8 dosya, 131 test |
| `npm run build` | Başarılı |
| `npm run lint` | Başarısız - legacy repo lint borcu |

## Senaryo Matrisi

| Senaryo | Durum |
| --- | --- |
| TCMB API anahtarı boşken dashboard bozulmuyor | Kod ve build ile doğrulandı |
| TCMB API anahtarı girilince EVDS header `key` ile veri çekme | Kod ve build ile doğrulandı |
| Kur verisi cache ve `market_rates` tablosuna yazılıyor | Kod ve Prisma client ile doğrulandı |
| Alacak kaydı oluşturma | TypeScript/build ile doğrulandı |
| Verecek kaydı oluşturma | TypeScript/build ile doğrulandı |
| Taksitli alacak oluşturma | TypeScript/build ile doğrulandı |
| Kısmi ödeme | TypeScript/build ile doğrulandı |
| Kalan tutarı yeniden taksitlendirme | TypeScript/build ile doğrulandı |
| Geciken taksitlerin hesaplanması | TypeScript/build ile doğrulandı |
| İşlemlerde nakit seçilince hesap alanının disabled olması | TypeScript/build ile doğrulandı |
| ESC ile modal kapatma | TypeScript/build ile doğrulandı |
| Gelir/gider nakit veya hesaba işlenmesi | TypeScript/build ile doğrulandı |
| Kredi kartı ekleme | TypeScript/build ile doğrulandı |
| American Express seçimi | TypeScript/build ile doğrulandı |
| Garanti Bonus / Akbank Axess mapping altyapısı | TypeScript/build ile doğrulandı |
| Kart detay düzenleme | TypeScript/build ile doğrulandı |
| Aylık bütçe merkezinde ham float gösteriminin kaldırılması | TypeScript/build ile doğrulandı |
| TL para formatları | TypeScript/build ile doğrulandı |
| Borç ödeme planı strateji önerisi | TypeScript/build ile doğrulandı |
| Hedef eklenince plan analizine veri sağlanması | TypeScript/build ile doğrulandı |
| Raporların KPI ve detay özetleri | TypeScript/build ile doğrulandı |
| Finans asistanı örnek sorulara veri tabanlı cevap üretmesi | TypeScript/build ile doğrulandı |
| Açık mod input/kart kontrast düzeltmeleri | CSS ve build ile doğrulandı |
| Koyu mod kontrast korunumu | CSS ve build ile doğrulandı |
| Mobil responsive grid/form yapısı | CSS/JSX ve build ile doğrulandı |

## Lint Notu

`npm run lint` revizyon dışı legacy dosyalarda kalan kurallara takılıyor:

- `app.js` ve `test-prisma.js` içinde CommonJS `require`
- Eski chart/AI dosyalarında `any`
- Eski React bileşenlerinde React 19 lint kuralları
- Kullanılmayan import/değişken uyarıları

Bu lint borcu production build'i engellememektedir. Revizyon kapsamında eklenen yeni ana akışlar `tsc`, test ve production build'den geçmiştir.
