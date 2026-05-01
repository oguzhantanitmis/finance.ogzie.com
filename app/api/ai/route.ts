import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { composeFinancialContext } from '@/lib/ai/context-composer'
import { buildSystemPrompt, buildChatPrompt } from '@/lib/ai/prompt-builder'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type CommandType = 'ADD_EXPENSE' | 'ADD_INCOME' | 'GREETING' | 'AI_CHAT'

function parseCommand(text: string): CommandType {
    const lower = text.toLowerCase()
    if (['selam', 'merhaba', 'günaydın', 'iyi geceler', 'hey', 'naber'].some((w) => lower.includes(w))) return 'GREETING'
    if (lower.match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(yattı|geldi|kazandım|aldım)/)) return 'ADD_INCOME'
    if (lower.match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(harcadım|gitti|ödedim|verdim)/)) return 'ADD_EXPENSE'
    return 'AI_CHAT'
}

function mapCurrency(input?: string) {
    if (!input) return 'TRY'
    if (['usd', 'dolar'].includes(input)) return 'USD'
    if (['eur', 'euro'].includes(input)) return 'EUR'
    return 'TRY'
}

/** OpenAI streaming helper — returns a ReadableStream of text chunks */
async function streamOpenAI(context: string, userMessage: string): Promise<ReadableStream<Uint8Array> | null> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return null

    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    const rawBaseUrl = process.env.OPENAI_BASE_URL
    const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1'

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            stream: true,
            messages: [
                { role: 'system', content: buildSystemPrompt() },
                { role: 'user', content: buildChatPrompt(context, userMessage) },
            ],
            max_completion_tokens: 1500,
            temperature: 0.3,
        }),
    })

    if (!response.ok || !response.body) {
        console.error('OpenAI stream error:', response.status, response.statusText)
        return null
    }

    return response.body
}

/** SSE stream parser — converts OpenAI SSE format to plain text chunks */
function createTextStream(openaiStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    let buffer = ''

    return new ReadableStream({
        async start(controller) {
            const reader = openaiStream.getReader()
            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() ?? ''

                    for (const line of lines) {
                        const trimmed = line.trim()
                        if (!trimmed || !trimmed.startsWith('data: ')) continue
                        const data = trimmed.slice(6)
                        if (data === '[DONE]') continue

                        try {
                            const parsed = JSON.parse(data)
                            const content = parsed.choices?.[0]?.delta?.content
                            if (content) {
                                controller.enqueue(encoder.encode(content))
                            }
                        } catch {
                            // Skip malformed chunks
                        }
                    }
                }
            } catch (err) {
                console.error('Stream read error:', err)
            } finally {
                controller.close()
                reader.releaseLock()
            }
        },
    })
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { prompt } = (await req.json()) as { prompt: string }
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
                const currency = mapCurrency(match[2])
                const category = match[3].trim() || 'Gider'
                await prisma.transaction.create({
                    data: { userId: user.id, amount, type: 'EXPENSE', category, description: `AI Chat: ${category}` },
                })
                return NextResponse.json({ text: `✅ ${amount.toLocaleString('tr-TR', { style: 'currency', currency })} gider olarak işlendi.` })
            }
        }

        // AI Chat — streaming response with slim context
        const context = await composeFinancialContext(user.id, 'slim')

        const openaiStream = await streamOpenAI(context, prompt)

        if (!openaiStream) {
            // Fallback: no API key or error — return context-based response
            const lines = context.split('\n').filter((l) => l.trim() && !l.startsWith('===')).slice(0, 12)
            return NextResponse.json({
                text: lines.join('\n') + '\n\n💡 Daha detaylı analiz için Ayarlar sayfasından OpenAI API key ekleyebilirsin.',
            })
        }

        const textStream = createTextStream(openaiStream)

        return new Response(textStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Transfer-Encoding': 'chunked',
            },
        })
    } catch (error) {
        console.error('AI API Error:', error)
        return NextResponse.json({ error: `AI Service Unavailable: ${String(error)}` }, { status: 500 })
    }
}
