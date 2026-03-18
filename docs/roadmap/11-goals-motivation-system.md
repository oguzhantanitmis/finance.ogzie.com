# Faz 11 — Hedef ve Motivasyon Sistemi

## Amaç
Kullanıcının finansal hedefler belirleyip ilerlemesini takip etmesini sağlamak. "3 ayda X kartını kapat", "6 ayda borcu %20 azalt" gibi hedefler oluşturmak, ilerleme yüzdesini göstermek ve önerilen aksiyonlar sunmak.

## Kapsam
**Yapılacak:**
- Hedef CRUD (`/goals` sayfası)
- Hedef tipleri: borç kapatma, tasarruf, abonelik azaltma, asgari ödeme azaltma
- İlerleme yüzdesi hesaplama
- Dashboard'daki GoalProgressBar placeholder'ını doldurma
- Hedef bazlı önerilen aksiyonlar

**Yapılmayacak:**
- AI hedef önerisi (Faz-12)
- Gamification (rozetler, başarılar)

## Mevcut Durum Analizi
- Hedef kavramı projede **hiç yok**
- `FinancialGoal` modeli Faz-1'de oluşturulmuş

## Veri Modeli Etkisi
Faz-1'deki `FinancialGoal` modeli kullanılır.

## Backend İşleri

### Servis: `lib/goal-service.ts`
```typescript
createGoal(userId, data): Promise<FinancialGoal>
updateGoal(goalId, data): Promise<FinancialGoal>
deleteGoal(goalId): Promise<void>
getGoals(userId): Promise<GoalWithProgress[]>
calculateProgress(goal): Promise<GoalProgress>
  // Borç kapatma hedefi: (başlangıç borcu - mevcut borç) / hedef tutar
  // Tasarruf hedefi: mevcut birikim / hedef tutar
getSuggestedActions(goal): string[]
getActiveGoalForDashboard(userId): Promise<GoalWithProgress | null>
```

### İş Kuralları
1. İlerleme yüzdesi otomatik hesaplanmalı (ilgili borç/kart mevcut bakiyesinden)
2. Hedef tarih geçmiş ve tamamlanmamış → uyarı
3. Hedef tamamlandığında → kutlama UI
4. Birden fazla aktif hedef olabilir
5. Dashboard'da en öncelikli hedef gösterilir

## Frontend İşleri

### Sayfa: `/goals`
- Aktif hedefler listesi (ilerleme çubuğu, hedef tarih, mevcut/hedef tutar)
- "Hedef Ekle" formu
- Tamamlanan hedefler arşivi

### Bileşenler
1. `GoalCard` — hedef kartı (ilerleme çubuğu, tutar, tarih, aksiyonlar)
2. `GoalForm` — hedef ekleme formu (tip, tutar, tarih, ilişkili borç/kart)
3. `GoalProgressBar` — dashboard ilerleme çubuğu (Faz-8 placeholder)
4. `GoalCelebration` — tamamlanma kutlaması (confetti veya animasyon)

## Dashboard / Rapor Etkisi
- Dashboard'daki GoalProgressBar doldurulur

## Ayarlar Etkisi
Yok.

## AI Etkisi
Faz-12'de AI hedef önerebilecek.

## Bağımlılıklar
- **Zorunlu önceki:** Faz-1 (FinancialGoal modeli), Faz-8 (dashboard placeholder)
- **Opsiyonel:** Faz-5 (kart borcu takibi), Faz-7 (ödeme planı ilişkisi)

## Kabul Kriterleri
- [ ] Hedef CRUD çalışıyor
- [ ] İlerleme yüzdesi otomatik hesaplanıyor
- [ ] Dashboard'da en öncelikli hedef gösteriliyor
- [ ] Tamamlanan hedef kutlanıyor
- [ ] Önerilen aksiyonlar anlamlı

## Test Senaryoları
- "3 ayda X kartını kapat" hedefi oluştur → kart borcu düştükçe ilerleme artar
- Hedef tarih geçmiş → uyarı gösterilir
- %100 ilerleme → COMPLETED + kutlama

## Uygulama Sırası
1. `lib/goal-service.ts` oluştur
2. `app/goals/` sayfası ve actions
3. `components/goals/` bileşenler
4. Dashboard GoalProgressBar entegrasyonu
5. Navbar'a "Hedefler" linki
6. Build doğrulama

## Tahmini Riskler
- İlerleme hesabında ilişkili borç silinmişse edge case
- Birden fazla hedefin dashboard'da önceliklenmesi

## Sonraki Faz
→ `12-ai-integration.md`

## Claude Code Uygulama Promptu

```
Mevcut finance.ogzie.com projesine Hedef ve Motivasyon sistemi ekle.

Adımlar:
1. lib/goal-service.ts oluştur (CRUD, ilerleme hesaplama, önerilen aksiyonlar)
2. app/goals/page.tsx ve actions.ts oluştur
3. components/goals/ altında GoalCard, GoalForm, GoalCelebration
4. Dashboard'daki GoalProgressBar placeholder'ını gerçek veriyle doldur
5. Navbar'a "Hedefler" linki ekle

Kurallar:
- FinancialGoal modeli zaten schema'da olmalı (Faz-1)
- İlerleme = ilişkili borç/kart mevcut durumuna göre otomatik
- Bir hedef relatedDebtId veya relatedCardId ile bağlanabilir
- Dashboard'da en öncelikli aktif hedef gösterilmeli
- UI: fintech-card, siyah tema
- npm run build ile doğrula
```
