# finance.ogzie.com: kurtarma kararı

11 Kasım ortak hata deneyimi bu projenin mevcut tasarım ve auth sınırlarıyla uygulanır. HTTP durumları korunur; servis/DB kesintisi 401 veya yanlış parola olarak gösterilmez. Bağımsız recovery ve statik offline/origin-unavailable belgeleri DB olmadan çalışır. İlk soğuk ziyaret için proxy fallback bağlantısı ayrı yayın işidir.

Prisma hatası Next loggerına ulaşmadan redakte edilir; prototype ve kod korunur. SQL/meta/cause/stack arayüze ve loga taşınmaz. Bağlantı hata ayrımı redakte metne değil hata koduna da bakar. Rol senkronu yazısı retry dışındadır; sonucu bilinmeyen mutasyon otomatik tekrar edilmez. Abonelik zenginleştirme API'sinde yalnız gerçek eksik oturum 401 olur; DB hatası 503 olarak kalır.

Güncel doğrulama ve kalan kapılar: [docs/STATUS.md](../docs/STATUS.md). Yerel Linux araçları uygulama bağımlılığı değildir; Mac/Ryzen gereksinimleri [işletim notunda](../docs/operations/error-recovery.md). CI yeşil, Mac kabulü veya deploy sonucu yerel testten türetilmez. Üretilmiş kanıt ve oturum dosyaları Git/Docker bağlamına alınmaz.
