export const BRAND_DOMAINS: Record<string, string> = {
    'netflix': 'netflix.com',
    'spotify': 'spotify.com',
    'youtube': 'youtube.com',
    'premium': 'youtube.com',
    'icloud': 'apple.com',
    'apple': 'apple.com',
    'disney': 'disneyplus.com',
    'amazon': 'amazon.com',
    'prime': 'amazon.com',
    'hbo': 'hbomax.com',
    'blutv': 'blutv.com.tr',
    'gain': 'gain.tv',
    'exxen': 'exxen.com',
    'office': 'microsoft.com',
    'microsoft': 'microsoft.com',
    'adobe': 'adobe.com',
    'figma': 'figma.com',
    'chatgpt': 'openai.com',
    'openai': 'openai.com',
    'midjourney': 'midjourney.com',
    'steam': 'steampowered.com',
    'playstation': 'playstation.com',
    'gamepass': 'xbox.com',
    'xbox': 'xbox.com',
    'mubi': 'mubi.com',
    'audible': 'audible.com',
    'notion': 'notion.so',
    'canva': 'canva.com',
    'zoom': 'zoom.us',
    'slack': 'slack.com',
    'dropbox': 'dropbox.com',
    'google': 'google.com',
    'drive': 'google.com',
    'tabii': 'tabii.com',
    'bein': 'beinconnect.com.tr',
    'twitch': 'twitch.tv',
    'copilot': 'github.com',
    'github': 'github.com',
    'claude': 'claude.ai',
    'anthropic': 'anthropic.com',
    'gemini': 'gemini.google.com',
    'perplexity': 'perplexity.ai',
    'cursor': 'cursor.com',
    'linkedin': 'linkedin.com',
    'twitter': 'x.com',
    'vercel': 'vercel.com',
    'telegram': 'telegram.org',
    'discord': 'discord.com'
}

export function getBrandLogo(name: string): string | null {
    const lowerName = name.toLowerCase()

    // Exact match or partial match in dictionary
    for (const [brand, domain] of Object.entries(BRAND_DOMAINS)) {
        if (lowerName.includes(brand)) {
            return `https://logo.clearbit.com/${domain}`
        }
    }

    // Guess domain if not in dictionary (very basic)
    if (name.length > 3 && !name.includes(' ')) {
        return `https://logo.clearbit.com/${lowerName.replace(/[^a-z0-9]/g, '')}.com`
    }

    return null
}

/**
 * Bilinen bir marka için doğrudan favicon URL'i (Google s2). Eşleşme yoksa null.
 * BrandLogo bununla eski/yanlış kaydedilmiş `logoUrl` değerlerini geçersiz kılar
 * (ör. eski bir kayıt globe döndürüyorsa, isimden tazelenmiş URL kullanılır).
 */
export function brandFaviconFromName(name: string): string | null {
    const lowerName = name.toLowerCase()
    for (const [brand, domain] of Object.entries(BRAND_DOMAINS)) {
        if (lowerName.includes(brand)) {
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
        }
    }
    return null
}

/** İsimden bilinen marka domain'ini bulur (BRAND_DOMAINS kısmi eşleşme). */
export function brandDomainFromName(name: string): string | null {
    const lowerName = name.toLowerCase()
    for (const [brand, domain] of Object.entries(BRAND_DOMAINS)) {
        if (lowerName.includes(brand)) {
            return domain
        }
    }
    return null
}

/**
 * Bir abonelik/marka için sırayla denenecek logo URL'leri (fallback zinciri):
 * Google favicon → DuckDuckGo → Clearbit → kayıtlı (stale olabilen) logoUrl.
 * BrandLogo bir kaynak yüklenmezse (onError) bir sonrakine geçer; hepsi
 * tükenirse baş harf rozetine düşer.
 */
export function brandLogoCandidates(name: string, fallbackSrc?: string | null): string[] {
    const out: string[] = []
    const domain = brandDomainFromName(name)
    if (domain) {
        out.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`)
        out.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`)
        out.push(`https://logo.clearbit.com/${domain}`)
    }
    if (fallbackSrc) {
        out.push(fallbackSrc)
    }
    return [...new Set(out)]
}
