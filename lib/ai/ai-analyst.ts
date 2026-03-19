'use server'

import { prisma } from '@/lib/prisma'
import { composeFinancialContext } from '@/lib/ai/context-composer'
import { getSetting } from '@/lib/settings-service'

type RecommendationType = 'STRATEGY' | 'SAVING' | 'WARNING' | 'OPPORTUNITY' | 'MILESTONE' | 'ALERT'

interface ParsedRecommendation {
    type: RecommendationType
    priority: number
    title: string
    content: string
    reasoning?: string
    risk?: string
    suggestedAction?: string
    relatedEntityType?: string
    relatedEntityId?: string
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

    // 3) Finansal veriyi derle (tarihsel veriler dahil)
    const context = await composeFinancialContext(userId)

    // 4) OpenAI'dan Yapılandırılmış Yanıt İste
    const requestedModel = process.env.OPENAI_MODEL ?? 'gpt-5-mini'
    const rawBaseUrl = process.env.OPENAI_BASE_URL
    const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1'

    const systemPrompt = `Sen Ogzie Finans için çalışan gelişmiş yapay zeka analiz motorusun.
Kullanıcının detaylı finansal durumu, tarihsel trendleri ve hedef hızı verilecektir.
Bunu derinlemesine analiz et ve 5-6 farklı, KİŞİSELLEŞTİRİLMİŞ öneri oluştur.

ÖNERİ TİPLERİ (hepsinden en az 1 tane olmalı):
🎯 STRATEGY (priority: 70-90): Borç ödeme stratejisi, bütçe optimizasyonu
💰 SAVING (priority: 50-70): Abonelik iptali, tasarruf fırsatları
⚠️ WARNING (priority: 80-100): Riskler, tehlikeler, dikkat gerektiren durumlar
🚀 OPPORTUNITY (priority: 40-60): Yatırım fırsatı, ekstra ödeme avantajı, büyüme
🏆 MILESTONE (priority: 30-50): Hedef kutlaması, başarı, pozitif gelişme
🚨 ALERT (priority: 90-100): Acil durumlar, kritik vadeler

KURALLAR:
1. VERİ UYDURMAK YASAKTIR - sadece verilen gerçek verileri kullan
2. Tarihsel trendleri MUTLAKAdikkate al (son 3 ay değişimleri)
3. Pattern tespitlerini değerlendir (harcama artışları, yeni abonelikler)
4. Hedef hızı analizini kullan
5. Türkiye ekonomik bağlamını göz önünde bulundur
6. Somut rakamlar ve aksiyon adımları ver
7. Priority değeri: 1-100 arası (yüksek = daha acil)

SADECE JSON döndür, başka hiçbir şey yazma. Markdown kullanma.

{
  "recommendations": [
    {
      "type": "STRATEGY",
      "priority": 75,
      "title": "Kısa ve net başlık",
      "content": "Detaylı açıklama (rakamlarla)",
      "reasoning": "Neden bu öneriyi veriyoruz",
      "suggestedAction": "Hemen yapılabilecek somut adım",
      "risk": "Yapılmazsa ne olur (varsa)",
      "relatedEntityType": "debt|goal|card|subscription (opsiyonel)",
      "relatedEntityId": "ilgili entity id (opsiyonel)"
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
                            type: { type: "string", enum: ["STRATEGY", "SAVING", "WARNING", "OPPORTUNITY", "MILESTONE", "ALERT"] },
                            priority: { type: "number" },
                            title: { type: "string" },
                            content: { type: "string" },
                            reasoning: { type: "string" },
                            suggestedAction: { type: "string" },
                            risk: { type: "string" },
                            relatedEntityType: { type: "string" },
                            relatedEntityId: { type: "string" }
                        },
                        required: ["type", "priority", "title", "content", "reasoning", "suggestedAction", "risk"],
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
                max_completion_tokens: 3000
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
                    max_completion_tokens: 3000
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

        // Veritabanına toplu kaydet (yeni alanlarla)
        if (parsed.recommendations && parsed.recommendations.length > 0) {
            await prisma.aIRecommendation.createMany({
                data: parsed.recommendations.map(rec => ({
                    userId,
                    type: rec.type,
                    priority: rec.priority ?? 50,
                    title: rec.title,
                    content: rec.content,
                    reasoning: rec.reasoning ?? null,
                    risk: rec.risk ?? null,
                    suggestedAction: rec.suggestedAction ?? null,
                    relatedEntityId: rec.relatedEntityId ?? null,
                    relatedEntityType: rec.relatedEntityType ?? null,
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
