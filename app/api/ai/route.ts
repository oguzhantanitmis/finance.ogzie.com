import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { prisma } from '@/lib/prisma'
import { composeFinancialContext } from '@/lib/ai/context-composer'
import { buildSystemPrompt, buildChatPrompt } from '@/lib/ai/prompt-builder'
import { getSetting } from '@/lib/settings-service'

export const dynamic = 'force-dynamic'

type CommandType = 'ADD_EXPENSE' | 'ADD_INCOME' | 'QUERY_BALANCE' | 'QUERY_DEBT' | 'QUERY_CARDS' | 'QUERY_HEALTH' | 'QUERY_GOALS' | 'QUERY_ACCOUNTS' | 'QUERY_SUBSCRIPTIONS' | 'GREETING' | 'AI_CHAT' | 'UNKNOWN'

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
                        const requestedModel = process.env.OPENAI_MODEL ?? 'gpt-5.4-mini'
                        const rawBaseUrl = process.env.OPENAI_BASE_URL
                        const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1'
                        
                        let aiResponse = await fetch(`${baseUrl}/chat/completions`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                            body: JSON.stringify({
                                model: requestedModel,
                                messages: [
                                    { role: 'system', content: buildSystemPrompt() },
                                    { role: 'user', content: buildChatPrompt(context, prompt) },
                                ]
                            }),
                        })

                        let aiData = await aiResponse.json()
                        
                        // Fallback: Model erişim hatasında gpt-4o-mini'ye dön
                        if (!aiResponse.ok && (aiData?.error?.message?.includes('access to model') || aiData?.error?.message?.includes('does not exist'))) {
                            console.warn(`Model ${requestedModel} access denied, falling back to gpt-4o-mini...`)
                            aiResponse = await fetch(`${baseUrl}/chat/completions`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                                body: JSON.stringify({
                                    model: 'gpt-4o-mini',
                                    messages: [
                                        { role: 'system', content: buildSystemPrompt() },
                                        { role: 'user', content: buildChatPrompt(context, prompt) },
                                    ],
                                    max_completion_tokens: 4096
                                }),
                            })
                            aiData = await aiResponse.json()
                        }
                        


                        if (!aiResponse.ok) {
                            console.error('OpenAI API Error:', aiData)
                            responseText = `API Hatası: ${aiData?.error?.message || 'Bilinmeyen proxy/API hatası. (HTTP ' + aiResponse.status + ')'}`
                        } else {
                            responseText = aiData.choices?.[0]?.message?.content ?? 'Yanıt alınamadı.'
                        }
                    } catch (aiError) {
                        console.error('OpenAI Error:', aiError)
                        responseText = `⚠️ AI servisi şu an yanıt veremiyor (Base URL hatalı olabilir). Hataya rağmen verilerine bakayım:\n\n${generateFallbackAnalysis(context)}`
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
                        const requestedModel = process.env.OPENAI_MODEL ?? 'gpt-5-mini'
                        const rawBaseUrl = process.env.OPENAI_BASE_URL
                        const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1'

                        let aiResponse = await fetch(`${baseUrl}/chat/completions`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                            body: JSON.stringify({
                                model: requestedModel,
                                messages: [
                                    { role: 'system', content: buildSystemPrompt() },
                                    { role: 'user', content: buildChatPrompt(context, prompt) },
                                ]
                            }),
                        })
                        let aiData = await aiResponse.json()

                        if (!aiResponse.ok && (aiData?.error?.message?.includes('access to model') || aiData?.error?.message?.includes('does not exist'))) {
                            console.warn(`Model ${requestedModel} failed, falling back to gpt-3.5-turbo...`)
                            aiResponse = await fetch(`${baseUrl}/chat/completions`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                                body: JSON.stringify({
                                    model: 'gpt-3.5-turbo',
                                    messages: [
                                        { role: 'system', content: buildSystemPrompt() },
                                        { role: 'user', content: buildChatPrompt(context, prompt) },
                                    ]
                                }),
                            })
                            aiData = await aiResponse.json()
                        }

                        if (!aiResponse.ok) {
                            console.error('OpenAI API Error:', aiData)
                            responseText = `API Hatası: ${aiData?.error?.message || 'Bilinmeyen proxy/API hatası. (HTTP ' + aiResponse.status + ')'}`
                        } else {
                            responseText = aiData.choices?.[0]?.message?.content ?? 'Yanıt alınamadı.'
                        }
                    } catch (aiError) {
                        console.error('OpenAI Error:', aiError)
                        responseText = `⚠️ AI servisi şu an yanıt veremiyor (Base URL hatalı olabilir). Hataya rağmen verilerine bakayım:\n\n${generateContextResponse(commandType, context, summary)}`
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
