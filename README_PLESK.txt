# Vercel Deploy Notları

Bu proje artık Vercel deploy akışına göre ayarlanmıştır.

## Önerilen Vercel ayarları
1. Framework Preset: `Next.js`
2. Build Command: `npm run build:vercel`
3. Install Command: varsayılan bırakılabilir
4. Environment Variables:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - gerekiyorsa `AI_MODEL_ENDPOINT`, `AI_API_KEY`, `SMTP_*`

## Build akışı
- `npm run build:vercel`
  - önce `prisma migrate deploy`
  - sonra `prisma generate`
  - ardından `next build`

## Notlar
- Production/Preview deploy sırasında veritabanı migration’larını atlamamak için Vercel Build Command olarak `npm run build:vercel` kullanılmalı.
- `npm run db:update` tek başına migration deploy etmek için tutuldu.
- `npm run db:push` sadece local geliştirme veya legacy senaryolar için bırakıldı. Production build içinde kullanılmamalı.
- Finance OS V1.5 tabloları (`RecurringExpense`, `IncomeSource`, `BudgetMonth`, `BudgetAlert`) bu migration akışına dahildir.
