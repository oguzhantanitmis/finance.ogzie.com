# Finance PostgreSQL geçişi

Bu geçiş iki veritabanını aynı anda değiştirmez. MariaDB, üretim geçişi doğrulanana kadar geri dönüş kaynağı olarak korunur.

## Hazırlık ve prova

1. `npm run db:postgres:prepare` ile PostgreSQL şeması ve başlangıç migration dosyası üretilir.
2. Boş hedef veritabanında `prisma migrate deploy --schema prisma/postgresql/schema.prisma` çalıştırılır.
3. Yalnız hedef veritabanını sıfırlamaya izin veren açık onayla veri kopyalanır:

   ```sh
   MARIADB_DATABASE_URL=... \
   POSTGRES_DATABASE_URL=... \
   CONFIRM_POSTGRES_RESET=hedef_veritabani \
   npm run db:postgres:migrate -- --apply
   ```

4. `npm run db:postgres:verify` tüm uygulama tablolarındaki satır sayılarını karşılaştırır. Araç e-posta, finans kaydı veya gizli değerlerin içeriğini loglamaz.

`Dockerfile.migrator` yalnız elle tetiklenen prova komutları içindir. Konteyner başladığında şema veya veri taşımaz; böylece yeniden başlama durumunda hedef veritabanı yanlışlıkla sıfırlanmaz.

## Üretim geçişi

- Finance yazma trafiği kısa bakım penceresinde durdurulur.
- Son MariaDB yedeği alınır ve prova edilen kopyalama yeniden çalıştırılır.
- Satır sayıları eşleşmeden `DATABASE_URL` değiştirilmez.
- Uygulamanın Prisma sağlayıcısı PostgreSQL yapılır; `DATABASE_PROVIDER=postgresql` ayarlanır.
- Giriş, panel, gider oluşturma ve Ogzie komut akışı kontrol edilir.
- Sorun halinde uygulama eski MariaDB bağlantısına döndürülür; MariaDB verisi silinmez.
