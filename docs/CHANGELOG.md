# Changelog

## 2026-05-18

- Borçlar sayfasına "Ödemen gereken borçlar" paneli eklendi; kredi taksidi, KMH asgari ödemesi ve kredi kartı asgari ödemesi tek yerden ödendi olarak işaretlenebilir.
- KMH için aylık gecikme faizi alanı eklendi; asgari ödeme vadesi geçerse gecikme günü ve gecikme maliyeti otomatik hesaplanır.
- KMH asgari ödemesi ödendiğinde dönem faizi/gecikme maliyeti önce kapatılır, kalan tutar anaparadan düşülür.
- Kredi kartı asgari ödemesi ödendiğinde ilgili ekstreye kart ödeme kaydı açılır; gecikme varsa faiz/vergi hareketi de karta işlenir ve borç görünümü net tutardan düşer.
- Yapı Kredi İhtiyaç kredisi ödeme planı PDF değerlerine göre hedeflendi: 343.156,99 TL anapara, %4,49 faiz, 12 vade, ilk taksit 04.04.2026, ilk taksit ödendi.
- Kredi ödeme planı görünümünde aynı taksit numarasına ait eski seed satırları tekilleştirildi; eski 2025 satırlarının ödenmiş/gecikmiş durum üretmesi engellendi.
- Kredi maliyet analizi sıradaki taksit, ödenen/kalan taksit, toplam vade, toplam faiz, toplam vergi ve kalan anapara üzerinden sadeleştirildi.
- Yapı Kredi Esnek Hesap/KMH için hesap özeti alanları eklendi: hesap kesim tarihi, son ödeme tarihi, anapara borcu, dönem faizi + vergi, asgari ödeme, sonraki kesim tarihi.
- KMH borç görünümü Yapı Kredi Esnek Hesap mantığına göre düzenlendi: dönem borcu = anapara borcu + dönem faizi/vergi; asgari ödeme = anapara %5 + dönem faizi/vergi.
- Üretim verisi düzeltmesi için `scripts/repair-yapikredi-data.mjs` eklendi; Oğuzhan kullanıcısının Yapı Kredi İhtiyaç ve Yapı Kredi KMH kayıtlarını PDF değerleriyle günceller.
