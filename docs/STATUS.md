# finance.ogzie.com — LLM-054 kapanış durumu

Linux devir kaydındaki feature dalı `oguzhantanitmis/error-recovery-20261111`; doğrulanmış GitHub hedefi `main`. Başlangıçta ikisi de `ca7f11c51c92c0960d0959fce8918d95c210b8cc` idi: 0 ahead/0 behind, upstream ve yeni commit yoktu. Hata kurtarma işi tamamen kirli kaynakta bulunuyordu; main'e önceden alınmış değildi. GitHub fetch yapıldı, açık PR #45/#24/#3/#2/#1 incelendi ve bu işe katılmadı. Bu paragraf tarihsel Linux durumudur.

## Kaynak

Mevcut anlamlı değişiklikler korunarak bağımsız 404/global error/offline yüzeyleri, sınırlı fetch/DB beklemeleri, API hata redaksiyonu ve auth hata ayrımı commit/PR kapsamına alındı. Bu kapanışta iki ek düzeltme yapıldı:

- Redakte Prisma bağlantı kodları güvenli okuma retry/hata ayrımında tanınır; constraint hatası tekrar edilmez.
- Abonelik zenginleştirme API'sinde yalnız gerçek eksik oturum 401'dir; DB kesintisi 503 olarak kalır ve cookie silinmez.

Yeni bağımlılık, CI kullanıcısı/servisi, DB migration veya deploy yok. Üretilmiş evidence/log/diff/screenshot ve `.local` dosyaları Git ve Docker bağlamı dışında korunur. Yerel kapanış raporu `.local/llm054-closure-report.md` dosyasındadır; repoya alınmaz.

## Tarihsel Linux doğrulaması

| Kapı | Kanıt ve sınır |
|---|---|
| Yeni regresyonlar | Linux Docker, agir-is + gerçek user bus, 4 GiB / 2 CPU: önce 10 başarısız + 3 başarılı; düzeltmeden sonra 13/13 başarılı. İlk harness dosya kopyalama hatası test başarısızlığı kanıtı sayılmadı; doğru test koşusu ayrıca alındı. |
| Gerçek Dockerfile builder | Kapanışta başlatılmış build exit 0: Next 16.4.2 production build ve TypeScript geçti. Kullanıcının yerel işleri durdurma düzeltmesinden önce başlamıştı; güvenle sonuçlandırıldı. |
| Tam süit / runtime / tarayıcı | 12 Kasım tarihsel Linux kabulü: 182 Vitest + 9 Node, gerçek runtime, tarayıcı 10/10; izole DB ile 200→500→200 ve aynı oturum. Son iki düzeltme sonrasında tam süit/runtime/tarayıcı yeniden çalıştırılmadı. |
| Lint | Tarihsel temiz base ve kirli kaynakta aynı 20 ürün hatası; #45 ayrı lint/bağımlılık PR'ı. Güncel tam lint çalıştırılmadı; yeşil denmez. |
| GitHub CI | **Tarihsel 12 Kasım gözlemi:** API o anda 0 runner / 0 workflow / 0 run döndürdü. Güncel runner ve SHA kanıtı aşağıdadır. |
| Sır taraması | Aday commit kaynakları Gitleaks v8.28.0 ile redakte çıktı kullanılarak taranır; nihai sonuç yerel kapanış raporundadır. |

Eski Linux testleri Mac/Ryzen hazır kabulü değildir. MacBook yalnız ajan/kod yönetimi ve tarayıcı kabul yüzeyidir; Mac Docker/Colima kullanımı geçerli değildir. Güncel Ryzen rootless kabulü aşağıdadır; mevcut rootful oyun daemon'una erişim verilmez. Cihaz kuralı [AGENTS.md](../AGENTS.md) ve [işletim notunda](operations/error-recovery.md) sürümlüdür.

## Açık kapılar

İzole DB yaşam döngüsü ve tarayıcı kabulü; lint baseline çözümü; repo için Ryzen CI erişimi; koordinatörün ayrı readonly incelemesi. Gerçek Mac/Brave/fiziksel mobil/ekran okuyucu ve ilk soğuk ziyarette origin kesintisi proxy fallback kabulü yapılmadı. Production proxy fallback aktivasyonu ayrı yayın işidir. Main'e merge Dokploy production deploy tetikleyebilir; bu iş main merge/deploy içermez. PR incelemeye sunulur, otomatik merge açılmaz.

