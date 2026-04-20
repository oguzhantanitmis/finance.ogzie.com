import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { prisma } from '@/lib/prisma'
import { composeFinancialContext } from '@/lib/ai/context-composer'
import { buildSystemPrompt, buildChatPrompt } from '@/lib/ai/prompt-builder'

export const dynamic = 'force-dynamic'

const MAX_PROMPT_LENGTH = 2000
const AI_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
const AI_RATE_LIMIT_MAX_REQUESTS = 12

type RateLimitEntry = {
    count: number
    resetAt: number
}

type CommandType = 'ADD_EXPENSE' | 'ADD_INCOME' | 'QUERY_BALANCE' | 'QUERY_DEBT' | 'QUERY_CARDS' | 'QUERY_HEALTH' | 'QUERY_GOALS' | 'QUERY_ACCOUNTS' | 'QUERY_SUBSCRIPTIONS' | 'GREETING' | 'AI_CHAT' | 'UNKNOWN'
type OpenAIMessage = { role: 'system' | 'user', content: string }

interface OpenAIChatApiResponse {
    choices?: Array<{
        message?: {
            content?: string | null
        }
    }>
    error?: {
        message?: string
    }
}

declare global {
    var financeAiRateLimits: Map<string, RateLimitEntry> | undefined
}

const financeAiRateLimits = globalThis.financeAiRateLimits ?? new Map<string, RateLimitEntry>()

if (process.env.NODE_ENV !== 'production') {
    globalThis.financeAiRateLimits = financeAiRateLimits
}

function parseCommand(text: string): CommandType {
    const lowerText = text.toLowerCase()

    if (['selam', 'merhaba', 'günaydın', 'iyi geceler', 'hey', 'naber'].some((word) => lowerText.includes(word))) return 'GREETING'

    const incomeMatch = lowerText.match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(yattı|geldi|kazandım|aldım)/)
    const expenseMatch = lowerText.match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(harcadım|gitti|ödedim|verdim)/)
    if (incomeMatch) return 'ADD_INCOME'
    if (expenseMatch) return 'ADD_EXPENSE'

    if (lowerText.includes('sağlık') || lowerText.includes('puan') || lowerText.includes('skor')) return 'QUERY_HEALTH'
    if (lowerText.includes('hedef')) return 'QUERY_GOALS'
    if (lowerText.includes('hesap') || lowerText.includes('bakiye')) return 'QUERY_ACCOUNTS'
    if (lowerText.includes('abonelik') || lowerText.includes('tasarruf')) return 'QUERY_SUBSCRIPTIONS'
    if (lowerText.includes('kart') || lowerText.includes('ekstre') || lowerText.includes('asgari') || lowerText.includes('faiz')) return 'QUERY_CARDS'
    if (lowerText.includes('borç') || lowerText.includes('borcum') || lowerText.includes('kredi') || lowerText.includes('ödemem')) return 'QUERY_DEBT'
    if (lowerText.includes('durum') || lowerText.includes('analiz') || lowerText.includes('risk') || lowerText.includes('rapor') || lowerText.includes('özetle') || lowerText.includes('özet')) return 'QUERY_BALANCE'

    return 'AI_CHAT'
}

function mapCurrency(input?: string) {
    if (!input) return 'TRY'
    if (['usd', 'dolar'].includes(input)) return 'USD'
    if (['eur', 'euro'].includes(input)) return 'EUR'
    return 'TRY'
}

function getOpenAIConfig() {
    const requestedModel = process.env.OPENAI_MODEL ?? 'gpt-5-mini'
    const rawBaseUrl = process.env.OPENAI_BASE_URL
    const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1'

    return {
        baseUrl,
        modelsToTry: requestedModel === 'gpt-5-mini'
            ? [requestedModel]
            : [requestedModel, 'gpt-5-mini'],
    }
}

function getOpenAIErrorMessage(response: OpenAIChatApiResponse | null) {
    return response?.error?.message || ''
}

function getOpenAIContent(response: OpenAIChatApiResponse | null) {
    return response?.choices?.[0]?.message?.content ?? null
}

function parseRequestPrompt(body: unknown) {
    if (!body || typeof body !== 'object' || typeof (body as { prompt?: unknown }).prompt !== 'string') {
        return null
    }

    return (body as { prompt: string }).prompt.trim()
}

function getRateLimitKey(userId: string) {
    return `ai:${userId}`
}

