# Plesk Kurulum Talimatları

Bu zip dosyası, projenizi Plesk üzerinde çalıştırmak için optimize edilmiş dosyaları içerir.

### Plesk Ayarları:
1. **Uygulama Kökü (Application Root)**: `/httpsdocs` (veya dosyaları yüklediğiniz dizin)
2. **Belge Kökü (Document Root)**: `/httpdocs/public`
3. **Uygulama Başlatma Dosyası (Application Startup File)**: `app.js`
4. **Node.js Sürümü**: `24.13.1` (veya mevcut en yakın sürüm)
5. **Uygulama Modu**: `production`

### Kurulum Adımları:
1. Zip içeriğini `/httpsdocs` dizinine açın.
2. Plesk Node.js panelinden **"NPM Install"** butonuna basın.
3. `.env` dosyanızı oluşturun ve `DATABASE_URL`, `NEXTAUTH_SECRET` gibi değişkenleri tanımlayın.
4. Veritabanı şemasını güncellemek için terminalden (veya Plesk üzerinden):
   `npx prisma db push`
5. Uygulamayı başlatmak için **"Restart App"** butonuna basın.

**Not**: Eğer `/httpdocs/public` dizini boş ise, `/httpsdocs/public` içeriğini oraya kopyalayın veya Plesk üzerinden belge kökünü `/httpsdocs/public` olarak güncelleyin.
