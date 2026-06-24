# OgzieSsoLoader — "ogzie ile giriş" yükleme animasyonu (taşınabilir şablon)

ogzie SSO ile giriş yapılırken gösterilen **tam ekran yükleme + hata animasyonu**.
Tek dosyalık, taşınabilir bir React bileşeni. Tüm ogzie sistemlerine (finance,
mesai360, …) kopyala-yapıştır ile eklenebilir.

> Canonical kaynak: `components/OgzieSsoLoader.tsx` (finance.ogzie.com).
> Bu klasör, başka projelere taşımak için kendi kendine yeten bir kopyadır.

---

## Bu paketteki dosyalar

| Dosya | Açıklama |
|---|---|
| `OgzieSsoLoader.tsx` | **Bileşen** — hedef projeye kopyalanacak tek dosya. |
| `examples/auto-login.tsx` | NextAuth `signIn('ogzie')` ile SSO sarmalayıcı (auth mantığı). |
| `examples/page.tsx` | Next.js App Router sayfası (`/ogzie-sso?token=…`). |
| `examples/standalone-demo.tsx` | `loading ↔ error` geçişini yerelde test için demo. |
| `README.md` | Bu doküman. |

---

## Gereksinimler

- **React** 18 veya 19
- **framer-motion** (animasyon)
- **lucide-react** (ikon — hata ekranı `AlertCircle`)
- **Tailwind CSS** (v3 veya v4) — layout/animasyon utility class'ları için (`flex`, `rounded-2xl`, `blur-2xl`, `w-20`, …). Renkler inline style ile gelir, ama düzen Tailwind'e dayanır.
- (Örnekler için) **Next.js App Router** + **next-auth** — zorunlu değil, bileşen framework-bağımsızdır.

---

## Kurulum

```bash
npm install framer-motion lucide-react
```

`OgzieSsoLoader.tsx`'i hedef projede `components/` altına kopyala. (Import yolları
`@/components/OgzieSsoLoader` varsayar; alias yoksa göreli yolu kullan.)

---

## Hızlı başlangıç

```tsx
import OgzieSsoLoader from '@/components/OgzieSsoLoader'

// Sadece görsel:
<OgzieSsoLoader />                              // "ogzie ile giriş yapılıyor…"
<OgzieSsoLoader state="error" />               // hata ekranı + "Giriş sayfasına dön"

// Markala:
<OgzieSsoLoader brandInitial="M" primaryColor="#16a34a" message="mesai360'a giriş yapılıyor…" />
```

---

## Props

Hepsi opsiyoneldir.

| Prop | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `state` | `'loading' \| 'error'` | `'loading'` | Görünüm modu. |
| `message` | `string` | `ogzie ile giriş yapılıyor…` | Yükleme metni. |
| `errorTitle` | `string` | `ogzie ile giriş başarısız` | Hata başlığı. |
| `errorMessage` | `string` | (bkz. dosya) | Hata açıklaması. |
| `returnHref` | `string` | `/login` | Hata ekranı dönüş bağlantısı. |
| `returnLabel` | `string` | `Giriş sayfasına dön` | Dönüş butonu metni. |
| `brandInitial` | `string` | `O` | Logo tile içindeki harf. |
| `brandLogo` | `ReactNode` | — | Özel logo (initial yerine; `<img>`/SVG geçebilirsin). |
| `primaryColor` | `string` | `var(--accent-primary, #6366f1)` | Ana marka rengi (logo, noktalar, buton, halo). |
| `secondaryColor` | `string` | `var(--accent-purple, #a78bfa)` | İkinci halo rengi. |
| `background` | `string` | `var(--bg-primary, #0a0a0a)` | Tam ekran zemin (yalnız `fullScreen`). |
| `textPrimary` | `string` | `var(--text-primary, #fafafa)` | Başlık rengi. |
| `textMuted` | `string` | `var(--text-muted, #a1a1aa)` | İkincil metin rengi. |
| `dangerColor` | `string` | `var(--accent-danger, #f87171)` | Hata ikonu rengi. |
| `dangerBg` | `string` | `var(--accent-danger-bg, …)` | Hata ikonu arka planı. |
| `fullScreen` | `boolean` | `true` | `true`: `fixed inset-0` tam ekran + arka plan haloları. `false`: yalnız ortalanmış içerik (kendi zemini olan kapsayıcıya gömmek için). |
| `className` | `string` | `''` | Kök elemana ek sınıf. |

