## Imported Claude Cowork project instructions


## Cihaz rolleri ve kapanış kapısı (13 Kasım 2026)

- MacBook yalnız ajan/kod yönetimi ve tarayıcı kabul yüzeyidir. Mac'te Docker motoru, container, geliştirme sunucusu veya ağır test/derleme başlatılmaz. Colima kurulumu kabul kanıtı değildir.
- Docker, önizleme, ağır test/derleme ve sürekli servisler Ryzen hedefindedir; erişim NetBird üzerinden olur. Yetkisiz/rootless hedefi koordinatör hazırlar; mevcut rootful oyun Docker daemon'una erişim verilmez. Hedef/socket/context, peer ve repo runner erişimi doğrulanmadan hazır sayılmaz.
- Yeni yerel Linux ağır iş başlatılmaz. Başlamış iş kendi kaydıyla güvenle sonuçlandırılır; eski Linux sonuçları Mac/Ryzen kabulü değildir. Ryzen testlerinde bellek sınırı ve en çok iki ağır iş korunur.
- Yeni CI kullanıcısı/servisi kurulmaz. Bu iş feature dalında commit/push ve PR ile incelemeye sunulur; main merge ve deploy koordinatörde kalır. CI sonucu bulunmuyorsa yeşil diye raporlanmaz.
