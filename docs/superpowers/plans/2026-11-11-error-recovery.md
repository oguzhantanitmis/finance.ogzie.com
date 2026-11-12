# finance.ogzie.com: hata ve kurtarma uygulama planı

> Tarihsel LLM-053 planı. 13 Kasım kapanışı commit/push/PR kapsamındadır; main merge ve deploy yok. Güncel cihaz rolleri ve kapılar: [AGENTS.md](../../../AGENTS.md), [STATUS.md](../../STATUS.md).

**Goal:** Hata kesinleşince yüklenmeyi bitir, güvenli kurtarma ve bağımsız fallback sağla.
**Architecture:** Mevcut framework, tasarım tokenları ve yetki denetimleri korunur. Ortak paket/bağımlılık eklenmez.
**Tech Stack:** Depodaki Docker/Node/React/Next.js ve mevcut test araçları.
**Spec:** `~/OgzieOS/knowledge/concepts/ortak-hata-deneyimi.md` (11 Kasım onayı), LLM-053.
**Baseline:** `ca7f11c51c92c0960d0959fce8918d95c210b8cc` + aşağıdaki uncommitted diff; CI SHA iddiası yok.

## Global Constraints

- 404: “Bu sayfayı bulamadık”; 403: “Bu sayfaya erişim izniniz yok”; oturum: “Devam etmek için giriş yapın”; 500: “Bir sorun oluştu”; servis: “Şu anda bağlantı kuramıyoruz. Biraz sonra tekrar deneyin.”
- Teknik detay, exception/SQL, secret/PII gösterme/loglama; form verisini/oturumu koru; yazıları otomatik tekrar etme.
- Hata yüzeyi DB/harici servise bağlı olmayacak; frontend ağdan ulaşılamıyorsa önceden alınmış statik offline yedeği, ilk ziyaret için mevcut proxyye bağlanabilir bağımsız HTML hazırlanacak. Üretim proxy/DB değiştirilmez.
- Yeni servis/bağımlılık, DDL veya prod kesinti testi yok. Test Docker, `agir-is`, konteyner belleği en çok 4G; NetBird doğrulandı: `100.116.107.150`, DNS `cos-linux.netbird.selfhosted`.

## Dosya ve etki

`app/error.tsx`, yeni `app/global-error.tsx`, `app/not-found.tsx`, `app/forbidden/page.tsx`, `components/Recovery.tsx`, `proxy.ts`, `app/login/page.tsx`, `components/ui/ErrorBoundary.tsx`; auth ve currency kök davranışı korunur; servis hatası parola hatasına dönüşmez.
Ortak projeye özel ekler: `public/offline.html`, `public/recovery-sw.js` (mevcut SW varsa kullanılmaz), küçük kayıt bileşeni; `docs/operations/error-recovery.md`, `knowledge/error-recovery.md`, `docs/STATUS.md`.

## Review Focus

- Bozuk/geç cevap gövdesi ve API HTML cevabı ham metin olarak sızmaz.
- İstek abort timerı ve listenerlar temizlenir, unmount sonrası güncelleme yok.
- Gerçek 401/403 ve 429/5xx birbirine çevrilmez; yazı timeoutu çift işlem yaratmaz.
- Offline sayfası API/RSC/oturum verisi cachelemez, POST replay etmez, sabit aynı-origin geri dönüş kullanır.
- Mobil/klavye, 200% zoom ve global layout/provider arızasında içerik/eylem erişilebilir kalır.

### Task 1: Framework hata yüzeyleri

- [ ] Önce zararlı hata mesajının görünmediğini, 404/500 metinlerini ve native link/button davranışını sınayan render testi yaz; mevcut sürümde başarısızlığı kaydet.
- [ ] DB/provider bağımsız global fallback ve mevcut stile uygun yerel hata bileşeni ekle; 404 gerçek HTTP404 kalır.
- [ ] Statik offline HTML ve yalnız GET navigasyonu için offline yedeği hazırla; ilk soğuk ziyarette origin yoksa proxy kurulumu ayrı yayına bağlı kabul.

### Task 2: Projeye özgü istek/kurtarma

- [ ] Gerçek hata akışını mock HTTP/DB ile ortaya koy; deadline, status, sınırlı güvenli retry ve state korunumu testlerini yaz ve RED doğrula.
- [ ] Yalnız bu projede eksik olan davranışı en az kodla tamamla; sağlıklı auth/tenant sözleşmelerini koru.
- [ ] İlgili regresyonları Docker içinde çalıştır, sonuçları Task 3 kaydına ekle.

### Task 3: Kabul ve kayıt

- [ ] `agir-is` altında Docker test/lint/typecheck/build; mevcut baseline hatalarını yeni hatadan ayır.
- [ ] Yerel NetBird bind ile 404, 401/403 (uygunsa), 5xx/offline/timeout, GET retry kurtarma ve POST tekrar edilmemesini doğrula; production kesme.
- [ ] 390/768/1440 viewport, Tab/Enter, overflow, sticky chrome ve zoom doğrula; gerçek cihaz/screen reader yapılmadıysa açık yaz.
- [ ] docs/knowledge/takip dosyasına gerçek base SHA, uncommitted diff, test çıktısı ve kalan kabulü kaydet. Son diff/sır/yetki self-review.

## Plan öz denetimi

Kapsam, HTTP davranışı, DB bağımsız yüzey, oturum/form korunması, timeout/retry, erişilebilirlik ve belge görevlerle eşleşti. Uygulanmayan auth/DB senaryoları statik sitelerde N/A olarak işaretlenecek; başarı uydurulmayacak.

## 12 Kasım 2026 — devam kabul kaydı

Mevcut checkout ve dirty kaynak korunarak devam edildi. 9 Node + 182 Vitest; 10/10 tarayıcı kontrolü ve gerçek Dockerfile builder/runtime geçti. Typecheck geçti. Lint: temiz HEAD ile aynı 20 ürün hatası; mevcut #45 ayrı bağımlılık/lint PR kapsamı.

Nihai kapı, SHA/diff/manifest, ilk başarısız koşular ve çalıştırılmayan kabul: [docs/STATUS.md](../../STATUS.md). Önceki checkbox/RED iddiaları bu devamda yeniden yaşanmayan bir geçmiş testi varmış gibi kapatılmadı. Commit/push/deploy yok.
