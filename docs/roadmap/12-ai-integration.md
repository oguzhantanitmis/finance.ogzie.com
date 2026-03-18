# Faz 12 — AI Entegrasyonu (OpenAI GPT)

## Amaç
Sisteme gerçek OpenAI (GPT-4.1-mini varsayılan) entegrasyonu ekleyerek veri temelli, aksiyon odaklı finansal koçluk sunmak. Mevcut basit chat UI'ını tam kapsamlı bir AI finans asistanına dönüştürmek.

## Kapsam
**Yapılacak:**
- OpenAI API entegrasyonu
- AI servis katmanı: prompt builder, context composer, recommendation generator
- Ayarlar: API key, model seçimi, aktif/pasif, kullanım limiti
- AI görevleri: ödeme önerisi, borç stratejisi, abonelik analizi, nakit uyarısı, aylık özet
- Dashboard AI öneri kutusu doldurma
- Mevcut `/ai` sayfası güncelleme (context-aware chat)
- Usage logger ve fallback/error handler
- Öneri formatı: öneri, neden, risk, önerilen aksiyon

**Yapılmayacak:**
- Sesli asistan
- Fine-tuning
- Çoklu model aynı anda kullanımı

## Mevcut Durum Analizi
- `/ai` sayfası mevcut: basit chat UI, `/api/ai` endpoint'ine POST
- `/api/ai/route.ts` mevcut ama muhtemelen basit
- `AIInsight` modeli var (otomatik insight'lar için)
- `insight-engine.ts` var ama kurallar statik, AI kullanmıyor
- Faz-1'de `AIRecommendation` modeli tanımlanmış
- `AppSettings` modeli AI ayarları için kullanılacak

## Veri Modeli Etkisi
Faz-1'deki `AIRecommendation` ve `AppSettings` modelleri kullanılır. Ek model gerekmez.

## Backend İşleri

### Servis: `lib/ai/openai-client.ts`
```typescript
// OpenAI API wrapper
initializeClient(apiKey: string): OpenAIClient
chat(messages: Message[], model?: string): Promise<string>
chatWithJson(messages: Message[], schema: ZodSchema): Promise<T> // structured output
```

### Servis: `lib/ai/context-composer.ts`
```typescript
// Kullanıcının tüm finansal verisini AI'a vermek için context oluşturur
composeFinancialContext(userId: string): Promise<string>
  // İçerik:
  // - Hesap bakiyeleri, toplam varlık, toplam borç
  // - Kredi kartları: borç, limit, kullanım oranı, yaklaşan vadeler
  // - Alacak/verecek durumu
  // - Abonelik toplam yükü
  // - Sabit gider yükü
  // - Sağlık puanı ve breakdown
  // - Son 30 gün LedgerEntry özeti
  // - Aktif hedefler ve ilerleme
  // - Borç önceliklendirme planı
```

### Servis: `lib/ai/prompt-builder.ts`
```typescript
buildSystemPrompt(): string
  // "Sen bir kişisel finans koçusun. Türkiye'de yaşayan bir kullanıcıya..."
  // "Veri uydurmak kesinlikle yasak."
  // "Borç kapatma hedefini merkeze al."
  // "Önerilerini şu formatta ver: öneri, neden, risk, aksiyon"

buildRecommendationPrompt(context, type): string
  // payment_plan, savings_tip, risk_alert, monthly_summary

buildChatPrompt(context, userMessage): string
```

### Servis: `lib/ai/recommendation-generator.ts`
```typescript
generateMonthlyRecommendations(userId): Promise<AIRecommendation[]>
generatePaymentAdvice(userId): Promise<AIRecommendation>
generateSavingsTips(userId): Promise<AIRecommendation>
generateRiskAlerts(userId): Promise<AIRecommendation[]>
generateMonthlySummary(userId): Promise<AIRecommendation>
```

### Servis: `lib/ai/usage-logger.ts`
```typescript
logUsage(userId, model, tokens, type): Promise<void>
getMonthlyUsage(userId): Promise<UsageStats>
checkLimit(userId): Promise<boolean> // limit aşıldı mı?
```

### API Route: `/api/ai/route.ts` güncelleme
```typescript
POST /api/ai
Body: { prompt: string, type?: string }
// 1. Kullanıcı doğrula
// 2. Limit kontrolü
// 3. Context oluştur
// 4. Prompt oluştur
// 5. OpenAI çağır
// 6. Usage logla
// 7. Yanıtı döndür
```

### İş Kuralları
1. API key AppSettings'de şifreli saklanmalı (isEncrypted: true)
2. Model varsayılanı: gpt-4.1-mini (ayarlardan değiştirilebilir)
3. AI pasifse hiçbir otomatik öneri üretilmemeli
4. Aylık kullanım limiti aşıldığında uyarı
5. OpenAI hatası → fallback mesaj göster, crash olma
6. Context'e gerçek veriler gitmeli, uydurma yok
7. Öneri formatı: { title, content, reasoning, risk, suggestedAction }

## Frontend İşleri

### `/ai` sayfası güncelleme
- Context-aware chat: her mesajda finansal context gönderilir
- Önceki konuşma geçmişi (session bazlı)
- Yükleniyor animasyonu
- Hata durumu UI
- "Bana bu ayki durumumu özetle" gibi hızlı butonlar

### Dashboard AI Öneri Kutusu
- Faz-8'deki placeholder doldurulur
- Son 3 AI önerisi
- Her öneride: başlık, içerik, tip ikonu
- "Tümünü gör" → `/ai` sayfasına

### Bileşenler
1. `AIRecommendationBox` — dashboard öneri kutusu (Faz-8 placeholder güncelle)
2. `QuickPromptButtons` — hızlı soru butonları
3. `AIStatusBadge` — AI aktif/pasif durumu

## Dashboard / Rapor Etkisi
- Dashboard AI öneri kutusu doldurulur
- Raporlara AI yorum eklenebilir (opsiyonel)

## Ayarlar Etkisi
Faz-14'te ayarlar sayfasına AI bölümü eklenecek:
- API key (maskelenmiş)
- Model seçimi
- AI aktif/pasif
- Kullanım limiti
- Öneri modu açık/kapalı
- Otomatik haftalık analiz
- Finans koçu modu

## AI Etkisi
Bu faz AI'ın kendisidir.

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1 (modeller), Faz-2-6 (context verisi), Faz-8 (dashboard placeholder)
- **Opsiyonel:** Faz-7 (ödeme planı), Faz-10 (sağlık puanı), Faz-11 (hedefler)
- **Sonraki:** Faz-14 (AI ayarları UI)

## Kabul Kriterleri
- [ ] OpenAI API çağrısı çalışıyor
- [ ] Context composer tüm finansal veriyi topluyor
- [ ] Chat context-aware (kullanıcının gerçek verileriyle cevap veriyor)
- [ ] Dashboard'da AI önerileri görüntüleniyor
- [ ] Hızlı butonlar çalışıyor
- [ ] Usage logging çalışıyor
- [ ] API key güvenli saklanıyor
- [ ] Hata durumunda fallback mesaj
- [ ] Öneri formatı: başlık, içerik, neden, risk, aksiyon

## Test Senaryoları

### Mutlu Senaryo
- "Bu ay durumumu özetle" → gerçek verilere dayalı özet
- "Hangi borcu önce kapatmalıyım?" → borç analizi ile cevap

### Hata Senaryosu
- Geçersiz API key → anlaşılır hata mesajı
- Rate limit → "Biraz sonra tekrar dene"
- API down → fallback mesaj

### Edge Case
- Hiç finansal verisi olmayan kullanıcı → "Önce veri gir" önerisi
- Çok uzun context → token limitine dikkat, özetleme

## Uygulama Sırası
1. `openai` npm paketi kur
2. `lib/ai/openai-client.ts` oluştur
3. `lib/ai/context-composer.ts` oluştur
4. `lib/ai/prompt-builder.ts` oluştur
5. `lib/ai/recommendation-generator.ts` oluştur
6. `lib/ai/usage-logger.ts` oluştur
7. `/api/ai/route.ts` güncelle
8. `/ai` sayfasını güncelle (context-aware + hızlı butonlar)
9. Dashboard AIRecommendationBox doldur
10. Build doğrulama

## Tahmini Riskler
- API key sızıntısı → server-side only, client'a kesinlikle gitmemeli
- OpenAI maliyeti → kullanım limiti zorunlu
- Halüsinasyon → system prompt'ta veri uydurmayı yasakla
- Token limiti aşımı → context'i özetleyerek kısalt

## Sonraki Faz
→ `13-simulations-scenarios.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesine gerçek OpenAI (GPT) entegrasyonu ekle.

Adımlar:
1. npm install openai
2. lib/ai/ dizini oluştur:
   - openai-client.ts (API wrapper)
   - context-composer.ts (kullanıcının tüm finansal verisini toplar)
   - prompt-builder.ts (system prompt + chat prompt + recommendation prompt)
   - recommendation-generator.ts (aylık öneri, ödeme önerisi, risk uyarısı, tasarruf)
   - usage-logger.ts (token kullanım takibi)
3. /api/ai/route.ts güncelle (context-aware, usage logged, error handled)
4. /ai sayfasını güncelle (hızlı butonlar, context-aware chat)
5. Dashboard AIRecommendationBox'ı doldur

Kritik kurallar:
- API key server-side only, client'a ASLA gönderme
- AppSettings'den API key al, yoksa env variable fallback
- System prompt: "Veri uydurmak yasak. Borç kapatma hedefini merkeze al."
- Öneri formatı: { title, content, reasoning, risk, suggestedAction }
- Context: hesap bakiyeleri, borçlar, kartlar, alacaklar, abonelikler, gelirler, sağlık puanı
- Hata durumunda crash olma, anlaşılır mesaj göster
- Mevcut /ai sayfasını OKUYUP güncelleş, sıfırdan yazma
- npm run build ile doğrula
```
