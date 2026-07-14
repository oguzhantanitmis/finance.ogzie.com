# Archive Manifest

## Kimlik

- Proje: `finance.ogzie.com`
- Arşiv tarihi: 2026-07-14 (Europe/Istanbul)
- GitHub: `https://github.com/oguzhantanitmis/finance.ogzie.com`
- Görünürlük: public
- Varsayılan dal: `main`
- Arşiv dalı: `agent/archive-finance-ogzie-2026-07-14`
- Arşiv etiketi: `archive-finance-ogzie-2026-07-14`
- Arşiv tabanı: `593f2125b74bd9a55eacd01d33574c6ae8b18fb4` (`main`, PR #23 merge)
- Korunan belge commit'i: `8a5cee6` (`CHANGELOG.md`, `README.md`, `TEST_REPORT.md`, `docs/CHANGELOG.md`)

Etiket, doğrulama tamamlandıktan sonra son arşiv commit'ine bağlanır. Geri yüklemede dal yerine etiketi doğrudan checkout edin.

## Kapsam

Arşiv; Next.js kaynaklarını, Prisma şemasını, 12 migration'ı, testleri, Docker/Dokploy çalışma tanımını, paket kilidini ve teknik belgeleri içerir. Üretim veritabanı, gerçek ortam değişkenleri, platform bağlantı dosyaları ve yeniden üretilebilir yerel build/cache çıktıları Git dışında tutulur.

## Sabitlenen çalışma zamanı ve araçlar

- Docker çalışma zamanı: Node.js 20 Alpine (`Dockerfile`).
- Paket yöneticisi: npm; `package-lock.json` lockfileVersion 3.
- Next.js: 16.1.6.
- React / React DOM: 19.2.3.
- Prisma CLI: 5.19.x; Prisma Client paketi: 5.19.x.
- Veritabanı sağlayıcısı: MySQL; MariaDB adaptörü de projede bulunur.
- Yerel kabukta bulunan Node.js 25 proje çalışma zamanı olarak kabul edilmez; kanonik doğrulama Node.js 20 ile yapılır.

## Temiz kaynak geri yükleme

```sh
git clone --branch archive-finance-ogzie-2026-07-14 \
  --single-branch \
  https://github.com/oguzhantanitmis/finance.ogzie.com.git
cd finance.ogzie.com

npm ci

# Gerçek değerleri Git dışında çalışma ortamına tanımlayın.
export DATABASE_URL='mysql://USER:PASSWORD@HOST:3306/DATABASE'
export NEXTAUTH_SECRET='uzun-rastgele-deger'
export NEXTAUTH_URL='https://finance.ogzie.com'
export APP_URL='https://finance.ogzie.com'
export APP_SETTINGS_SECRET='uzun-rastgele-sabit-deger'

npm run db:update
npm test
npm run lint
npx tsc --noEmit
npm run build
npm start
```

Docker/Dokploy geri yüklemesi için:

```sh
docker build -t finance-ogzie-archive .
docker run --rm -p 3000:3000 --env-file /guvenli/yol/finance.env finance-ogzie-archive
```

Container başlangıcında `docker-entrypoint.sh`, `prisma migrate deploy` çalıştırır ve ardından standalone Next.js sunucusunu başlatır. Veritabanı erişilebilir değilse container başlamaz; bu beklenen fail-closed davranıştır.

## Ortam ve dış servis envanteri

Zorunlu temel değişkenler:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `APP_URL`
- `APP_SETTINGS_SECRET`

Opsiyonel/özellik bazlı değişkenler:

- CollectAPI: `COLLECTAPI_API_KEY`
- OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_REPLY_TO`
- ogzie ingest: `OGZIE_FINANCE_PUSH_PUBLIC_JWK`, `OGZIE_FINANCE_PUSH_AUDIENCE`, `OGZIE_INGEST_USER_ID`
- seed: `SEED_SUPERUSER_EMAIL`, `SEED_SUPERUSER_PASSWORD`

Geri yükleme için Git dışında korunması gereken dış kaynaklar:

- MySQL/MariaDB üretim veritabanı ve düzenli, şifreli yedeği.
- Dokploy veya Vercel proje kaydı, domain yönlendirmesi, TLS ve secret/env değerleri.
- `finance.ogzie.com` DNS kaydı.
- CollectAPI, OpenAI ve SMTP hesap/anahtarları kullanılıyorsa bunların erişim kaydı.
- ogzie → finance kanalının public doğrulama JWK'sı, audience değeri ve hedef finance kullanıcı kimliği. İmzalama private key'i bu projeye ait değildir ve bu repoya eklenmemelidir.

## Git dışında tutulan lokal kaynaklar

| Kaynak | Durum | SHA-256 / not |
| --- | --- | --- |
| `.env.local` | Gerçek/çekilmiş çalışma ortamı; Git'e alınmadı | `486996a4723e8d038e6d7da6ba58ff9d8cb929d565f47532213d955d8fe1528d` |
| `.vercel/.env.production.local` | Vercel üretim ortamı çıktısı; Git'e alınmadı | `757bb653e8ca10cc8e4fa3af7cb85b3f382c062f4b77bbdca3facb4f5cb189d7` |
| `.vercel/project.json` | Lokal Vercel proje bağlantısı; Git'e alınmadı | `ad1963b2b912b10cfc4ee1128f59b662f80938e4a38dc485c411b63ebe3e6bca` |
| `repo-drop/` | 20 dosyalık, 120 KB tasarım aktarım referansı; çalışma koduna kopyalanmış ve ignore edilmiş | Ağaç özeti `03cbd7378bc7e88550a89cd8cc925896bbcd1541e0494bc2b086c279b6f91c4f` |
| `.next/` | 536 MB, 2.632 dosya; yeniden üretilebilir build/dev cache'i | Arşivlenmedi; `npm run build` ile yeniden üretilir |
| `tsconfig.tsbuildinfo` | Yeniden üretilebilir TypeScript cache'i | Arşivlenmedi |
| `.claude/settings.local.json`, `.DS_Store` | Makineye özel ayarlar/meta veri | Arşivlenmedi |

Lokal env dosyalarında Vercel tarafından üretilen geçici build/runtime değişkenleri de bulunabilir. SHA-256 değerleri yalnız eldeki kopyayı tanımlar; secret değeri yerine geçmez ve dosyaları Git'e almaya izin vermez.

## İzlenen dağıtım paketi

`plesk-deploy.zip` daha önce repoya eklenmiş 549 dosyalı standalone build paketidir:

- SHA-256: `c2416fbb627e8c93a91987e309e88bde6dbc6df96f630e9ebdcecafc83e9bbd5`
- Sıkıştırılmış boyut: yaklaşık 9 MB.
- İçerik: `.next` standalone/build çıktıları ve placeholder `.env.example`; `.env`, private key, SQL dökümü veya credential dosya adı tespit edilmedi.

Bu paket tarihsel Plesk dağıtımı için korunur; güncel kaynak geri yüklemesinde `package-lock.json`, Prisma migration'ları ve `Dockerfile` esas alınmalıdır.

## Doğrulama ölçütleri

Arşiv etiketi oluşturulmadan önce temiz clone üzerinde şu kontrollerin tamamı çalıştırılır:

- `npm ci`
- `npm test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- MySQL 8.4 üzerinde 12 Prisma migration'ın uygulanması
- Docker imajının Node.js 20 ile oluşturulması
- Uygulamanın test veritabanıyla başlaması ve `/login` ile `/health` HTTP kontrolleri
- `npm audit` raporu; dependency güncellemesi yapılmadan bulguların kaydı

Sonuçlar tamamlandığında bu bölüm kesin sonuçlarla güncellenir.

## GitHub ve operasyonel meta veri

- GitHub Actions workflow'u yoktur; doğrulama yerel temiz clone ile yapılır.
- Açık eski PR'lar ve mevcut issue/wiki durumu arşiv sonunda raporlanır; arşiv işlemi bunları kapatmaz veya değiştirmez.
- `CODEOWNERS` ve Dependabot yapılandırması bulunup bulunmadığı arşiv sonu kontrolünde kaydedilir.
- GitHub/Dokploy/Vercel secret değerleri dışa aktarılmaz; yalnız gerekli değişken adları belgelenir.

## Silme durumu

Üretim veritabanının, platform secret'larının ve domain/deploy yapılandırmasının ayrı ve geri yüklenebilir yedeği bu kaynak arşivinin parçası değildir. Bunlar doğrulanmadan proje lokalden silinmeye hazır değildir. Protokoldeki açık silme cümlesi de verilmediği için bu işlem hiçbir lokal dosyayı silmez.
