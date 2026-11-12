import { safeRoute } from '@/lib/safe-route';
import { boundedFetch } from '@/lib/request';
import { NextResponse } from 'next/server'

import { isDbConnectionError, prisma } from '@/lib/prisma'
import { composeFinancialContext } from '@/lib/ai/context-composer'
import { buildSystemPrompt, buildChatPrompt } from '@/lib/ai/prompt-builder'
import { isOverQuota, recordUsage } from '@/lib/ai-usage'
import { answerFinanceAssistant } from '@/lib/finance-assistant'
import { requireSuperuser } from '@/lib/server-auth'
import { createAiEventStream } from '@/lib/ai/stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type CommandType = 'ADD_EXPENSE' | 'ADD_INCOME' | 'GREETING' | 'AI_CHAT'
const MAX_PROMPT_LENGTH = 2000

function parseCommand(text: string): CommandType {
    const lower = text.toLowerCase()
    if (['selam', 'merhaba', 'günaydın', 'iyi geceler', 'hey', 'naber'].some((w) => lower.includes(w))) return 'GREETING'
    if (lower.match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(yattı|geldi|kazandım|aldım)/)) return 'ADD_INCOME'
    if (lower.match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(harcadım|gitti|ödedim|verdim)/)) return 'ADD_EXPENSE'
    return 'AI_CHAT'
}

async function parsePrompt(req: Request) {
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return { error: 'Invalid JSON body', status: 400 as const }
    }

    if (!body || typeof body !== 'object' || !('prompt' in body)) {
        return { error: 'Prompt zorunludur.', status: 400 as const }
    }

    const prompt = typeof (body as { prompt?: unknown }).prompt === 'string'
        ? (body as { prompt: string }).prompt.trim()
        : ''

    if (!prompt) {
        return { error: 'Prompt zorunludur.', status: 400 as const }
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
        return { error: `Prompt en fazla ${MAX_PROMPT_LENGTH} karakter olabilir.`, status: 413 as const }
    }

    return { prompt }
}

function mapCurrency(input?: string) {
    if (!input) return 'TRY'
    if (['usd', 'dolar'].includes(input)) return 'USD'
    if (['eur', 'euro'].includes(input)) return 'EUR'
    return 'TRY'
}

function isPositiveAmount(amount: number) {
    return Number.isFinite(amount) && amount > 0
}

/** OpenAI streaming helper — returns a ReadableStream of text chunks */
async function streamOpenAI(context: string, userMessage: string): Promise<ReadableStream<Uint8Array> | null> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return null

    const model = process.env.OPENAI_MODEL ?? 'gpt-5-mini'
    const rawBaseUrl = process.env.OPENAI_BASE_URL
    const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1'

    const response = await boundedFetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            stream: true,
            stream_options: { include_usage: true },
            messages: [
                { role: 'system', content: buildSystemPrompt() },
                { role: 'user', content: buildChatPrompt(context, userMessage) },
            ],
            max_completion_tokens: 1500,
            temperature: 0.3,
        }),
    })

    if (!response.ok || !response.body) {
        console.error('api.request_failed')
        return null
    }

    return response.body
}

