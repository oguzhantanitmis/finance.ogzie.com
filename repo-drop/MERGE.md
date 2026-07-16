# MERGE — repo-drop → finance.ogzie.com

Bu klasördeki `components/` ve `lib/` alt klasörleri **repodaki birebir hedef yollarıyla** aynı.
Doğrudan repo köküne kopyalayabilirsin.

## 0) Ön koşul — repoyu yerel bilgisayara klonla

Önce repoyu Windows'a indirmen (klonlaman) gerekir. (Git kurulu değilse: https://git-scm.com/download/win)

```powershell
# Çalışmak istediğin bir klasörde PowerShell aç (örn. C:\projeler):
cd C:\projeler
git clone https://github.com/oguzhantanitmis/finance.ogzie.com.git
cd finance.ogzie.com
```

Artık `C:\projeler\finance.ogzie.com` senin yerel repo kökün. İndirdiğin `repo-drop`
klasörünü de buraya (veya yanına) çıkar. Aşağıdaki tüm komutlar **bu klasörün içinde**
çalıştırılır.

> Alternatif: GitHub Desktop ile "Clone repository" → repoyu görsel olarak indirip
> aynı işi yapabilirsin.

## 1) Dosyaları yerleştir

### macOS / Linux (Terminal)
```bash
# repo kökünde (finance.ogzie.com/):
cp -r repo-drop/components/* components/
cp -r repo-drop/lib/* lib/
```

### Windows — PowerShell (önerilen: robocopy, klasörleri temiz birleştirir)
```powershell
# repo kökünde (finance.ogzie.com\) PowerShell aç:
robocopy repo-drop\components components /E
robocopy repo-drop\lib lib /E
```
> `robocopy` mevcut klasörleri bozmadan içine dosyaları yerleştirir, eksik alt
> klasörleri oluşturur. (Çıkışta "1" gibi bir kod görmen normaldir — hata değildir.)

### Windows — alternatif: Copy-Item
```powershell
Copy-Item repo-drop\components\* components\ -Recurse -Force
Copy-Item repo-drop\lib\* lib\ -Recurse -Force
```

### En kolay (kod komutu yok): VS Code / Dosya Gezgini
`repo-drop\components` ve `repo-drop\lib` klasörlerinin **içindekileri**, repo kökündeki
`components` ve `lib` klasörlerinin içine sürükle-bırak; Windows "birleştir/değiştir"
sorduğunda onayla.

Yerleşen dosyalar:
- `components/charts/MiniCharts.tsx`  ← önce bu (diğerlerinin ön koşulu)
- `components/MobileTabBar.tsx`
- `components/admin/AdminAITokens.tsx`
- `components/{debts,cards,people,accounts,budget,recurring,payment-plan,goals,reports,health,analytics,simulations,ai}/*Mobile.tsx`
- `lib/ai-usage.ts`

## 2) Açık temayı uygula

`_globals.light-theme.css` içeriğindeki `html.light { … }` bloğunu,
`app/globals.css` içindeki mevcut `html.light { … }` bloğunun YERİNE yapıştır.
(Değişken adları birebir aynı; başka hiçbir şeye dokunma.)

## 3) MobileTabBar'ı bağla

`components/Navbar.tsx` içindeki "Mobile Bottom Quick Nav" `<nav>` bloğunu sil,
layout/AppShell'de mobilde `<MobileTabBar />` render et. İçerik sarmalına mobilde
alt boşluk ekle: `pb-[calc(72px+env(safe-area-inset-bottom))]`.

## 4) Mobil ekranları sayfalara koy

Her `page.tsx`'te (örnek Borçlar):

```tsx
import DebtsMobile from '@/components/debts/DebtsMobile'
// ...
return (
  <PageShell>
    <div className="lg:hidden">
      <DebtsMobile debts={mapToDebtItems(data)} />
    </div>
    <div className="hidden lg:block">
      <DebtsWorkspace {...} />
    </div>
  </PageShell>
)
```

`mapToDebtItems` = kendi servis verini bileşenin `export interface` prop tipine eşleyen
küçük bir dönüştürücü. Tipler her dosyanın başında tanımlı.

## 5) Token takibi (AI)

`_token-takibi.md`'yi izle:
1. `prisma/schema.prisma` → `AiUsage` modeli + `User.aiMonthlyTokenLimit`
2. `npm run prisma -- migrate dev --name ai_usage_tracking`
3. `lib/ai-usage.ts` zaten kopyalandı — `/api/ai/route.ts`'e `isOverQuota` (öncesi) +
   `recordUsage` (sonrası) kancalarını ekle
4. `/admin` sayfasına `AdminAITokens`'ı bağla (veri sorgusu md'de)

## 6) Commit

```bash
git checkout -b feature/mobil-native-ui
git add -A
git commit -m "feat: mobil-native UI, beyaz+koyu açık tema, AI token takibi"
git push origin feature/mobil-native-ui
# GitHub'da Pull Request aç → main'e merge et (Vercel otomatik deploy eder)
```

> Not: Bu paketi ben doğrudan GitHub'a gönderemiyorum (araçlarım yalnızca okuma/içe
> aktarma yapıyor). Yukarıdaki adımlarla sen birkaç dakikada merge edebilirsin.
> Takılırsan hangi dosyada olduğunu yaz, adım adım yardım edeyim.
