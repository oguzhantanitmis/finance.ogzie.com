import type { Prisma } from '@prisma/client'

import { PRIMARY_SUPERUSER_EMAIL } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { getSecureSetting, getSetting, setSetting } from '@/lib/settings-service'

export type EvdsTickerCode = 'USDTRY' | 'EURTRY' | 'GBPTRY' | 'XAU_GRAM' | 'XAU_REPUBLIC'

export interface EvdsSeriesConfig {
    code: EvdsTickerCode
    label: string
    enabled: boolean
    buySeriesCode: string
    sellSeriesCode: string
}

export interface EvdsSettings {
    hasApiKey: boolean
    apiKeySource: 'environment' | 'user' | 'none'
    cacheMinutes: number
    series: EvdsSeriesConfig[]
}

export interface MarketTickerItem {
    code: string
    label: string
    buyRate: number | null
    sellRate: number | null
    rateDate: string | null
    updatedAt: string | null
    previousSellRate: number | null
    changePercent: number | null
    stale: boolean
    warning?: string
}

export interface MarketTickerResult {
    status: 'missing_key' | 'invalid_key' | 'ok' | 'stale' | 'empty' | 'error'
    message: string
    lastUpdatedAt: string | null
    cacheMinutes: number
    items: MarketTickerItem[]
}

const COLLECTAPI_BASE_URL = 'https://api.collectapi.com'
const COLLECTAPI_SOURCE = 'COLLECTAPI_ECONOMY'
const COLLECTAPI_EMPTY_SOURCE = 'COLLECTAPI_EMPTY'

const SETTINGS_KEYS = {
    apiKey: 'collectapi.apiKey',
    cacheMinutes: 'collectapi.cacheMinutes',
    seriesConfig: 'collectapi.seriesConfig',
}

const LEGACY_SETTINGS_KEYS = {
    cacheMinutes: 'evds.cacheMinutes',
    seriesConfig: 'evds.seriesConfig',
}

function getEnvironmentCollectApiKey() {
    const value = process.env.COLLECTAPI_API_KEY ?? process.env.COLLECT_API_KEY ?? ''
    return value.trim() || null
}

export async function getCollectApiSettingsOwnerId(userId: string) {
    const primarySuperuser = await prisma.user.findUnique({
        where: { email: PRIMARY_SUPERUSER_EMAIL },
        select: { id: true },
    })

    return primarySuperuser?.id ?? userId
}

export const DEFAULT_EVDS_SERIES: EvdsSeriesConfig[] = [
    {
        code: 'USDTRY',
        label: 'Dolar',
        enabled: true,
        buySeriesCode: 'USD',
        sellSeriesCode: 'USD',
    },
    {
        code: 'EURTRY',
        label: 'Euro',
        enabled: true,
        buySeriesCode: 'EUR',
        sellSeriesCode: 'EUR',
    },
    {
        code: 'GBPTRY',
        label: 'Sterlin',
        enabled: true,
        buySeriesCode: 'GBP',
        sellSeriesCode: 'GBP',
    },
    {
        code: 'XAU_GRAM',
        label: 'Gram Altın',
        enabled: true,
        buySeriesCode: 'gram-altin',
        sellSeriesCode: 'gram-altin',
    },
    {
        code: 'XAU_REPUBLIC',
        label: 'Cumhuriyet Altını',
        enabled: false,
        buySeriesCode: 'cumhuriyet-altini',
        sellSeriesCode: 'cumhuriyet-altini',
    },
]

const SERIES_DEFAULTS = new Map(DEFAULT_EVDS_SERIES.map((series) => [series.code, series]))
const COLLECTAPI_RATE_SOURCES = [COLLECTAPI_SOURCE, COLLECTAPI_EMPTY_SOURCE]

class CollectApiError extends Error {
    statusCode?: number
    invalidAuth: boolean

    constructor(message: string, options: { statusCode?: number, invalidAuth?: boolean } = {}) {
        super(message)
        this.name = 'CollectApiError'
        this.statusCode = options.statusCode
        this.invalidAuth = Boolean(options.invalidAuth)
    }
}