function enforceRateLimit(key: string) {
    const now = Date.now()

    for (const [entryKey, entry] of financeAiRateLimits.entries()) {
        if (entry.resetAt <= now) {
            financeAiRateLimits.delete(entryKey)
        }
    }

    const existing = financeAiRateLimits.get(key)
    if (!existing) {
        financeAiRateLimits.set(key, {
            count: 1,
            resetAt: now + AI_RATE_LIMIT_WINDOW_MS,
        })
        return null
    }

    if (existing.count >= AI_RATE_LIMIT_MAX_REQUESTS) {
        return existing.resetAt - now
    }

    financeAiRateLimits.set(key, {
        ...existing,
        count: existing.count + 1,
    })

    return null
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 20000) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
        return await fetch(url, {
            ...init,
            signal: controller.signal,
        })
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('AI sağlayıcısı zamanında yanıt vermedi.')
        }
        throw error
    } finally {
        clearTimeout(timeout)
    }
}

async function parseOpenAIResponse(response: Response) {
    const raw = await response.text()

    try {
        return JSON.parse(raw) as OpenAIChatApiResponse
    } catch {
        return {
            error: {
                message: raw.slice(0, 500) || response.statusText,
            },
        } satisfies OpenAIChatApiResponse
    }
}

async function requestOpenAIChatCompletion({
    apiKey,
    messages,
    maxCompletionTokens,
}: {
    apiKey: string
    messages: OpenAIMessage[]
    maxCompletionTokens?: number
}) {
    const { baseUrl, modelsToTry } = getOpenAIConfig()

    let aiResponse: Response | null = null
    let aiData: OpenAIChatApiResponse | null = null

    for (const model of modelsToTry) {
        const body: Record<string, unknown> = {
            model,
            messages,
        }

        if (maxCompletionTokens !== undefined) {
            body.max_completion_tokens = maxCompletionTokens
        }

        aiResponse = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        })

        aiData = await parseOpenAIResponse(aiResponse)

        if (aiResponse.ok) {
            return getOpenAIContent(aiData) ?? 'Yanıt alınamadı.'
        }

        const errorMessage = getOpenAIErrorMessage(aiData)
        if (errorMessage.includes('access to model') || errorMessage.includes('does not exist')) {
            console.warn(`Model ${model} erişim hatası, sonraki model deneniyor...`)
            continue
        }

        break
    }

    console.error('OpenAI API Error:', aiData)
    return `API Hatası: ${getOpenAIErrorMessage(aiData) || aiResponse?.statusText || 'Bilinmeyen hata'}`
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json().catch(() => null)
        const prompt = parseRequestPrompt(body)
        if (!prompt) {
            return NextResponse.json({ error: 'Geçerli bir prompt gönderilmelidir.' }, { status: 400 })
        }
        if (prompt.length > MAX_PROMPT_LENGTH) {
            return NextResponse.json({ error: `Prompt en fazla ${MAX_PROMPT_LENGTH} karakter olabilir.` }, { status: 413 })
        }

        const retryAfterMs = enforceRateLimit(getRateLimitKey(user.id))
        if (retryAfterMs !== null) {
            return NextResponse.json(
                { error: 'Çok fazla AI isteği gönderildi. Lütfen biraz sonra tekrar deneyin.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
                    },
                },
            )
        }

        const commandType = parseCommand(prompt)

        // Context-aware: tüm finansal veriyi topla
        const context = await composeFinancialContext(user.id)
        const summary = await getMonthlyBudgetSummary(user.id)

        let responseText = ''

        // OpenAI API key kontrolü
        const apiKey = process.env.OPENAI_API_KEY

        switch (commandType) {
            case 'GREETING':
                responseText = `Merhaba! Ben senin finans koçunum. ${context.split('\n').slice(0, 5).join(' ').substring(0, 200)}...

Bana şunları sorabilirsin:
• "Bu ayki durumumu özetle"
• "Borç stratejisi öner"
• "Abonelik analizi yap"
• "Sağlık puanımı açıkla"`
                break

            case 'ADD_INCOME': {
                const match = prompt.toLowerCase().match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(yattı|geldi|kazandım|aldım)/)
                if (match) {
                    const amount = Number(match[1].replace(',', '.'))
                    const currency = mapCurrency(match[2])
                    const category = match[3].trim() || 'Gelir'
                    await prisma.transaction.create({
                        data: { userId: user.id, amount, type: 'INCOME', category, description: `AI Chat: ${category}` },
                    })
                    responseText = `✅ ${amount.toLocaleString('tr-TR', { style: 'currency', currency })} gelir olarak işlendi.`
                }
                break
            }

            case 'ADD_EXPENSE': {
                const match = prompt.toLowerCase().match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(harcadım|gitti|ödedim|verdim)/)
                if (match) {
                    const amount = Number(match[1].replace(',', '.'))
                    const currency = mapCurrency(match[2])
                    const category = match[3].trim() || 'Gider'
                    await prisma.transaction.create({
                        data: { userId: user.id, amount, type: 'EXPENSE', category, description: `AI Chat: ${category}` },
                    })
                    responseText = `✅ ${amount.toLocaleString('tr-TR', { style: 'currency', currency })} gider olarak işlendi.`
                }
                break
            }

            case 'AI_CHAT': {
                // OpenAI varsa gerçek AI, yoksa context-based fallback
                if (apiKey) {
                    try {
                        responseText = await requestOpenAIChatCompletion({
                            apiKey,
                            messages: [
                                { role: 'system', content: buildSystemPrompt() },
                                { role: 'user', content: buildChatPrompt(context, prompt) },
                            ],
                            maxCompletionTokens: 4096,
                        })
                    } catch (aiError) {
                        console.error('OpenAI Error:', aiError)
                        responseText = `⚠️ AI servisi şu an yanıt veremiyor. Hataya rağmen verilerine bakayım:\n\n${generateFallbackAnalysis(context)}`
                    }
                } else {
                    responseText = generateFallbackAnalysis(context) + '\n\n💡 Daha detaylı analiz için Ayarlar sayfasından OpenAI API key ekleyebilirsin.'
                }
                break
            }

            default: {
                // Diğer tüm sorgu türleri de context-aware
                if (apiKey) {
                    try {
                        responseText = await requestOpenAIChatCompletion({
                            apiKey,
                            messages: [
                                { role: 'system', content: buildSystemPrompt() },
                                { role: 'user', content: buildChatPrompt(context, prompt) },
                            ],
                        })
                    } catch (aiError) {
                        console.error('OpenAI Error:', aiError)
                        responseText = `⚠️ AI servisi şu an yanıt veremiyor. Hataya rağmen verilerine bakayım:\n\n${generateContextResponse(commandType, context, summary)}`
                    }
                } else {
                    responseText = generateContextResponse(commandType, context, summary)
                }
            }
        }

        return NextResponse.json({ text: responseText, role: 'assistant' })
    } catch (error) {
        console.error('AI API Error:', error)
        return NextResponse.json({ error: `AI Service Unavailable: ${String(error)}` }, { status: 500 })
    }
}

