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
 * Kullanıcının verilerini okuyup OpenAI'a gönderir, oradan dönen analizleri
 * AIRecommendation tablosuna kaydeder.
 */
export async function runProactiveAiAnalysis(userId: string) {
    // 1) API Anahtarını kontrol et
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        throw new Error('AI analizi için OPENAI_API_KEY ortam değişkeni bulunamadı.')
    }

    // 2) Önceki analizleri temizle (Sadece 5 gün veya daha eski olanları silebiliriz ya da hepsini ezeriz)
    // Şimdilik temiz, anlık "Snapshot" yaklaşımı uygulayalım.
    await prisma.aIRecommendation.deleteMany({
        where: { userId }
    })

    // 3) Finansal veriyi derle
    const context = await composeFinancialContext(userId)

    // 4) OpenAI'dan Yapılandırılmış Yanıt İste (JSON format)
    const requestedModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini' // veya gpt-5-mini
    const rawBaseUrl = process.env.OPENAI_BASE_URL
    const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1'

    const systemPrompt = `Sen Ogzie Finans için çalışan arka plan zeka motorusun.
Kullanıcının detaylı finansal durumu verilecektir.
Bunu analiz et ve 3 farklı öneri oluştur (STRATEGY, SAVING, WARNING).
Lütfen kesinlikle aşağıdaki JSON yapısında dön (herhangi bir markdown bloğu kullanma, dümdüz saf JSON dön):

{
  "recommendations": [
    {
      "type": "STRATEGY",
      "title": "Strateji Başlığı",
      "content": "Açıklama",
      "reasoning": "Neden bunu öneriyoruz",
      "suggestedAction": "Yapılması gereken",
      "risk": "(Opsiyonel) Risk yoksa boş bırak"
    }
  ]
}`

    let aiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: requestedModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: context },
            ],
            response_format: { type: 'json_object' }
        }),
    })
    
    let aiData = await aiResponse.json()

    if (!aiResponse.ok && (aiData?.error?.message?.includes('access to model') || aiData?.error?.message?.includes('does not exist'))) {
        aiResponse = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: context },
                ],
                response_format: { type: 'json_object' }
            }),
        })
        aiData = await aiResponse.json()
    }

    if (!aiResponse.ok) {
        throw new Error(`OpenAI Hatası: ${aiData?.error?.message || aiResponse.statusText}`)
    }

    try {
        const rawContent = aiData.choices[0].message.content
        const parsed = JSON.parse(rawContent) as { recommendations: ParsedRecommendation[] }

        // 5) Veritabanına kaydet
        if (parsed.recommendations && parsed.recommendations.length > 0) {
            for (const rec of parsed.recommendations) {
                await prisma.aIRecommendation.create({
                    data: {
                        userId,
                        type: rec.type,
                        title: rec.title,
                        content: rec.content,
                        reasoning: rec.reasoning ?? null,
                        risk: rec.risk ?? null,
                        suggestedAction: rec.suggestedAction ?? null,
                        isRead: false,
                        isActedOn: false
                    }
                })
            }
        }
        
        return { success: true, count: parsed.recommendations?.length || 0 }
    } catch (e) {
        console.error('Yapay Zeka JSON ayrıştırma hatası:', e)
        throw new Error('Yapay zeka analiz sonucu anlaşılamadı. Daha sonra tekrar deneyin.')
    }
}