function normalizeSearchText(value: unknown) {
    return String(value ?? '')
        .toLocaleLowerCase('tr-TR')
        .replaceAll('ı', 'i')
        .replaceAll('İ', 'i')
        .replaceAll('ğ', 'g')
        .replaceAll('ü', 'u')
        .replaceAll('ş', 's')
        .replaceAll('ö', 'o')
        .replaceAll('ç', 'c')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

function parseNumber(value: unknown) {
    if (value === null || value === undefined || value === '' || value === '-') return null
    const raw = String(value).trim().replace(/\s/g, '')
    if (!raw || raw === '-') return null

    const lastComma = raw.lastIndexOf(',')
    const lastDot = raw.lastIndexOf('.')
    let normalized = raw

    if (lastComma > -1 && lastDot > -1) {
        normalized = lastComma > lastDot
            ? raw.replaceAll('.', '').replace(',', '.')
            : raw.replaceAll(',', '')
    } else if (lastComma > -1) {
        normalized = raw.replace(',', '.')
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
}

function normalizeCacheMinutes(value: unknown) {
    const parsed = Number(value ?? 180)
    if (!Number.isFinite(parsed)) return 180
    return Math.min(1440, Math.max(15, Math.trunc(parsed)))
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function isLegacyEvdsCode(value: string) {
    return value.toLocaleUpperCase('tr-TR').startsWith('TP.')
}

function normalizeSeriesConfigItem(defaults: EvdsSeriesConfig, item?: Partial<EvdsSeriesConfig>) {
    const incomingBuy = String(item?.buySeriesCode ?? defaults.buySeriesCode ?? '').trim()
    const incomingSell = String(item?.sellSeriesCode ?? defaults.sellSeriesCode ?? '').trim()
    const buySeriesCode = !incomingBuy || isLegacyEvdsCode(incomingBuy) ? defaults.buySeriesCode : incomingBuy
    const sellSeriesCode = !incomingSell || isLegacyEvdsCode(incomingSell) ? defaults.sellSeriesCode : incomingSell

    return {
        ...defaults,
        ...item,
        code: defaults.code,
        label: String(item?.label ?? defaults.label).trim() || defaults.label,
        enabled: Boolean(item?.enabled),
        buySeriesCode,
        sellSeriesCode,
    }
}

function parseSeriesConfig(raw: string | null): EvdsSeriesConfig[] {
    if (!raw) return DEFAULT_EVDS_SERIES
    try {
        const parsed = JSON.parse(raw) as Partial<EvdsSeriesConfig>[]
        return DEFAULT_EVDS_SERIES.map((defaults) => {
            const item = Array.isArray(parsed) ? parsed.find((entry) => entry.code === defaults.code) : undefined
            return normalizeSeriesConfigItem(defaults, item)
        })
    } catch {
        return DEFAULT_EVDS_SERIES
    }
}

function getEnabledSeries(settings: EvdsSettings) {
    return settings.series.filter((series) => series.enabled)
}

function hasAnyRate(items: MarketTickerItem[]) {
    return items.some((item) => item.buyRate !== null || item.sellRate !== null)
}

function hasRate(item: MarketTickerItem) {
    return item.buyRate !== null || item.sellRate !== null
}

function getLastUpdatedAt(items: MarketTickerItem[]) {
    return items
        .map((item) => item.updatedAt ? new Date(item.updatedAt).getTime() : 0)
        .filter(Boolean)
        .sort((a, b) => b - a)[0] ?? null
}

function getMissingRateCount(items: MarketTickerItem[]) {
    return items.filter((item) => !hasRate(item)).length
}

function getResultLastUpdatedAt(items: MarketTickerItem[]) {
    const lastUpdated = getLastUpdatedAt(items)
    return lastUpdated ? new Date(lastUpdated).toISOString() : null
}

function markStoredRatesStale(items: MarketTickerItem[], warning: string) {
    return items.map((item) => hasRate(item)
        ? { ...item, stale: true, warning }
        : item)
}

function getSeriesProviderKey(series: EvdsSeriesConfig) {
    return series.sellSeriesCode || series.buySeriesCode || SERIES_DEFAULTS.get(series.code)?.sellSeriesCode || series.code
}

function getSeriesDatabaseCode(series: EvdsSeriesConfig) {
    return [series.buySeriesCode, series.sellSeriesCode].filter(Boolean).join('|') || getSeriesProviderKey(series)
}

function isGoldSeries(series: EvdsSeriesConfig) {
    return series.code === 'XAU_GRAM' || series.code === 'XAU_REPUBLIC'
}

function isCurrencySeries(series: EvdsSeriesConfig) {
    return series.code === 'USDTRY' || series.code === 'EURTRY' || series.code === 'GBPTRY'
}

function extractRows(raw: unknown): Record<string, unknown>[] {
    if (!raw || typeof raw !== 'object') return []
    const result = (raw as { result?: unknown }).result
    if (Array.isArray(result)) return result.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    if (result && typeof result === 'object' && !Array.isArray(result)) {
        const data = (result as { data?: unknown }).data
        if (Array.isArray(data)) return data.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
        return [result as Record<string, unknown>]
    }
    return []
}

function getRowSearchText(row: Record<string, unknown>) {
    return normalizeSearchText(Object.entries(row)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `${key} ${String(value)}`)
        .join(' '))
}

function pickNumber(row: Record<string, unknown>, keys: string[]) {
    const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeSearchText(key), value] as const)
    for (const key of keys) {
        const normalizedKey = normalizeSearchText(key)
        const direct = parseNumber(row[key])
        if (direct !== null) return direct
        const entry = normalizedEntries.find(([candidate]) => candidate === normalizedKey)
        const parsed = parseNumber(entry?.[1])
        if (parsed !== null) return parsed
    }
    return null
}

