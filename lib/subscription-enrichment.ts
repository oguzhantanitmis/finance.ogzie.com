import { BillingCycle } from '@prisma/client'

import type { SubscriptionEnrichment } from '@/lib/finance-os-types'

type BrandCatalogEntry = {
    brandKey: string
    displayName: string
    keywords: string[]
    domain: string
    category: string
    color: string
    billingCycle?: BillingCycle
}

const BRAND_CATALOG: BrandCatalogEntry[] = [
    { brandKey: 'netflix', displayName: 'Netflix', keywords: ['netflix'], domain: 'netflix.com', category: 'Eglence', color: '#E50914' },
    { brandKey: 'spotify', displayName: 'Spotify', keywords: ['spotify'], domain: 'spotify.com', category: 'Eglence', color: '#1ED760' },
    { brandKey: 'youtube-premium', displayName: 'YouTube Premium', keywords: ['youtube premium', 'youtube', 'premium'], domain: 'youtube.com', category: 'Eglence', color: '#FF0033' },
    { brandKey: 'apple-icloud', displayName: 'iCloud+', keywords: ['icloud', 'apple storage', 'apple'], domain: 'apple.com', category: 'Bulut', color: '#A2AAAD' },
    { brandKey: 'figma', displayName: 'Figma', keywords: ['figma'], domain: 'figma.com', category: 'Yazilim', color: '#0ACF83' },
    { brandKey: 'notion', displayName: 'Notion', keywords: ['notion'], domain: 'notion.so', category: 'Yazilim', color: '#FFFFFF' },
    { brandKey: 'chatgpt', displayName: 'ChatGPT', keywords: ['chatgpt', 'openai'], domain: 'openai.com', category: 'Yapay Zeka', color: '#10A37F' },
    { brandKey: 'adobe', displayName: 'Adobe', keywords: ['adobe'], domain: 'adobe.com', category: 'Yazilim', color: '#FA0F00' },
    { brandKey: 'canva', displayName: 'Canva', keywords: ['canva'], domain: 'canva.com', category: 'Yazilim', color: '#7D2AE8' },
    { brandKey: 'amazon-prime', displayName: 'Amazon Prime', keywords: ['amazon prime', 'prime video', 'prime'], domain: 'amazon.com', category: 'Eglence', color: '#00A8E1' },
    { brandKey: 'disney-plus', displayName: 'Disney+', keywords: ['disney', 'disney plus'], domain: 'disneyplus.com', category: 'Eglence', color: '#113CCF' },
    { brandKey: 'microsoft-365', displayName: 'Microsoft 365', keywords: ['office', 'microsoft', 'microsoft 365'], domain: 'microsoft.com', category: 'Yazilim', color: '#5E5E5E' },
]

const GENERIC_CATEGORY_RULES = [
    { match: ['kira'], category: 'Barinma', color: '#EAB308' },
    { match: ['internet', 'turkcell', 'superonline', 'vodafone'], category: 'Fatura', color: '#3B82F6' },
    { match: ['sigorta', 'insurance'], category: 'Sigorta', color: '#06B6D4' },
    { match: ['telefon', 'gsm'], category: 'Fatura', color: '#0EA5E9' },
]

function normalizeName(name: string) {
    return name.trim().toLowerCase()
}

function buildLogoUrl(domain: string) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

function guessDomain(rawName: string) {
    const normalized = rawName.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normalized.length < 4) {
        return undefined
    }

    return `${normalized}.com`
}

export function enrichSubscriptionName(name: string): SubscriptionEnrichment {
    const normalized = normalizeName(name)
    const brand = BRAND_CATALOG.find((entry) =>
        entry.keywords.some((keyword) => normalized.includes(keyword)),
    )

    if (brand) {
        return {
            brandKey: brand.brandKey,
            displayName: brand.displayName,
            category: brand.category,
            color: brand.color,
            providerDomain: brand.domain,
            logoUrl: buildLogoUrl(brand.domain),
            billingCycle: brand.billingCycle ?? BillingCycle.MONTHLY,
        }
    }

    const genericRule = GENERIC_CATEGORY_RULES.find((rule) =>
        rule.match.some((keyword) => normalized.includes(keyword)),
    )

    const guessedDomain = guessDomain(name)

    return {
        displayName: name.trim(),
        category: genericRule?.category ?? 'Genel',
        color: genericRule?.color ?? '#3F3F46',
        providerDomain: guessedDomain,
        logoUrl: guessedDomain ? buildLogoUrl(guessedDomain) : undefined,
        billingCycle: BillingCycle.MONTHLY,
    }
}
