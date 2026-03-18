# Faz 14 — Ayarlar Sayfası Genişletmesi

## Amaç
Tüm kullanıcı tercihlerini, finans ayarlarını, AI yapılandırmasını ve bildirim tercihlerini tek bir merkezi ayarlar sayfasında toplamak.

## Kapsam
**Yapılacak:**
- `/settings` sayfası
- Genel profil ayarları
- Para birimi / finans formatı
- Kredi kartı finans ayarları (Faz-5'ten)
- AI entegrasyon ayarları (Faz-12'den)
- Bildirim / uyarı tercihleri
- Varsayılan hesap seçimi
- Ödeme stratejisi tercihleri (Faz-7'den)

**Yapılmayacak:**
- Kullanıcı yönetimi (multi-user admin)
- Tema değişikliği

## Mevcut Durum Analizi
- Ayarlar sayfası **hiç yok**
- `AppSettings` modeli Faz-1'de oluşturulmuş
- `CardFinanceSettings` Faz-5'te doldurulmuş
- AI ayarları Faz-12'de backend'e entegre edilmiş

## Veri Modeli Etkisi
Faz-1'deki `AppSettings` modeli (key-value) kullanılır. Yeni model gerekmez.

## Backend İşleri

### Servis: `lib/settings-service.ts`
```typescript
getSetting(userId, key): Promise<string | null>
setSetting(userId, key, value, isEncrypted?): Promise<void>
getSettingsGroup(userId, prefix): Promise<Record<string, string>>
  // Örn: getSettingsGroup(user, "ai.") → { "ai.apiKey": "...", "ai.model": "gpt-4.1-mini" }
deleteSetting(userId, key): Promise<void>
```

### Ayar Anahtarları
```
general.defaultCurrency    = "TRY"
general.defaultAccountId   = "clxyz..."
general.locale             = "tr-TR"

ai.apiKey                  = "sk-..." (encrypted)
ai.model                   = "gpt-4.1-mini"
ai.enabled                 = "true"
ai.monthlyTokenLimit       = "100000"
ai.autoWeeklyAnalysis      = "true"
ai.coachMode               = "true"
ai.recommendationMode      = "true"

notification.paymentReminder     = "true"
notification.collectionOverdue   = "true"
notification.subscriptionDue     = "true"
notification.limitWarning        = "true"
notification.cashShortage        = "true"

strategy.defaultPaymentStrategy  = "SAFE"  // SAFE | AVALANCHE | SNOWBALL
strategy.showAIRecommendations   = "true"
```

### İş Kuralları
1. API key gibi hassas veriler `isEncrypted: true` ile saklanmalı
2. Ayarlar sayfasında hassas alanlar maskelenmiş gösterilmeli
3. Ayar değişikliğinde revalidation yapılmalı

## Frontend İşleri

### Sayfa: `/settings`
Bölümlere ayrılmış form tabanlı ayarlar sayfası.

**Bölümler:**
1. **Genel** — para birimi, varsayılan hesap, dil
2. **Kredi Kartı Finans** — genel faiz oranları (Faz-5 UI)
3. **AI Entegrasyon** — API key (maskelenmiş), model, aktif/pasif, limitler
4. **Bildirimler** — toggle'lar (ödeme hatırlatma, tahsilat gecikme, abonelik, limit, nakit)
5. **Strateji** — varsayılan ödeme stratejisi, AI önerisi göster/gizle

### Bileşenler
1. `SettingsSection` — bölüm container
2. `SettingToggle` — açık/kapalı toggle
3. `SettingInput` — text/number input
4. `SettingSelect` — dropdown seçim
5. `MaskedApiKeyInput` — API key maskelenmiş gösterim + düzenleme

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1 (AppSettings modeli)
- **Opsiyonel:** Faz-2 (varsayılan hesap), Faz-5 (kart ayarları), Faz-7 (strateji), Faz-12 (AI ayarları)

## Kabul Kriterleri
- [ ] Ayarlar sayfası tüm bölümleriyle görüntüleniyor
- [ ] Ayarlar kaydediliyor ve okunduktan sonra değerler korunuyor
- [ ] API key maskelenmiş gösteriliyor
- [ ] Bildirim toggle'ları çalışıyor
- [ ] Varsayılan hesap seçimi çalışıyor

## Uygulama Sırası
1. `lib/settings-service.ts` oluştur
2. `app/settings/page.tsx` ve actions
3. Bileşenler
4. Navbar'a "Ayarlar" linki
5. Mevcut servisler ayar okumak için settings-service kullanmalı
6. Build doğrulama

## Sonraki Faz
→ `15-testing-validation.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesine kapsamlı Ayarlar sayfası ekle.

Adımlar:
1. lib/settings-service.ts oluştur (get/set/getGroup/delete — AppSettings tablosu)
2. app/settings/page.tsx oluştur (5 bölüm: Genel, Kart Finans, AI, Bildirim, Strateji)
3. components/settings/ altında: SettingsSection, SettingToggle, SettingInput, MaskedApiKeyInput
4. Navbar'a "Ayarlar" linki ekle
5. Faz-5'teki faiz ayarları UI'ını buraya entegre et
6. API key maskelenmiş sakla ve göster

Kurallar:
- AppSettings key-value modeli kullan
- isEncrypted=true olan alanlar maskelenmiş gösterilmeli
- Ayarlar değiştiğinde ilgili sayfalar revalidate olmalı
- npm run build ile doğrula
```