function parseCollectApiDate(row: Record<string, unknown>) {
    const rawValue = ['datetime', 'date', 'lastupdate', 'lastUpdate', 'updatedAt', 'updatetime', 'time']
        .map((key) => row[key])
        .find((value) => value !== null && value !== undefined && String(value).trim())

    if (!rawValue) return new Date()

    const raw = String(rawValue).trim()
    const timeOnly = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (timeOnly) {
        const date = new Date()
        date.setHours(Number(timeOnly[1]), Number(timeOnly[2]), Number(timeOnly[3] ?? 0), 0)
        return date
    }

    const parsed = new Date(raw)
    if (Number.isFinite(parsed.getTime())) return parsed

    const normalized = new Date(raw.replace(' ', 'T'))
    return Number.isFinite(normalized.getTime()) ? normalized : new Date()
}

function formatCollectApiAuthorization(apiKey: string) {
    const trimmed = apiKey.trim()
    return /^(apikey|bearer)\s+/i.test(trimmed) ? trimmed : `apikey ${trimmed}`
}

function getCollectApiSerbestPiyasaEndpoint(series: EvdsSeriesConfig) {
    const base = encodeURIComponent(getSeriesProviderKey(series))
    return isGoldSeries(series)
        ? `/economy/serbestPiyasa?base=${base}&type=gold`
        : `/economy/serbestPiyasa?base=${base}`
}

async function fetchCollectApi(endpoint: string, apiKey: string) {
    const response = await fetch(`${COLLECTAPI_BASE_URL}${endpoint}`, {
        cache: 'no-store',
        headers: {
            Accept: 'application/json',
            Authorization: formatCollectApiAuthorization(apiKey),
            'Content-Type': 'application/json',
            'User-Agent': 'OgzieFinance/1.0',
        },
    })

    const responseText = await response.text()
    if (!response.ok) {
        throw new CollectApiError(`CollectAPI ${endpoint} HTTP ${response.status}`, {
            statusCode: response.status,
            invalidAuth: response.status === 401 || response.status === 403,
        })
    }

    try {
        const raw = JSON.parse(responseText) as { success?: boolean, message?: string, error?: string }
        if (raw.success === false) {
            const message = raw.message || raw.error || 'CollectAPI isteği başarısız.'
            throw new CollectApiError(message, { invalidAuth: /token|auth|api.?key|yetki|izin/i.test(message) })
        }
        return raw
    } catch (error) {
        if (error instanceof CollectApiError) throw error
        throw new CollectApiError('CollectAPI JSON yanıtı okunamadı.')
    }
}

