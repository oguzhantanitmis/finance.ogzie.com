# 🏗️ Finance.ogzie.com — Kişisel Finans Asistanı Geliştirme Roadmap'i

## 📋 Genel Bakış

Bu roadmap, mevcut finans panelini **kişisel finans yönetim paneli + borç kapatma asistanı + AI destekli finans koçu** olarak çalışan ileri seviye bir sisteme dönüştürmek için modüler, kontrollü ve aşamalı bir geliştirme planıdır.

Her `.md` dosyası bağımsız olarak uygulanabilir bir teknik plan içerir. Her fazı Claude Code'a verip doğrudan uygulatabilirsiniz.

---

## 🗂️ Fazların Özeti

| # | Dosya | Başlık | Durum |
|---|-------|--------|-------|
| 0 | [00-project-analysis.md](./00-project-analysis.md) | Mevcut Proje Analizi | ✅ Tamamlandı |
| 1 | [01-data-model-foundation.md](./01-data-model-foundation.md) | Veri Modeli Temeli | ✅ Tamamlandı |
| 2 | [02-accounts-cashflow-balance.md](./02-accounts-cashflow-balance.md) | Hesap / Cüzdan ve Nakit Akışı | ✅ Tamamlandı |
| 3 | [03-receivables-payables-module.md](./03-receivables-payables-module.md) | Alacak / Verecek Modülü | ✅ Tamamlandı |
| 4 | [04-subscriptions-recurring-upgrade.md](./04-subscriptions-recurring-upgrade.md) | Abonelik Genişletmesi | ✅ Tamamlandı |
| 5 | [05-credit-card-global-settings.md](./05-credit-card-global-settings.md) | Kredi Kartı Genel Ayarları | ✅ Tamamlandı |
| 6 | [06-unified-transaction-ledger.md](./06-unified-transaction-ledger.md) | Birleşik İşlem Defteri | ✅ Tamamlandı |
| 7 | [07-debt-priority-engine.md](./07-debt-priority-engine.md) | Borç Önceliklendirme Motoru | ✅ Tamamlandı |
| 8 | [08-dashboard-upgrade.md](./08-dashboard-upgrade.md) | Dashboard Geliştirmesi | ✅ Tamamlandı |
| 9 | [09-reports-analytics.md](./09-reports-analytics.md) | Raporlar ve Analitikler | ✅ Tamamlandı |
| 10 | [10-financial-health-score.md](./10-financial-health-score.md) | Finansal Sağlık Puanı | ✅ Tamamlandı |
| 11 | [11-goals-motivation-system.md](./11-goals-motivation-system.md) | Hedef ve Motivasyon | ✅ Tamamlandı |
| 12 | [12-ai-integration.md](./12-ai-integration.md) | AI Entegrasyonu (OpenAI) | ✅ Tamamlandı |
| 13 | [13-simulations-scenarios.md](./13-simulations-scenarios.md) | Senaryo / Simülasyon | ✅ Tamamlandı |
| 14 | [14-settings-expansion.md](./14-settings-expansion.md) | Ayarlar Sayfası | ✅ Tamamlandı |
| 15 | [15-testing-validation.md](./15-testing-validation.md) | Test ve Doğrulama | ✅ Tamamlandı |
| 16 | [16-final-polish-release-checklist.md](./16-final-polish-release-checklist.md) | Final Polish | ✅ Tamamlandı |

---

## 🔗 Fazlar Arası Bağımlılık Grafiği

```
Faz 0 (Analiz) ─────────────────────────────────────────────┐
     │                                                       │
     ▼                                                       │
Faz 1 (Veri Modeli) ◄───── TÜM FAZLARIN TEMELİ              │
     │                                                       │
     ├──────────────┬────────────────┐                        │
     ▼              ▼                ▼                        │
Faz 2 (Hesaplar)  Faz 4 (Abonelik)  Faz 14 (Ayarlar)        │
     │              │                                         │
     ├──────┬───────┤                                         │
     ▼      ▼       ▼                                         │
Faz 3    Faz 5    Faz 6                                       │
(Alacak) (Kart)   (Defter)                                    │
     │      │       │                                         │
     └──────┴───────┘                                         │
            │                                                 │
            ▼                                                 │
         Faz 7 (Borç Önceliklendirme)                         │
            │                                                 │
            ▼                                                 │
         Faz 8 (Dashboard) ◄──── Faz 10, 11 placeholder      │
            │                                                 │
     ┌──────┼──────┬─────────┐                                │
     ▼      ▼      ▼         ▼                                │
  Faz 9  Faz 10  Faz 11   Faz 12                              │
 (Rapor) (Sağlık) (Hedef)  (AI)                               │
                              │                                │
                              ▼                                │
                           Faz 13 (Simülasyon)                 │
                              │                                │
                              ▼                                │
                           Faz 15 (Test)                       │
                              │                                │
                              ▼                                │
                           Faz 16 (Final) ◄────────────────────┘
```

---

## 🚀 Önerilen Geliştirme Sırası

### Aşama 1: Temel Altyapı (Faz 1-3)
> Bu aşamada sisteme yeni veri modelleri, hesap sistemi ve kişi bazlı alacak/verecek eklenir.

1. **Faz 1** — Tüm yeni Prisma modellerini ekle (1 gün)
2. **Faz 2** — Hesap/cüzdan sistemini kur (1-2 gün)
3. **Faz 3** — Alacak/verecek modülünü oluştur (2 gün)

### Aşama 2: Mevcut Modül Genişletme (Faz 4-6)
> Mevcut abonelik, kredi kartı ve işlem sistemi güçlendirilir.