function generateContextResponse(type: CommandType, context: string, summary: { plannedIncome: number; fixedCommitments: number; debtCommitments: number; freeCash: number; netWorth: number }) {
    const fmt = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })

    switch (type) {
        case 'QUERY_BALANCE':
            return `📊 Finansal Özet:\n\n• Planlanan gelir: ${fmt(summary.plannedIncome)}\n• Sabit yük: ${fmt(summary.fixedCommitments)}\n• Borç baskısı: ${fmt(summary.debtCommitments)}\n• Serbest nakit: ${fmt(summary.freeCash)}\n• Net değer: ${fmt(summary.netWorth)}`
        case 'QUERY_HEALTH':
            return extractSection(context, 'FİNANSAL SAĞLIK') || 'Sağlık puanı hesaplanamadı.'
        case 'QUERY_GOALS':
            return extractSection(context, 'AKTİF HEDEFLER') || 'Aktif hedef bulunamadı. /goals sayfasından hedef ekleyebilirsin.'
        case 'QUERY_ACCOUNTS':
            return extractSection(context, 'HESAPLAR') || 'Hesap bulunamadı. /accounts sayfasından hesap ekleyebilirsin.'
        case 'QUERY_SUBSCRIPTIONS':
            return extractSection(context, 'AYLIK GELİR-GİDER') || 'Abonelik verisi bulunamadı.'
        case 'QUERY_CARDS':
            return extractSection(context, 'KREDİ KARTLARI') || 'Kayıtlı kredi kartı bulunamadı.'
        case 'QUERY_DEBT':
            return (extractSection(context, 'BORÇLAR') || '') + '\n\n' + `Borç baskısı: ${fmt(summary.debtCommitments)}`
        default:
            return `Finansal verilerine göre:\n\n${context.split('\n').slice(0, 15).join('\n')}\n\nDaha detaylı analiz için Ayarlar sayfasından OpenAI API key ekleyebilirsin.`
    }
}

function extractSection(context: string, sectionName: string): string | null {
    const regex = new RegExp(`=== ${sectionName}.*?===\\n([\\s\\S]*?)(?=\\n===|$)`)
    const match = context.match(regex)
    return match ? match[1].trim() : null
}

function generateFallbackAnalysis(context: string): string {
    const lines = context.split('\n').filter((l) => l.trim() && !l.startsWith('==='))
    return lines.slice(0, 12).join('\n')
}