function matchesCurrencyRow(row: Record<string, unknown>, series: EvdsSeriesConfig) {
    const text = getRowSearchText(row)
    const providerKey = normalizeSearchText(getSeriesProviderKey(series)).replace(/\s/g, '')
    const currencyCode = series.code.replace('TRY', '')
    const expectedCode = normalizeSearchText(providerKey || currencyCode)

    if (text.split(' ').includes(expectedCode)) return true
    if (text.includes(normalizeSearchText(currencyCode))) return true

    if (series.code === 'USDTRY') return text.includes('dolar') || text.includes('american dollar') || text.includes('us dollar')
    if (series.code === 'EURTRY') return text.includes('euro')
    if (series.code === 'GBPTRY') return text.includes('sterlin') || text.includes('pound') || text.includes('british')
    return false
}

function matchesGoldRow(row: Record<string, unknown>, series: EvdsSeriesConfig) {
    const text = getRowSearchText(row)
    const providerKey = normalizeSearchText(getSeriesProviderKey(series))

    if (providerKey && text.includes(providerKey)) return true
    if (providerKey && text.includes(providerKey.replace(/\s+/g, ' '))) return true

    if (series.code === 'XAU_GRAM') {
        return text.includes('gram altin') && !text.includes('gram has')
    }

    if (series.code === 'XAU_REPUBLIC') {
        return text.includes('cumhuriyet') || text.includes('ata lira') || text.includes('ata altin')
    }

    return false
}

function findCollectApiRow(rows: Record<string, unknown>[], series: EvdsSeriesConfig) {
    return rows.find((row) => isGoldSeries(series)
        ? matchesGoldRow(row, series)
        : matchesCurrencyRow(row, series))
}

async function fetchCollectApiSeriesFallback(series: EvdsSeriesConfig, apiKey: string) {
    const endpoint = getCollectApiSerbestPiyasaEndpoint(series)
    const rows = extractRows(await fetchCollectApi(endpoint, apiKey))
    const row = findCollectApiRow(rows, series) ?? rows[0]
    return row ? { endpoint, row } : null
}

function parseCollectApiRates(row: Record<string, unknown>, series: EvdsSeriesConfig) {
    const buyKeys = isGoldSeries(series)
        ? ['buy', 'buying', 'buyingstr', 'buyingStr', 'alış', 'alis']
        : ['buying', 'buyingstr', 'buyingStr', 'buy', 'alış', 'alis']
    const sellKeys = isGoldSeries(series)
        ? ['sell', 'selling', 'sellingstr', 'sellingStr', 'satış', 'satis']
        : ['selling', 'sellingstr', 'sellingStr', 'sell', 'satış', 'satis']

    const buyRate = pickNumber(row, buyKeys)
    const sellRate = pickNumber(row, sellKeys)

    return {
        buyRate,
        sellRate: sellRate ?? buyRate,
    }
}