4. **Faz 4** — Abonelik tasarruf analizi ve ödeme kaydı (1 gün)
5. **Faz 5** — Kredi kartı merkezi faiz ayarları (1-2 gün)
6. **Faz 6** — Birleşik işlem defteri (1-2 gün)

### Aşama 3: Akıllı Özellikler (Faz 7-8)
> Borç önceliklendirme ve dashboard yenilenir.

7. **Faz 7** — Borç önceliklendirme motoru (2 gün)
8. **Faz 8** — Dashboard genişletmesi (2 gün)

### Aşama 4: Analiz ve Zeka (Faz 9-13)
> Raporlar, sağlık puanı, hedefler, AI ve simülasyon eklenir.

9. **Faz 9** — Raporlar ve analitikler (2 gün)
10. **Faz 10** — Finansal sağlık puanı (1 gün)
11. **Faz 11** — Hedef ve motivasyon sistemi (1 gün)
12. **Faz 12** — AI entegrasyonu (2-3 gün)
13. **Faz 13** — Simülasyon motoru (1-2 gün)

### Aşama 5: Tamamlama (Faz 14-16)
> Ayarlar, testler ve final kontrolü.

14. **Faz 14** — Ayarlar sayfası (1 gün)
15. **Faz 15** — Test ve doğrulama (2 gün)
16. **Faz 16** — Final polish (1 gün)

**Tahmini toplam**: 20-26 gün (paralel çalışma ile kısaltılabilir)

---

## 🏁 Hızlı Başlangıç

### İlk Adım
Geliştirmeye başlamak için ilk olarak **Faz 1** dosyasını açın:

```
docs/roadmap/01-data-model-foundation.md
```

Bu dosyayı Claude Code'a vererek Prisma şemasına yeni modelleri ekletin. Migration çalıştıktan ve `npm run build` başarılı olduktan sonra Faz 2'ye geçin.

### Claude Code'a Faz Verme

Her `.md` dosyasının en altında **"Claude Code Uygulama Promptu"** bölümü vardır. Bu prompt'u kopyalayıp Claude Code'a yapıştırmanız yeterli. Prompt:
- Sadece ilgili faza odaklı
- Mevcut sistemi bozma uyarısı içerir
- Önce analiz sonra uygulama yaklaşımı içerir
- Migration, backend, frontend, test ve doğrulama adımlarını kapsar

### Faz Tamamlandıktan Sonra

1. `npm run build` ile derleme kontrolü yapın
2. Uyglamayı çalıştırın ve ilgili sayfaları test edin
3. Bu README'deki durum tablosunu güncelleyin (⬜ → ✅)
4. Bir sonraki faz dosyasını açın

---

## ⚠️ Kritik Kurallar

1. **Sıra önemli**: Bağımlılık grafiğine uyun. Faz 3'ü Faz 2 bitmeden başlatmayın.
2. **Mevcut kodu bozmayın**: Her faz "additive" (eklemeli) olmalı. Mevcut çalışan dosyaları silmeyin.
3. **Her faz sonunda build kontrolü**: `npm run build` hatasız geçmeli.
4. **Yedek alın**: Büyük fazlardan önce git commit atın.
5. **Float hassasiyeti**: Para hesaplamalarında `.toFixed(2)` kullanın, Faz-15'te Decimal geçişi değerlendirilecek.

---

## 📁 Klasör Yapısı (Hedef)

Tüm fazlar tamamlandıktan sonra proje yapısı:

```
finance.ogzie.com/
├── app/
│   ├── accounts/          # Faz 2
│   ├── ai/                # Faz 12 (güncelleme)
│   ├── analytics/         # Mevcut (korunur)
│   ├── api/
│   │   ├── ai/            # Faz 12 (güncelleme)
│   │   └── auth/          # Mevcut
│   ├── budget/            # Mevcut
│   ├── cards/             # Faz 5 (güncelleme)
│   ├── debts/             # Mevcut
│   ├── goals/             # Faz 11
│   ├── login/             # Mevcut
│   ├── payment-plan/      # Faz 7
│   ├── people/            # Faz 3
│   ├── recurring/         # Mevcut
│   ├── reports/           # Faz 9
│   ├── settings/          # Faz 14
│   ├── simulations/       # Faz 13
│   ├── subscriptions/     # Faz 4 (güncelleme)
│   └── transactions/      # Faz 6
├── components/
│   ├── accounts/          # Faz 2
│   ├── cards/             # Mevcut + Faz 5
│   ├── goals/             # Faz 11
│   ├── payment-plan/      # Faz 7
│   ├── people/            # Faz 3
│   ├── reports/           # Faz 9
│   ├── settings/          # Faz 14
│   └── transactions/      # Faz 6
├── lib/
│   ├── ai/                # Faz 12
│   ├── card-engine/       # Mevcut + Faz 5
│   ├── account-service.ts         # Faz 2
│   ├── dashboard-service.ts       # Faz 8
│   ├── debt-priority-engine.ts    # Faz 7
│   ├── goal-service.ts            # Faz 11
│   ├── health-score-service.ts    # Faz 10
│   ├── ledger-service.ts          # Faz 6
│   ├── people-service.ts          # Faz 3
│   ├── receivable-payable-service.ts # Faz 3
│   ├── report-service.ts          # Faz 9
│   ├── settings-service.ts        # Faz 14
│   ├── simulation-engine.ts       # Faz 13
│   ├── subscription-analysis-service.ts # Faz 4
│   └── card-finance-settings-service.ts # Faz 5
├── __tests__/             # Faz 15
├── docs/roadmap/          # Bu klasör
└── prisma/
    └── schema.prisma      # Faz 1 (genişletme)
```
