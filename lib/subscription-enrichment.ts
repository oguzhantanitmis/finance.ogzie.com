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
    return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeCompactName(name: string) {
    return normalizeName(name).replace(/[^a-z0-9]/g, '')
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

function getFuzzyThreshold(length: number) {
    if (length <= 4) return 0
    if (length <= 7) return 1
    return 2
}

function damerauLevenshtein(a: string, b: string) {
    const rows = a.length + 1
    const cols = b.length + 1
    const matrix = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0))

    for (let i = 0; i < rows; i += 1) {
        matrix[i][0] = i
    }

    for (let j = 0; j < cols; j += 1) {
        matrix[0][j] = j
    }

    for (let i = 1; i < rows; i += 1) {
        for (let j = 1; j < cols; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1

            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost,
            )

            if (
                i > 1 &&
                j > 1 &&
                a[i - 1] === b[j - 2] &&
                a[i - 2] === b[j - 1]
            ) {
                matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost)
            }
        }
    }

    return matrix[a.length][b.length]
}

function findBrandMatch(name: string) {
    const normalized = normalizeName(name)
    const compact = normalizeCompactName(name)

    if (!compact) {
        return null
    }

    let fuzzyMatch:
        | {
            entry: BrandCatalogEntry
            matchType: 'fuzzy'
            shouldCanonicalizeName: true
            distance: number
            keywordLength: number
        }
        | null = null

    for (const entry of BRAND_CATALOG) {
        for (const keyword of entry.keywords) {
            const normalizedKeyword = normalizeName(keyword)
            const compactKeyword = normalizeCompactName(keyword)

            if (!compactKeyword) {
                continue
            }

            if (normalized === normalizedKeyword || compact === compactKeyword) {
                return {
                    entry,
                    matchType: 'exact' as const,
                    shouldCanonicalizeName: true,
                }
            }

            if (normalized.includes(normalizedKeyword) || compact.includes(compactKeyword)) {
                return {
                    entry,
                    matchType: 'contains' as const,
                    shouldCanonicalizeName: false,
                }
            }

            if (compact.length < 5 || compactKeyword.length < 5) {
                continue
            }

            const distance = damerauLevenshtein(compact, compactKeyword)
            const threshold = Math.max(
                getFuzzyThreshold(compact.length),
                getFuzzyThreshold(compactKeyword.length),
            )

            if (distance > threshold) {
                continue
            }

            if (
                !fuzzyMatch ||
                distance < fuzzyMatch.distance ||
                (distance === fuzzyMatch.distance && compactKeyword.length > fuzzyMatch.keywordLength)
            ) {
                fuzzyMatch = {
                    entry,
                    matchType: 'fuzzy',
                    shouldCanonicalizeName: true,
                    distance,
                    keywordLength: compactKeyword.length,
                }
            }
        }
    }

    return fuzzyMatch
}

export function enrichSubscriptionName(name: string): SubscriptionEnrichment {
    const brandMatch = findBrandMatch(name)

    if (brandMatch) {
        const { entry: brand, matchType, shouldCanonicalizeName } = brandMatch
        return {
            brandKey: brand.brandKey,
            displayName: brand.displayName,
            category: brand.category,
            color: brand.color,
            providerDomain: brand.domain,
            logoUrl: buildLogoUrl(brand.domain),
            billingCycle: brand.billingCycle ?? BillingCycle.MONTHLY,
            matchType,
            shouldCanonicalizeName,
        }
    }

    const normalized = normalizeName(name)
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
        matchType: 'generic',
        shouldCanonicalizeName: false,
    }
}
