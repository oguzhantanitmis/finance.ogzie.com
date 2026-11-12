# finance.ogzie.com: hata ve kurtarma işletimi

Onay: 11 Kasım 2026 ortak hata deneyimi. Güncel kapılar ve sınırlar: [takip kaydı](../STATUS.md).

Framework error/global-error/not-found yüzeyleri DB ve sağlayıcılardan bağımsızdır. Ham exception render edilmez. Sunucudaki auth/tenant denetimi korunur. Sonucu belirsiz yazmalar otomatik yeniden gönderilmez; güvenli DB okumaları sınırlı tekrar denenir. Prisma connect/pool/query süreleri sırasıyla en fazla 5/5/15 saniyedir.

Offline worker yalnız aynı origin GET navigasyonundaki ağ hatasında statik `/offline.html` döndürür. API/RSC/POST veya özel sayfa cachelemez; 401/403/404/429/5xx yanıtlarını değiştirmez. Worker ilk başarılı HTTPS ziyaretinden sonra kullanılabilir. `public/unavailable.html` origin tamamen yokken ilk ziyaret için hazırdır; proxyye gerçek 503/504 ile bağlamak ayrı yayın kapısıdır. Production DB/servis durdurularak test yapılmaz.

DB kesintisi kimlik hatası değildir: credentials ve abonelik zenginleştirme servis hatasında 503 verir, oturum cookie'sini silmez. Prisma hata kodları redaksiyon sonrasında korunur; güvenli okuma retry ve hata ayrımı bu kodlarla yapılır. Başarısız formda taslak korunur.

## Ryzen rootless Docker ile doğrulama

Aşağıdaki komutlar yalnız koordinatörün hazırlayıp doğruladığı Ryzen rootless Docker hedefinde çalıştırılır. Mac veya mevcut Linux rootful daemon üzerinde başlatılmaz. Aynı `Dockerfile`, `.nvmrc`, `package.json` ve `package-lock.json` kullanılır. Yerel Node veya otomatik paket indiren `npx` kalite kapısının yerine geçmez. Builder test araçlarını içerir; runtime yalnız sunum içindir. Testler üretim DB bağlantısı ve gerçek sır gerektirmez.

```sh
docker buildx build --target builder --load -t finance-validation:local .
docker run --rm --memory 4g --memory-swap 4g --cpus 2 \
  --entrypoint sh \
  --mount "type=bind,source=$PWD/__tests__,target=/app/__tests__,readonly" \
  finance-validation:local -ec 'npm test && node --test tests/*.test.cjs tests/*.test.mjs && ./node_modules/.bin/tsc --noEmit && npm run lint'
docker buildx build --load -t finance-runtime:local .
```

Ryzen'de ağır işler `ogzie-dev` rootless Docker altında tek tek ve kaynak sınırıyla çalıştırılır. Konteyner belleği en çok 4 GiB, CPU en çok 2 çekirdek; BuildKit konteyneri de aynı sınırdadır. Aynı görev için en çok iki ağır iş açılır. Başarısız lint diğer kapılar geçmiş olsa da başarısızdır. Eski Linux'a özgü `agir-is` ve user bus komutları Ryzen kabulü sayılmaz.

## Mac ve Ryzen

MacBook yalnız ajan/kod yönetimi ve tarayıcı kabul yüzeyidir. Mac üzerinde Docker motoru, container, geliştirme sunucusu veya ağır build/test başlatılmaz. Colima kurulumu kabul kanıtı değildir. Docker, önizleme, ağır test/derleme ve sürekli servisler yalnız Ryzen hedefindedir. Ryzen rootless socket/context doğrulanmadan test/build çalıştırılmaz; NetBird peer ve bağlantı doğrulanmadan önizleme yayınlanmaz. Mevcut rootful oyun daemon'una erişim verilmez.

Kaynakta Linux home yolu, systemd veya yerel Linux DB zorunluluğu yoktur. Host'a özgü `agir-is`, user bus, Chromium yolu ve eski BuildKit adı uygulama bağımlılığı değildir; Mac'e kopyalanmaz. Tamamlanmış Linux kapıları tarihsel kanıttır. Mac/Brave kabulü yapılmadı; Ryzen rootless kaynak ve test kapıları güncel [durum kaydında](../STATUS.md) yer alır.

Önizleme açılacaksa o cihazın güncel NetBird peer IP/DNS'i ve bağlantısı yeniden doğrulanır; port yalnız NetBird arayüzüne publish edilir, `NEXTAUTH_URL` erişilen origin ile eşleşir. Test için kaynak yalnız Mac checkoutundan Ryzen'daki geçici `ogzie-dev` kopyasına taşınır; kod ve Git işlemleri Mac'te kalır.

Sürekli sunum için mevcut Dokploy runtime + PostgreSQL; ilgiliyse SMTP, AI sağlayıcısı ve imzalı Ogzie/Hermes entegrasyon ayarları gerekir. `docker-entrypoint.sh` sunucu başlamadan `prisma migrate deploy` çalıştırır: production bağlantısıyla test başlatılmaz. Sırlar Git dışında sağlanır. Bu görev deploy/migration yetkisi içermez.

Ryzen mevcut CI hedefidir. 13 Kasım kapanışında GitHub API bu repo için 0 runner, 0 workflow ve 0 run döndürdü. Yeni runner/servis kurulmadı; CI yeşil kabulü yoktur. Mevcut Ryzen altyapısının bu repoya erişimi koordinatör tarafından sağlanmalıdır. Eski bağımlılık/lint PR #45 bu işe katılmadı. Main'e merge otomatik production deploy kapısıdır; ayrı onay olmadan yapılmaz.