async function getEvdsSettingsUpdatedAt(userId: string) {
    const settingsOwnerId = await getCollectApiSettingsOwnerId(userId)
    const latestSetting = await prisma.appSettings.findFirst({
        where: {
            userId: settingsOwnerId,
            key: { in: Object.values(SETTINGS_KEYS) },
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
    })

    return latestSetting?.updatedAt ?? null
}

async function getEvdsApiKeyState(userId: string) {
    const environmentApiKey = getEnvironmentCollectApiKey()
    if (environmentApiKey) {
        return { status: 'ok' as const, apiKey: environmentApiKey }
    }

    const settingsOwnerId = await getCollectApiSettingsOwnerId(userId)
    const raw = await getSetting(settingsOwnerId, SETTINGS_KEYS.apiKey)
    if (!raw) {
        return { status: 'missing' as const, apiKey: null }
    }

    try {
        const apiKey = await getSecureSetting(settingsOwnerId, SETTINGS_KEYS.apiKey)
        return apiKey
            ? { status: 'ok' as const, apiKey }
            : { status: 'missing' as const, apiKey: null }
    } catch {
        return { status: 'invalid' as const, apiKey: null }
    }
}

export async function getEvdsSettings(userId: string): Promise<EvdsSettings> {
    const settingsOwnerId = await getCollectApiSettingsOwnerId(userId)
    const [apiKey, cacheRaw, legacyCacheRaw, seriesRaw, legacySeriesRaw] = await Promise.all([
        getSecureSetting(settingsOwnerId, SETTINGS_KEYS.apiKey).catch(() => null),
        getSetting(settingsOwnerId, SETTINGS_KEYS.cacheMinutes),
        getSetting(settingsOwnerId, LEGACY_SETTINGS_KEYS.cacheMinutes),
        getSetting(settingsOwnerId, SETTINGS_KEYS.seriesConfig),
        getSetting(settingsOwnerId, LEGACY_SETTINGS_KEYS.seriesConfig),
    ])

    const environmentApiKey = getEnvironmentCollectApiKey()
    const cacheMinutes = normalizeCacheMinutes(cacheRaw ?? legacyCacheRaw ?? 180)

    return {
        hasApiKey: Boolean(environmentApiKey || apiKey),
        apiKeySource: environmentApiKey ? 'environment' : apiKey ? 'user' : 'none',
        cacheMinutes,
        series: parseSeriesConfig(seriesRaw ?? legacySeriesRaw),
    }
}

export async function saveEvdsSettings(
    userId: string,
    data: {
        apiKey?: string
        keepExistingApiKey?: boolean
        cacheMinutes: number
        series: EvdsSeriesConfig[]
    },
) {
    if (data.apiKey && data.apiKey.trim()) {
        await setSetting(userId, SETTINGS_KEYS.apiKey, data.apiKey.trim(), true)
    } else if (!data.keepExistingApiKey) {
        await setSetting(userId, SETTINGS_KEYS.apiKey, '', false)
    }

    await Promise.all([
        setSetting(userId, SETTINGS_KEYS.cacheMinutes, String(normalizeCacheMinutes(data.cacheMinutes))),
        setSetting(userId, SETTINGS_KEYS.seriesConfig, JSON.stringify(data.series.map((series) => {
            const defaults = SERIES_DEFAULTS.get(series.code)
            return defaults ? normalizeSeriesConfigItem(defaults, series) : series
        }))),
    ])
}

async function getLatestStoredRates(userId: string, settings: EvdsSettings): Promise<MarketTickerItem[]> {
    const enabled = getEnabledSeries(settings)
    const items: MarketTickerItem[] = []

    for (const series of enabled) {
        const latest = await prisma.marketRate.findFirst({
            where: {
                userId,
                source: COLLECTAPI_SOURCE,
                currencyCode: series.code,
                OR: [
                    { buyRate: { not: null } },
                    { sellRate: { not: null } },
                ],
            },
            orderBy: [{ rateDate: 'desc' }, { createdAt: 'desc' }],
        })
        const latestAttempt = latest ?? await prisma.marketRate.findFirst({
            where: { userId, currencyCode: series.code, source: { in: COLLECTAPI_RATE_SOURCES } },
            orderBy: [{ createdAt: 'desc' }, { rateDate: 'desc' }],
        })

        const previous = latest
            ? await prisma.marketRate.findFirst({
                where: {
                    userId,
                    source: COLLECTAPI_SOURCE,
                    currencyCode: series.code,
                    rateDate: { lt: latest.rateDate },
                    OR: [
                        { buyRate: { not: null } },
                        { sellRate: { not: null } },
                    ],
                },
                orderBy: [{ rateDate: 'desc' }, { createdAt: 'desc' }],
            })
            : null

        const latestValue = latest?.sellRate ?? latest?.buyRate ?? null
        const previousValue = previous?.sellRate ?? previous?.buyRate ?? null
        const changePercent = latestValue !== null && previousValue !== null && previousValue !== 0
            ? +(((latestValue - previousValue) / previousValue) * 100).toFixed(2)
            : null

        items.push({
            code: series.code,
            label: series.label,
            buyRate: latest?.buyRate ?? null,
            sellRate: latest?.sellRate ?? null,
            rateDate: latest?.rateDate.toISOString() ?? null,
            updatedAt: latestAttempt?.createdAt.toISOString() ?? null,
            previousSellRate: previousValue,
            changePercent,
            stale: false,
            warning: latest
                ? undefined
                : latestAttempt
                    ? 'CollectAPI denendi ancak bu kart için değer bulunamadı.'
                    : 'Aktif kart, ancak CollectAPI henüz bu veri için değer döndürmedi.',
        })
    }

    return items
}

function shouldRefresh(items: MarketTickerItem[], cacheMinutes: number, settingsUpdatedAt: Date | null = null) {
    if (items.length === 0) return true
    if (items.some((item) => !hasRate(item) && !item.updatedAt)) return true
    const lastUpdated = getLastUpdatedAt(items)
    if (!lastUpdated) return true
    if (settingsUpdatedAt && settingsUpdatedAt.getTime() > lastUpdated) return true
    return Date.now() - lastUpdated > cacheMinutes * 60 * 1000
}

async function hasStoredRateForSeries(userId: string, currencyCode: EvdsTickerCode) {
    const existing = await prisma.marketRate.findFirst({
        where: {
            userId,
            source: COLLECTAPI_SOURCE,
            currencyCode,
            OR: [
                { buyRate: { not: null } },
                { sellRate: { not: null } },
            ],
        },
        select: { id: true },
    })

    return Boolean(existing)
}

function getAttemptDate() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

async function recordEmptyRateAttempt(userId: string, series: EvdsSeriesConfig, reason: string) {
    const hasStoredRate = await hasStoredRateForSeries(userId, series.code)
    if (hasStoredRate) return

    const rateDate = getAttemptDate()
    await prisma.marketRate.upsert({
        where: {
            userId_source_currencyCode_seriesCode_rateDate: {
                userId,
                source: COLLECTAPI_EMPTY_SOURCE,
                currencyCode: series.code,
                seriesCode: getSeriesDatabaseCode(series),
                rateDate,
            },
        },
        create: {
            userId,
            source: COLLECTAPI_EMPTY_SOURCE,
            currencyCode: series.code,
            seriesCode: getSeriesDatabaseCode(series),
            buyRate: null,
            sellRate: null,
            rateDate,
            rawResponse: toJsonValue({ reason }),
        },
        update: {
            rawResponse: toJsonValue({ reason }),
        },
    })
}

function isCollectApiAuthError(error: unknown) {
    return error instanceof CollectApiError && error.invalidAuth
}

async function storeCollectApiRate(userId: string, series: EvdsSeriesConfig, row: Record<string, unknown>, endpoint: string) {
    const parsed = parseCollectApiRates(row, series)
    if (parsed.buyRate === null && parsed.sellRate === null) {
        await recordEmptyRateAttempt(userId, series, 'CollectAPI row matched but did not include a usable rate.')
        return false
    }

    const rateDate = parseCollectApiDate(row)
    await prisma.marketRate.upsert({
        where: {
            userId_source_currencyCode_seriesCode_rateDate: {
                userId,
                source: COLLECTAPI_SOURCE,
                currencyCode: series.code,
                seriesCode: getSeriesDatabaseCode(series),
                rateDate,
            },
        },
        create: {
            userId,
            source: COLLECTAPI_SOURCE,
            currencyCode: series.code,
            seriesCode: getSeriesDatabaseCode(series),
            buyRate: parsed.buyRate,
            sellRate: parsed.sellRate,
            rateDate,
            rawResponse: toJsonValue({ endpoint, row }),
        },
        update: {
            buyRate: parsed.buyRate,
            sellRate: parsed.sellRate,
            rawResponse: toJsonValue({ endpoint, row }),
        },
    })

    return true
}

export async function refreshEvdsRates(userId: string): Promise<MarketTickerResult> {
    const settings = await getEvdsSettings(userId)
    const apiKeyState = await getEvdsApiKeyState(userId)

    if (apiKeyState.status === 'invalid') {
        const items = await getLatestStoredRates(userId, settings)
        return {
            status: hasAnyRate(items) ? 'stale' : 'invalid_key',
            message: hasAnyRate(items)
                ? 'CollectAPI API anahtarı çözülemedi. Son başarılı veri gösteriliyor.'
                : 'CollectAPI API anahtarı çözülemedi. Lütfen Ayarlar > CollectAPI bölümünden API anahtarını yeniden kaydedin.',
            lastUpdatedAt: getResultLastUpdatedAt(items),
            cacheMinutes: settings.cacheMinutes,
            items: hasAnyRate(items) ? markStoredRatesStale(items, 'Son başarılı CollectAPI verisi') : items,
        }
    }

    if (!apiKeyState.apiKey) {
        const items = await getLatestStoredRates(userId, settings)
        return {
            status: 'missing_key',
            message: 'CollectAPI API anahtarı girilmedi.',
            lastUpdatedAt: getResultLastUpdatedAt(items),
            cacheMinutes: settings.cacheMinutes,
            items,
        }
    }

    const enabled = getEnabledSeries(settings)
    if (enabled.length === 0) {
        return {
            status: 'empty',
            message: 'Gösterilecek piyasa kartı seçilmedi.',
            lastUpdatedAt: null,
            cacheMinutes: settings.cacheMinutes,
            items: [],
        }
    }

    const needsCurrency = enabled.some(isCurrencySeries)
    const needsGold = enabled.some(isGoldSeries)

    try {
        const [currencyResult, goldResult] = await Promise.allSettled([
            needsCurrency ? fetchCollectApi('/economy/allCurrency', apiKeyState.apiKey) : Promise.resolve(null),
            needsGold ? fetchCollectApi('/economy/goldPrice', apiKeyState.apiKey) : Promise.resolve(null),
        ])

        const endpointErrors = [currencyResult, goldResult]
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .map((result) => result.reason)
        const currencyRows = currencyResult.status === 'fulfilled' ? extractRows(currencyResult.value) : []
        const goldRows = goldResult.status === 'fulfilled' ? extractRows(goldResult.value) : []
        let storedCount = 0

        for (const series of enabled) {
            const rows = isGoldSeries(series) ? goldRows : currencyRows
            let endpoint = isGoldSeries(series) ? '/economy/goldPrice' : '/economy/allCurrency'
            let row = findCollectApiRow(rows, series)

            if (!row) {
                const fallback = await fetchCollectApiSeriesFallback(series, apiKeyState.apiKey)
                    .catch((error) => {
                        endpointErrors.push(error)
                        return null
                    })

                if (fallback) {
                    endpoint = fallback.endpoint
                    row = fallback.row
                }
            }

            if (!row) {
                await recordEmptyRateAttempt(userId, series, `CollectAPI ${endpoint} and ${getCollectApiSerbestPiyasaEndpoint(series)} responses did not include ${series.code}.`)
                continue
            }

            const stored = await storeCollectApiRate(userId, series, row, endpoint)
            if (stored) storedCount += 1
        }

        const items = await getLatestStoredRates(userId, settings)
        const authError = endpointErrors.find(isCollectApiAuthError)
        if (authError && storedCount === 0 && !hasAnyRate(items)) {
            throw authError
        }

        if (endpointErrors.length > 0 && storedCount === 0 && !hasAnyRate(items)) {
            throw endpointErrors[0]
        }

        if (storedCount === 0 && !hasAnyRate(items)) {
            return {
                status: 'empty',
                message: 'CollectAPI bağlantısı başarılı ancak seçili kartlar için veri bulunamadı.',
                lastUpdatedAt: null,
                cacheMinutes: settings.cacheMinutes,
                items,
            }
        }

        const missingRateCount = getMissingRateCount(items)

        return {
            status: 'ok',
            message: missingRateCount > 0
                ? `Piyasa verileri CollectAPI üzerinden güncellendi; ${missingRateCount} aktif kart için veri bulunamadı.`
                : 'Piyasa verileri CollectAPI üzerinden güncellendi.',
            lastUpdatedAt: getResultLastUpdatedAt(items),
            cacheMinutes: settings.cacheMinutes,
            items,
        }
    } catch (error) {
        await Promise.all(enabled.map((series) => recordEmptyRateAttempt(userId, series, String(error)).catch(() => null)))
        const items = await getLatestStoredRates(userId, settings)
        const hasStoredRate = hasAnyRate(items)
        const invalidAuth = isCollectApiAuthError(error)

        return {
            status: invalidAuth && !hasStoredRate ? 'invalid_key' : hasStoredRate ? 'stale' : 'error',
            message: invalidAuth
                ? hasStoredRate
                    ? 'CollectAPI API anahtarı geçersiz görünüyor. Son başarılı veri gösteriliyor.'
                    : 'CollectAPI API anahtarı geçersiz veya paket bu API için yetkili değil.'
                : hasStoredRate
                    ? 'CollectAPI verisi alınamadı. Son başarılı veri gösteriliyor.'
                    : `CollectAPI verisi alınamadı: ${String(error)}`,
            lastUpdatedAt: getResultLastUpdatedAt(items),
            cacheMinutes: settings.cacheMinutes,
            items: hasStoredRate ? markStoredRatesStale(items, 'Son başarılı CollectAPI verisi') : items,
        }
    }
}

export async function getMarketTicker(userId: string): Promise<MarketTickerResult> {
    const settings = await getEvdsSettings(userId)
    const items = await getLatestStoredRates(userId, settings)
    const [apiKeyState, settingsUpdatedAt] = await Promise.all([
        getEvdsApiKeyState(userId),
        getEvdsSettingsUpdatedAt(userId),
    ])

    if (apiKeyState.status === 'invalid') {
        return {
            status: 'invalid_key',
            message: 'CollectAPI API anahtarı çözülemedi. Lütfen Ayarlar > CollectAPI bölümünden API anahtarını yeniden kaydedin.',
            lastUpdatedAt: getResultLastUpdatedAt(items),
            cacheMinutes: settings.cacheMinutes,
            items,
        }
    }

    if (!apiKeyState.apiKey) {
        return {
            status: 'missing_key',
            message: 'CollectAPI API anahtarı girilmedi.',
            lastUpdatedAt: getResultLastUpdatedAt(items),
            cacheMinutes: settings.cacheMinutes,
            items,
        }
    }

    if (shouldRefresh(items, settings.cacheMinutes, settingsUpdatedAt)) {
        return refreshEvdsRates(userId)
    }

    const missingRateCount = getMissingRateCount(items)

    return {
        status: hasAnyRate(items) ? 'ok' : 'empty',
        message: hasAnyRate(items)
            ? missingRateCount > 0
                ? `Piyasa verileri cache üzerinden gösteriliyor; ${missingRateCount} aktif kart için henüz veri yok.`
                : 'Piyasa verileri cache üzerinden gösteriliyor.'
            : 'Aktif piyasa kartları var ancak henüz CollectAPI verisi yok.',
        lastUpdatedAt: getResultLastUpdatedAt(items),
        cacheMinutes: settings.cacheMinutes,
        items,
    }
}
