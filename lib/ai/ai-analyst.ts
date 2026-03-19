'use server'

import { prisma } from '@/lib/prisma'
import { composeFinancialContext } from '@/lib/ai/context-composer'
import { getSetting } from '@/lib/settings-service'

interface ParsedRecommendation {
    type: 'STRATEGY' | 'SAVING' | 'WARNING'
    title: string
    content: string
    reasoning?: string
    risk?: string
    suggestedAction?: string
}

/**
 * JSON içeriğini temizle (markdown blokları vs.)
 */
function cleanJsonResponse(content: string): string {
    let cleaned = content.trim()
    // Markdown code block'larını temizle
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7)
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3)
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3)
    }
    return cleaned.trim()
}

/**
 * Kullanıcının verilerini okuyup OpenAI'a gönderir, oradan dönen analizleri
 * AIRecommendation tablosuna kaydeder.
 */
export async function runProactiveAiAnalysis(userId: string) {
    // 1) API Anahtarını kontrol et
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        throw new Error('AI analizi için OPENAI_API_KEY ortam değişkeni bulunamadı.')
    }

    // 2) Önceki analizleri temizle
    await prisma.aIRecommendation.deleteMany({
        where: { userId }
    })

    // 3) Finansal veriyi derle
    const context = await composeFinancialContext(userId)

    // 4) OpenAI'dan Yapılandırılmış Yanıt İste
    const requestedModel = process.env.OPENAI_MODEL ?? 'gpt-5-mini'
    const rawBaseUrl = process.env.OPENAI_BASE_URL
    const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1'

    const systemPrompt = `Sen Ogzie Finans için çalışan arka plan zeka motorusun.
Kullanıcının detaylı finansal durumu verilecektir.
Bunu analiz et ve 3 farklı öneri oluştur (STRATEGY, SAVING, WARNING).
SADECE JSON döndür, başka hiçbir şey yazma. Markdown kullanma.

{
  "recommendations": [
    {
      "type": "STRATEGY",
      "title": "Strateji Başlığı",
      "content": "Açıklama",
      "reasoning": "Neden bunu öneriyoruz",
      "suggestedAction": "Yapılması gereken",
      "risk": ""
    }
  ]
}`

    // JSON Schema for structured output
    const jsonSchema = {
        name: "financial_recommendations",
        strict: true,
        schema: {
            type: "object",
            properties: {
                recommendations: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["STRATEGY", "SAVING", "WARNING"] },
                            title: { type: "string" },
                            content: { type: "string" },
                            reasoning: { type: "string" },
                            suggestedAction: { type: "string" },
                            risk: { type: "string" }
                        },
                        required: ["type", "title", "content", "reasoning", "suggestedAction", "risk"],
                        additionalProperties: false
                    }
                }
            },
            required: ["recommendations"],
            additionalProperties: false
        }
    }

    // Denenecek modeller
    const modelsToTry = [requestedModel]
    if (requestedModel !== 'gpt-5-mini') {
        modelsToTry.push('gpt-5-mini')
    }

    let aiResponse: Response | null = null
    let aiData: any = null
    let lastError: string = ''

    for (const model of modelsToTry) {
        // Önce json_schema ile dene
        aiResponse = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: context },
                ],
                response_format: {
                    type: 'json_schema',
                    json_schema: jsonSchema
                },
                max_completion_tokens: 2000
            }),
        })

        aiData = await aiResponse.json()

        // json_schema desteklenmiyorsa json_object ile dene
        if (!aiResponse.ok && aiData?.error?.message?.includes('response_format')) {
            console.warn('json_schema desteklenmiyor, json_object deneniyor...')
            aiResponse = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: context },
                    ],
                    response_format: { type: 'json_object' },
                    max_completion_tokens: 2000
                }),
            })
            aiData = await aiResponse.json()
        }

        if (aiResponse.ok) {
            break
        }

        const errorMsg = aiData?.error?.message || ''
        if (errorMsg.includes('access to model') || errorMsg.includes('does not exist')) {
            console.warn(`Model ${model} erişim hatası, sonraki model deneniyor...`)
            lastError = errorMsg
            continue
        }

        lastError = errorMsg
        break
    }

    if (!aiResponse?.ok) {
        throw new Error(`OpenAI Hatası: ${lastError || aiResponse?.statusText || 'Bilinmeyen hata'}`)
    }

    try {
        const rawContent = aiData.choices[0].message.content
        console.log('AI Raw Response:', rawContent?.substring(0, 500))

        const cleanedContent = cleanJsonResponse(rawContent)
        const parsed = JSON.parse(cleanedContent) as { recommendations: ParsedRecommendation[] }

        // Veritabanına toplu kaydet
        if (parsed.recommendations && parsed.recommendations.length > 0) {
            await prisma.aIRecommendation.createMany({
                data: parsed.recommendations.map(rec => ({
                    userId,
                    type: rec.type,
                    title: rec.title,
                    content: rec.content,
                    reasoning: rec.reasoning ?? null,
                    risk: rec.risk ?? null,
                    suggestedAction: rec.suggestedAction ?? null,
                    isRead: false,
                    isActedOn: false
                }))
            })
        }

        return { success: true, count: parsed.recommendations?.length || 0 }
    } catch (e) {
        console.error('Yapay Zeka JSON ayrıştırma hatası:', e)
        console.error('Raw content:', aiData?.choices?.[0]?.message?.content)
        throw new Error('Yapay zeka analiz sonucu anlaşılamadı. Daha sonra tekrar deneyin.')
    }
}
