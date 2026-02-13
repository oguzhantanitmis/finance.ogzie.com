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
    'drive': 'google.com'
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