## Mac devri ve güncel kabul — 13 Kasım 2026

Mac checkout `f60e044` üzerinde temizdi ve GitHub `main` (`ca7f11c`) dalının 6 commit gerisindeydi. Final özel arşivin `ca7f11c` tabanlı 60 dosyalık tracked patch'i doğrulandı; final untracked tar boştu. Patch, Mac'te `origin/main` tabanlı `codex/llm054-finance-closure` iş dalına çatışmasız taşındı. İmzalı Ogzie API'lerinin açık 500 `not_configured` gövdesi korunacak, beklenmeyen hata ise redakte edilecek şekilde dar bir sözleşme düzeltmesi ve regresyon testi eklendi. Eski `main` checkoutuna veya Linux kaynağına reset/clean uygulanmadı.

Ryzen `ogzie-dev` rootless Docker socket'i doğrulandı. Ayrı BuildKit konteyneri 4 GiB RAM ve 2 CPU ile sınırlandı. Dockerfile builder ve TypeScript derlemesi geçti; temiz test kopyasında 195/195 Vitest, 10/10 Node testi ve `tsc --noEmit` geçti. Lint 20 hata ve 17 uyarıyla kaldı; 20 hata devir raporundaki baseline sayısıyla aynı ve ayrı #45 işi açık. Gitleaks v8.28.0 kaynak taraması exit 0 / 0 bulgu verdi. İlk test kopyasında Mac arşivleme `._*` meta dosyaları 19 dosyada ayrıştırma hatası yarattı; yalnız geçici Ryzen kopyasından 344 meta dosyası kaldırıldı ve temiz kaynakla derleme/test tekrarlandı. Bu ilk koşu ürün testi olarak sayılmadı.

Dockerfile runtime imajı da geçti. Üretim DB'si yerine erişilemeyen test adresiyle başlatılan runtime'da `/unavailable.html` ve `/offline.html` 200, `/login/definitely-missing-llm054` 404, korunan `/api/subscription-enrich` 401, `/api/auth/csrf` 200 ve credentials DB kesintisi 503 / `SERVICE_UNAVAILABLE` döndürdü. Test konteyneri durduruldu. Gerçek izole DB yaşam döngüsü, Mac/Brave, fiziksel mobil ve ekran okuyucu kabulü yapılmadı.

Bu paragraf ilk Mac devrinin tarihsel anlık görüntüsüdür: o anda bu repoda 0 workflow, 0 runner ve 0 run vardı. Ryzen NetBird daemon'u `NeedsLogin` durumundaydı; doğrulanmış NetBird önizleme bağlantısı yoktu. Main merge veya production deploy yapılmadı.

## Güncel CI kanıtı ve PR #46 kaynak kapısı — 13 Kasım 2026

`.github/workflows/finance-ci.yml` artık `codex/llm054-finance-closure` push olayında mevcut `ryzen-finance-1` self-hosted runner'ını kullanıyor. [Actions run 43320750837](https://github.com/oguzhantanitmis/finance.ogzie.com/actions/runs/43320750837) gerçek `7176cfea7b4ed848f19c780bfec9902209f90fab` SHA'sını checkout ve `git rev-parse HEAD` ile doğrulayıp başarılı tamamlandı: 24 dosyada 209 Vitest, 10 Node recovery testi, TypeScript, `origin/main..HEAD` Gitleaks, production build ve lint exit 0 (0 hata, 10 uyarı). Bu koşu sonraki commitler için kanıt sayılmaz; her yeni PR head SHA'sı ayrıca doğrulanır.

Bağımsız kaynak incelemesi AI insight ve bildirim action hata akışlarında üç açık bulgu saptadı. Bu düzeltme `success:false` sonucunu boş durumdan ayırır, bildirim yüklemesini sonlu bekleme ve elle retry ile kapatır, AI/bildirim Server Action hata metinlerini redakte eder. Yeni head'in CI ve bağımsız yeniden incelemesi tamamlanmadan kaynak kabulü kapalıdır. `experimental.cpus: 2` aynı Next yapılandırmasını kullanan diğer buildlerde de sayfa verisi worker sayısını sınırlar; CI lint/test/build/secret kapılarında gevşetme yapılmadı. Main merge/deploy koordinatör kapısındadır.
