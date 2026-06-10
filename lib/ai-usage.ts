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