---

## Temalama

Renk varsayılanları `var(--token, fallback)` biçimindedir:

- **Token'lı sistemler** (finance gibi `--accent-primary`, `--bg-primary`, `--text-muted`, `--accent-danger`, `--accent-purple` tanımlı olanlar): hiçbir renk prop'u vermesen bile **otomatik temalanır**.
- **Token'sız sistemler**: ilgili prop'larla markanı geç:
  ```tsx
  <OgzieSsoLoader
    primaryColor="#16a34a"
    background="#0b0f0e"
    textPrimary="#f5f5f5"
    textMuted="#9aa0a6"
  />
  ```

---

## Entegrasyon — Next.js App Router + NextAuth (token SSO)

ogzie launcher kullanıcıyı `https://<app>/ogzie-sso?token=<bilet>` adresine yönlendirir.

**1) Route'u oluştur** — `app/ogzie-sso/page.tsx` ve `app/ogzie-sso/auto-login.tsx`
(`examples/` altındaki dosyalar birebir kullanılabilir).

**2) ⚠️ ÖNEMLİ — global shell'i bu rotada gizle.** Uygulamanın tüm sayfaları
saran bir layout/shell'i (sidebar + üst bar) varsa, `/ogzie-sso`'yu muaf tut;
yoksa yükleme ekranının arkasında boş shell görünür. Örnek (finance `AppShell`):

```tsx
const PUBLIC_PATHS = new Set(['/login', '/ogzie-sso'])
const showShell = !PUBLIC_PATHS.has(pathname)
if (!showShell) return <>{children}</>
```

**3) NextAuth "ogzie" provider'ı** zaten kuruluysa örnek `auto-login.tsx`
`signIn('ogzie', { token, redirect: false })` çağırır; başarılıysa `/`'a, hata
varsa hata ekranına düşer.

Akış özeti:
```
/ogzie-sso?token=…  →  page.tsx  →  <OgzieAutoLogin token>  →  signIn('ogzie')
        ↳ başarı: window.location.assign('/')
        ↳ hata:   <OgzieSsoLoader state="error" />
```

---

## Entegrasyon — genel (NextAuth dışı)

Bileşen framework-bağımsızdır; herhangi bir async giriş akışını sarabilirsin:

```tsx
'use client'
import { useEffect, useState } from 'react'
import OgzieSsoLoader from '@/components/OgzieSsoLoader'

export function MySsoGate({ token }: { token: string }) {
  const [error, setError] = useState(false)
  useEffect(() => {
    let cancelled = false
    myAuthApi.loginWithTicket(token)              // ← kendi SSO çağrın
      .then(() => { if (!cancelled) window.location.assign('/') })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [token])
  return <OgzieSsoLoader state={error ? 'error' : 'loading'} brandInitial="M" primaryColor="#16a34a" />
}
```

---

## Demo / test

`examples/standalone-demo.tsx`'i bir route'a koyup `loading ↔ error` geçişini
yerelde gör.

---

## SSS

- **fullScreen ne zaman `false`?** Sayfan zaten tam ekran markalı bir zemin
  (gradient/halo) sağlıyorsa `fullScreen={false}` ver; bileşen yalnız ortalanmış
  içeriği basar. (finance bu şekilde kullanır — `page.tsx` zemini sağlar.)
- **Logo yerine kendi görselim?** `brandLogo={<img src="/logo.svg" className="w-20 h-20" />}`.
- **Tailwind yoksa?** Layout class'ları çalışmaz; ya Tailwind ekle ya da
  class'ları kendi CSS'inle değiştir. (Gerekirse Tailwind'siz bir varyant istenebilir.)
