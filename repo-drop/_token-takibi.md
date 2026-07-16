# AI Token Takibi + Aylık Kota — Entegrasyon Rehberi

Amaç: AI'ın sürekli token tüketmesini engellemek ve kullanıcı başına
tüketimi/maliyeti admin panelinden izlemek. Üç parça: **(1) Prisma modeli**,
**(2) sayaç + kota kontrolü** (`/api/ai`), **(3) admin verisi**.

---

## 1) Prisma şeması — `prisma/schema.prisma`

```prisma
model AiUsage {
  id               String   @id @default(cuid())
  userId           String
  period           String   // "2026-06" (yıl-ay) — aylık toplama için
  promptTokens     Int      @default(0)
  completionTokens Int      @default(0)
  totalTokens      Int      @default(0)
  requests         Int      @default(0)
  costUsd          Float    @default(0)
  updatedAt        DateTime @updatedAt
  createdAt        DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, period])   // kullanıcı + ay başına tek satır (upsert)
  @@index([period])
}
```

`User` modeline aylık kota alanı ekle (yoksa global varsayılan kullanılır):

```prisma
model User {
  // ... mevcut alanlar
  aiMonthlyTokenLimit Int       @default(30000)  // 0 = limitsiz
  aiUsages            AiUsage[]
}
```

Migration:

```bash
npm run prisma -- migrate dev --name ai_usage_tracking
# production:
npm run prisma -- migrate deploy && npm run db:generate
```

---

## 2) Sayaç + kota — `lib/ai-usage.ts` (yeni dosya)

```ts
import { prisma } from '@/lib/prisma'

// OpenAI fiyatı (örnek: gpt-4o-mini). Kendi modelinin fiyatına göre güncelle.
const USD_PER_1K_PROMPT = 0.00015
const USD_PER_1K_COMPLETION = 0.0006

export function currentPeriod(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function estimateCost(prompt: number, completion: number) {
  return (prompt / 1000) * USD_PER_1K_PROMPT + (completion / 1000) * USD_PER_1K_COMPLETION
}

/** İstekten ÖNCE: kullanıcı bu ay kotasını doldurdu mu? */
export async function isOverQuota(userId: string, limit: number) {
  if (!limit || limit <= 0) return false // 0 = limitsiz
  const row = await prisma.aiUsage.findUnique({
    where: { userId_period: { userId, period: currentPeriod() } },
    select: { totalTokens: true },
  })
  return (row?.totalTokens ?? 0) >= limit
}

/** Cevaptan SONRA: OpenAI usage'ını işle (upsert). */
export async function recordUsage(userId: string, usage: {
  prompt_tokens?: number; completion_tokens?: number; total_tokens?: number
}) {
  const prompt = usage.prompt_tokens ?? 0
  const completion = usage.completion_tokens ?? 0
  const total = usage.total_tokens ?? prompt + completion
  const cost = estimateCost(prompt, completion)
  const period = currentPeriod()

  await prisma.aiUsage.upsert({
    where: { userId_period: { userId, period } },
    create: { userId, period, promptTokens: prompt, completionTokens: completion, totalTokens: total, requests: 1, costUsd: cost },
    update: {
      promptTokens: { increment: prompt },
      completionTokens: { increment: completion },
      totalTokens: { increment: total },
      requests: { increment: 1 },
      costUsd: { increment: cost },
    },
  })
}
```

### `/api/ai/route.ts` entegrasyonu

OpenAI çağrısının etrafına iki kanca ekle:

```ts
import { getCurrentUser } from '@/lib/server-auth'
import { isOverQuota, recordUsage } from '@/lib/ai-usage'

// ... handler içinde, prompt hazırlandıktan sonra:
const user = await getCurrentUser()
if (!user) return new Response('Unauthorized', { status: 401 })

// 1) Kota kontrolü — dolu ise OpenAI'a HİÇ gitme, ücretsiz yerel cevap dön
if (await isOverQuota(user.id, user.aiMonthlyTokenLimit)) {
  return Response.json({
    text: 'Aylık AI kotan doldu. İşte verilerinden hazırlanmış ücretsiz özet:\n\n' + buildLocalSummary(user.id),
    quota: 'exceeded',
  })
}

// 2) OpenAI çağrısı — streaming yerine usage almak için stream:false
//    (veya stream + sonda usage chunk; aşağıda non-stream örnek)
const completion = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  messages,
})

// 3) Tüketimi kaydet
if (completion.usage) {
  await recordUsage(user.id, completion.usage)
}
```

> `buildLocalSummary` = README'de bahsi geçen deterministik (AI'sız) yerel
> finans özeti. Zaten varsa onu kullan; yoksa dashboard verisinden basit bir
> metin üret. Bu sayede kota dolunca **token harcanmadan** kullanıcıya değer döner.

### Token tasarrufu kuralları (özet)
- **Otomatik analiz YOK** — asistan yalnızca kullanıcı açıkça sorunca çalışır.
- **Kota dolunca** OpenAI'a gidilmez; yerel özet döner.
- (Opsiyonel) Sık sorulan promptların cevabını kısa süre cache'le.

---

## 3) Admin verisi — `AdminAITokens.tsx` için

`/admin` sayfasında (server component) ayın verisini topla ve prop geç:

```ts
import { requireSuperuser } from '@/lib/server-auth' // mevcut yardımcın
import { prisma } from '@/lib/prisma'
import { currentPeriod } from '@/lib/ai-usage'
import AdminAITokens, { type AITokenUser } from '@/components/admin/AdminAITokens'

export default async function AdminPage() {
  await requireSuperuser()
  const period = currentPeriod()

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, aiMonthlyTokenLimit: true,
      aiUsages: { where: { period }, select: { totalTokens: true, costUsd: true, requests: true } },
    },
  })

  const rows: AITokenUser[] = users.map((u) => {
    const usg = u.aiUsages[0]
    return {
      id: u.id,
      name: u.name ?? u.email,
      email: u.email,
      role: u.role as 'USER' | 'SUPERUSER',
      used: usg?.totalTokens ?? 0,
      limit: u.aiMonthlyTokenLimit ?? 0,
      costUsd: usg?.costUsd ?? 0,
      requests: usg?.requests ?? 0,
    }
  })

  return <AdminAITokens users={rows} month="Haziran 2026" />
}
```

---

## Notlar
- `prisma` import yolu projendeki client'a göre (`@/lib/prisma` veya benzeri) ayarlanmalı.
- Streaming kullanmaya devam edeceksen: OpenAI stream'de `stream_options: { include_usage: true }` ile son chunk'ta `usage` gelir; onu `recordUsage`'a ver.
- Kota tavanını kullanıcı bazında `aiMonthlyTokenLimit` ile, global varsayılanı modeldeki `@default` ile yönet. Admin "Düzenle" butonu bu alanı güncelleyen bir server action'a bağlanır.