async function POSTHandler(req: Request) {
    try {
        let user: Awaited<ReturnType<typeof requireSuperuser>>
        try {
            user = await requireSuperuser()
        } catch (error) {
            if (error instanceof Error && error.message === 'Unauthorized') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            if (error instanceof Error && error.message === 'Forbidden') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
            throw error
        }

        const parsedPrompt = await parsePrompt(req)
        if ('error' in parsedPrompt) {
            return NextResponse.json({ error: parsedPrompt.error }, { status: parsedPrompt.status })
        }

        const { prompt } = parsedPrompt
        const commandType = parseCommand(prompt)

        // Quick responses that don't need AI
        if (commandType === 'GREETING') {
            return NextResponse.json({
                text: `Merhaba! Ben finans asistanınım. Bana şunları sorabilirsin:\n• "Bu ayki durumumu özetle"\n• "Borç stratejisi öner"\n• "Abonelik analizi yap"\n• "Sağlık puanımı açıkla"`,
            })
        }

        if (commandType === 'ADD_INCOME') {
            const match = prompt.toLowerCase().match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(yattı|geldi|kazandım|aldım)/)
            if (match) {
                const amount = Number(match[1].replace(',', '.'))
                if (!isPositiveAmount(amount)) {
                    return NextResponse.json({ error: 'Tutar geçersiz.' }, { status: 400 })
                }
                const currency = mapCurrency(match[2])
                const category = match[3].trim() || 'Gelir'
                await prisma.transaction.create({
                    data: { userId: user.id, amount, type: 'INCOME', category, description: `AI Chat: ${category}` },
                })
                return NextResponse.json({ text: `✅ ${amount.toLocaleString('tr-TR', { style: 'currency', currency })} gelir olarak işlendi.` })
            }
        }

        if (commandType === 'ADD_EXPENSE') {
            const match = prompt.toLowerCase().match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(harcadım|gitti|ödedim|verdim)/)
            if (match) {
                const amount = Number(match[1].replace(',', '.'))
                if (!isPositiveAmount(amount)) {
                    return NextResponse.json({ error: 'Tutar geçersiz.' }, { status: 400 })
                }
                const currency = mapCurrency(match[2])
                const category = match[3].trim() || 'Gider'
                await prisma.transaction.create({
                    data: { userId: user.id, amount, type: 'EXPENSE', category, description: `AI Chat: ${category}` },
                })
                return NextResponse.json({ text: `✅ ${amount.toLocaleString('tr-TR', { style: 'currency', currency })} gider olarak işlendi.` })
            }
        }

        const deterministicAnswer = await answerFinanceAssistant(user.id, prompt).catch(() => null)
        if (deterministicAnswer) {
            return NextResponse.json({ text: deterministicAnswer })
        }

        // AI Chat — streaming response with slim context
        const context = await composeFinancialContext(user.id, 'slim')
        const apiKey = process.env.OPENAI_API_KEY

        if (!apiKey) {
            return NextResponse.json({
                text: generateFormattedFallback(context),
            })
        }

        // Kota kontrolü — dolu ise OpenAI'a HİÇ gitme, ücretsiz yerel özet dön
        if (await isOverQuota(user.id, user.aiMonthlyTokenLimit)) {
            return NextResponse.json({
                text: 'Aylık AI kotan doldu. Verilerinden hazırlanan ücretsiz özet:\n\n' + generateFormattedFallback(context),
                quota: 'exceeded',
            })
        }

        // Try streaming first
        const openaiStream = await streamOpenAI(context, prompt)

        if (openaiStream) {
            const textStream = createAiEventStream(openaiStream, (usage) => recordUsage(user.id, usage))
            return new Response(textStream, {
                headers: {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-store',
                },
            })
        }

        // Streaming failed — try non-streaming fallback
        try {
            const model = process.env.OPENAI_MODEL ?? 'gpt-5-mini'
            const rawBaseUrl = process.env.OPENAI_BASE_URL
            const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1'

            const fallbackRes = await boundedFetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: buildSystemPrompt() },
                        { role: 'user', content: buildChatPrompt(context, prompt) },
                    ],
                    max_completion_tokens: 1500,
                    temperature: 0.3,
                }),
            })

            if (fallbackRes.ok) {
                const data = await fallbackRes.json()
                if (data.usage) {
                    await recordUsage(user.id, data.usage).catch(() => console.error('api.request_failed'))
                }
                const text = data.choices?.[0]?.message?.content ?? 'Yanıt alınamadı.'
                return NextResponse.json({ text })
            }
        } catch {
            console.error('api.request_failed')
        }

        // All AI attempts failed — return formatted context
        return NextResponse.json({
            text: generateFormattedFallback(context),
        })
    } catch (error) {
        console.error('api.request_failed')
        if (isDbConnectionError(error)) throw error
        // İç hata detayını istemciye sızdırma
        return NextResponse.json({ error: 'AI servisi şu an kullanılamıyor. Lütfen tekrar deneyin.' }, { status: 500 })
    }
}

/** Format context data into a readable summary instead of raw dump */
function generateFormattedFallback(context: string): string {
    const sections: string[] = []

    const balanceMatch = context.match(/Toplam bakiye: (.+)/)
    const cashMatch = context.match(/Kullanılabilir nakit: (.+)/)
    const healthMatch = context.match(/FİNANSAL SAĞLIK: (\d+)\/100/)

    if (balanceMatch || cashMatch) {
        sections.push('📊 **Finansal Durum**')
        if (balanceMatch) sections.push(`• Toplam bakiye: ${balanceMatch[1]}`)
        if (cashMatch) sections.push(`• Kullanılabilir nakit: ${cashMatch[1]}`)
    }

    if (healthMatch) {
        const score = Number(healthMatch[1])
        const emoji = score >= 70 ? '🟢' : score >= 40 ? '🟡' : '🔴'
        sections.push(`\n${emoji} Sağlık Puanı: ${score}/100`)
    }

    const freeMatch = context.match(/Serbest nakit: (.+)/)
    if (freeMatch) {
        sections.push(`\n💰 Aylık serbest nakit: ${freeMatch[1]}`)
    }

    if (sections.length === 0) {
        sections.push('Finansal verilerine erişildi ancak AI analizi şu an kullanılamıyor.')
    }

    sections.push('\n💡 Detaylı AI analizi için Ayarlar sayfasından API bağlantısını kontrol edin.')

    return sections.join('\n')
}

export const POST = safeRoute(POSTHandler);
