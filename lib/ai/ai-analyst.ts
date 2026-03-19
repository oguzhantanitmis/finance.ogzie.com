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
    const requestedModel = process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo'
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

    // Denenecek modeller sırası: env model -> gpt-3.5-turbo
    const modelsToTry = [requestedModel]
    if (requestedModel !== 'gpt-3.5-turbo') {
        modelsToTry.push('gpt-3.5-turbo')
    }

    let aiResponse: Response | null = null
    let aiData: any = null
    let lastError: string = ''

    for (const model of modelsToTry) {
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
                max_tokens: 2000
            }),
        })

        aiData = await aiResponse.json()

        if (aiResponse.ok) {
            break // Başarılı, döngüden çık
        }

        // Model erişim hatası varsa sonraki modeli dene
        const errorMsg = aiData?.error?.message || ''
        if (errorMsg.includes('access to model') || errorMsg.includes('does not exist')) {
            console.warn(`Model ${model} erişim hatası, sonraki model deneniyor...`)
            lastError = errorMsg
            continue
        }

        // Başka bir hata varsa döngüden çık
        lastError = errorMsg
        break
    }

    if (!aiResponse?.ok) {
        throw new Error(`OpenAI Hatası: ${lastError || aiResponse?.statusText || 'Bilinmeyen hata'}`)
    }

    try {
        const rawContent = aiData.choices[0].message.content
        const parsed = JSON.parse(rawContent) as { recommendations: ParsedRecommendation[] }

        // 5) Veritabanına toplu kaydet (batch processing)
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
        throw new Error('Yapay zeka analiz sonucu anlaşılamadı. Daha sonra tekrar deneyin.')
    }
}
