# Changelog

## 2026-05-21

- Canonical borç refaktörü başlatıldı; `DebtAccount`, `DebtObligation`, `DebtPayment` modelleri ve ilgili enumlar Prisma şemasına eklendi.
- Canonical borç tabloları için veri kaybı yaratmayan migration oluşturuldu; eski `Debt`, `PaymentPlan`, `CreditCard`, `Account/KMH` ve `ReceivablePayable` tabloları uyumluluk için korunuyor.
- Eski kredi, kredi kartı, KMH ve kişisel borç kayıtlarını `DebtAccount/DebtObligation` kaynağına dönüştüren canonical sync/ödeme servisi eklendi.
- `/debts`, `/payment-plan` ve bütçe borç baskısı hesapları canonical `DebtObligation.remainingAmount` kaynağına taşındı.
- Kredi, kart, KMH hesap ve kişisel borç mutasyonlarında canonical borç hesabını güncelleyen bağlantılar eklendi.
- Canonical borç ödeme akışında `obligationId` ve opsiyonel ödeme hesabı `userId` ile doğrulanarak IDOR riski kapatıldı.
- Idempotent backfill için `scripts/migrate-canonical-debts.mjs` eklendi.
- Root README internal teknik/handoff dokümanı olarak yeniden yazıldı; mimari, veri modeli, finans motorları, güvenlik, entegrasyon ve operasyon akışları tek dosyada toplandı.
- KMH borç görünümü Yapı Kredi hesap özeti açıklamalarına göre netleştirildi; tahmini asgari satırı kaldırıldı, zorunlu asgari yalnızca ekstre formülüyle gösterilir.
- KMH maliyet analizinde asgari anapara (%5), dönem faizi/vergi, zorunlu asgari, gecikme artışı ve güncel borç ayrı satırlara bölündü.
- KMH kart başlığındaki güncel borç, son ödeme tarihi geçtiyse hesaplanan gecikme artışını da içerecek şekilde güncellendi.

## 2026-05-18

- Bütçe özeti borç baskısı eski borç tahmininden çıkarıldı; artık Borçlar sayfasındaki kredi taksidi/KMH/kart ödeme yükümlülükleriyle aynı kaynaktan hesaplanır.
- Gecikmiş borç ödeme yükümlülükleri bütçe yaklaşan ödemeler listesinde de görünür hale getirildi.
- Borçlar sayfasına "Ödemen gereken borçlar" paneli eklendi; kredi taksidi, KMH asgari ödemesi ve kredi kartı asgari ödemesi tek yerden ödendi olarak işaretlenebilir.
- KMH için aylık gecikme faizi alanı eklendi; asgari ödeme vadesi geçerse gecikme günü ve gecikme maliyeti otomatik hesaplanır.
- KMH asgari ödemesi ödendiğinde dönem faizi/gecikme maliyeti önce kapatılır, kalan tutar anaparadan düşülür.
- KMH asgari ödemesi sonrası eski son ödeme tarihi üzerinden tekrar gecikme faizi üretmemesi için dönem otomatik ileri alınır; ödeme günü hafta sonuna denk gelirse sonraki iş gününe taşınır.
- Kredi kartı asgari ödemesi ödendiğinde ilgili ekstreye kart ödeme kaydı açılır; gecikme varsa faiz/vergi hareketi de karta işlenir ve borç görünümü net tutardan düşer.
- Yapı Kredi İhtiyaç kredisi ödeme planı PDF değerlerine göre hedeflendi: 343.156,99 TL anapara, %4,49 faiz, 12 vade, ilk taksit 04.04.2026, ilk taksit ödendi.
- Kredi ödeme planı görünümünde aynı taksit numarasına ait eski seed satırları tekilleştirildi; eski 2025 satırlarının ödenmiş/gecikmiş durum üretmesi engellendi.
- Kredi maliyet analizi sıradaki taksit, ödenen/kalan taksit, toplam vade, toplam faiz, toplam vergi ve kalan anapara üzerinden sadeleştirildi.
- Yapı Kredi Esnek Hesap/KMH için hesap özeti alanları eklendi: hesap kesim tarihi, son ödeme tarihi, anapara borcu, dönem faizi + vergi, asgari ödeme, sonraki kesim tarihi.
- KMH borç görünümü Yapı Kredi Esnek Hesap mantığına göre düzenlendi: dönem borcu = anapara borcu + dönem faizi/vergi; asgari ödeme = anapara %5 + dönem faizi/vergi.
- Üretim verisi düzeltmesi için `scripts/repair-yapikredi-data.mjs` eklendi; Oğuzhan kullanıcısının Yapı Kredi İhtiyaç ve Yapı Kredi KMH kayıtlarını PDF değerleriyle günceller.
