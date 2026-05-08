import { subDays } from 'date-fns'

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

const SETTINGS_KEYS = {
    apiKey: 'evds.apiKey',
    cacheMinutes: 'evds.cacheMinutes',
    seriesConfig: 'evds.seriesConfig',
}

export const DEFAULT_EVDS_SERIES: EvdsSeriesConfig[] = [
    {
        code: 'USDTRY',
        label: 'Dolar',
        enabled: true,
        buySeriesCode: 'TP.DK.USD.A.YTL',
        sellSeriesCode: 'TP.DK.USD.S.YTL',
    },
    {
        code: 'EURTRY',
        label: 'Euro',
        enabled: true,
        buySeriesCode: 'TP.DK.EUR.A.YTL',
        sellSeriesCode: 'TP.DK.EUR.S.YTL',
    },
    {
        code: 'GBPTRY',
        label: 'Sterlin',
        enabled: true,
        buySeriesCode: 'TP.DK.GBP.A.YTL',
        sellSeriesCode: 'TP.DK.GBP.S.YTL',
    },
    {
        code: 'XAU_GRAM',
        label: 'Gram Altın',
        enabled: false,
        buySeriesCode: '',
        sellSeriesCode: 'TP.MK.KUL.YTL',
    },
    {
        code: 'XAU_REPUBLIC',
        label: 'Cumhuriyet Altını',
        enabled: false,
        buySeriesCode: '',
        sellSeriesCode: 'TP.MK.CUM.YTL',
    },
]

const DEFAULT_GOLD_SELL_SERIES: Partial<Record<EvdsTickerCode, string>> = {
    XAU_GRAM: 'TP.MK.KUL.YTL',
    XAU_REPUBLIC: 'TP.MK.CUM.YTL',
}

function normalizeGoldSeries(series: EvdsSeriesConfig): EvdsSeriesConfig {
    const defaultSellCode = DEFAULT_GOLD_SELL_SERIES[series.code]
    if (!defaultSellCode) return series

    const hasNoCode = !series.buySeriesCode && !series.sellSeriesCode
    const hasCurrencyCode = series.buySeriesCode.startsWith('TP.DK.') || series.sellSeriesCode.startsWith('TP.DK.')
    if (!hasNoCode && !hasCurrencyCode) return series

    return {
        ...series,
        buySeriesCode: '',
        sellSeriesCode: defaultSellCode,
    }
}

function parseSeriesConfig(raw: string | null): EvdsSeriesConfig[] {
    if (!raw) return DEFAULT_EVDS_SERIES
    try {
        const parsed = JSON.parse(raw) as Partial<EvdsSeriesConfig>[]
        return DEFAULT_EVDS_SERIES.map((defaults) => {
            const item = parsed.find((entry) => entry.code === defaults.code)
            return normalizeGoldSeries({
                ...defaults,
                ...item,
                enabled: Boolean(item?.enabled),
                buySeriesCode: String(item?.buySeriesCode ?? defaults.buySeriesCode ?? '').trim(),
                sellSeriesCode: String(item?.sellSeriesCode ?? defaults.sellSeriesCode ?? '').trim(),
            })
        })
    } catch {
        return DEFAULT_EVDS_SERIES
    }
}

function parseNumber(value: unknown) {
    if (value === null || value === undefined || value === '') return null
    const normalized = String(value).replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
}

function formatEvdsDate(date: Date) {
    return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Istanbul',
    }).format(date).replaceAll('.', '-')
}

function parseEvdsDate(value: unknown) {
    const raw = String(value ?? '').trim()
    const match = raw.match(/^(\d{2})[-.](\d{2})[-.](\d{4})$/)
    if (!match) return null
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
}

function parseTcmbXmlDate(xml: string) {
    const dateMatch = xml.match(/\bTarih="(\d{2})\.(\d{2})\.(\d{4})"/)
    if (dateMatch) {
        return new Date(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1]))
    }

    const isoMatch = xml.match(/\bDate="(\d{2})\/(\d{2})\/(\d{4})"/)
    if (isoMatch) {
        return new Date(Number(isoMatch[3]), Number(isoMatch[1]) - 1, Number(isoMatch[2]))
    }

    return new Date()
}

function parseTcmbCurrency(xml: string, currencyCode: string) {
    const blockMatch = xml.match(new RegExp(`<Currency[^>]+CurrencyCode="${currencyCode}"[\\s\\S]*?<\\/Currency>`))
    const block = blockMatch?.[0]
    if (!block) return null

    const buy = block.match(/<ForexBuying>([^<]+)<\/ForexBuying>/)?.[1]
    const sell = block.match(/<ForexSelling>([^<]+)<\/ForexSelling>/)?.[1]

    return {
        buyRate: parseNumber(buy),
        sellRate: parseNumber(sell),
    }
}

function getEnabledSeries(settings: EvdsSettings) {
    return settings.series.filter((series) => series.enabled && (series.buySeriesCode || series.sellSeriesCode))
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

async function getEvdsSettingsUpdatedAt(userId: string) {
    const latestSetting = await prisma.appSettings.findFirst({
        where: {
            userId,
            key: { in: Object.values(SETTINGS_KEYS) },
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
    })

    return latestSetting?.updatedAt ?? null
}

async function getEvdsApiKeyState(userId: string) {
    const raw = await getSetting(userId, SETTINGS_KEYS.apiKey)
    if (!raw) {
        return { status: 'missing' as const, apiKey: null }
    }

    try {
        const apiKey = await getSecureSetting(userId, SETTINGS_KEYS.apiKey)
        return apiKey
            ? { status: 'ok' as const, apiKey }
            : { status: 'missing' as const, apiKey: null }
    } catch {
        return { status: 'invalid' as const, apiKey: null }
    }
}

async function refreshTcmbDailyXmlRates(userId: string, settings: EvdsSettings) {
    const enabled = getEnabledSeries(settings)
    const fallbackCurrencyMap: Partial<Record<EvdsTickerCode, string>> = {
        USDTRY: 'USD',
        EURTRY: 'EUR',
        GBPTRY: 'GBP',
    }
    const fallbackSeries = enabled.filter((series) => fallbackCurrencyMap[series.code])

    if (fallbackSeries.length === 0) {
        return false
    }

    const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
        cache: 'no-store',
        headers: {
            Accept: 'application/xml,text/xml,*/*',
            'User-Agent': 'OgzieFinance/1.0',
        },
    })

    if (!response.ok) {
        throw new Error(`TCMB günlük kur HTTP ${response.status}`)
    }

    const xml = await response.text()
    const rateDate = parseTcmbXmlDate(xml)
    let storedCount = 0

    for (const series of fallbackSeries) {
        const fallbackCurrency = fallbackCurrencyMap[series.code]
        if (!fallbackCurrency) continue

        const parsed = parseTcmbCurrency(xml, fallbackCurrency)
        if (!parsed || (parsed.buyRate === null && parsed.sellRate === null)) continue

        await prisma.marketRate.upsert({
            where: {
                userId_source_currencyCode_seriesCode_rateDate: {
                    userId,
                    source: 'TCMB_DAILY_XML',
                    currencyCode: series.code,
                    seriesCode: `TCMB_DAILY_XML:${fallbackCurrency}`,
                    rateDate,
                },
            },
            create: {
                userId,
                source: 'TCMB_DAILY_XML',
                currencyCode: series.code,
                seriesCode: `TCMB_DAILY_XML:${fallbackCurrency}`,
                buyRate: parsed.buyRate,
                sellRate: parsed.sellRate,
                rateDate,
                rawResponse: { source: 'https://www.tcmb.gov.tr/kurlar/today.xml' },
            },
            update: {
                buyRate: parsed.buyRate,
                sellRate: parsed.sellRate,
                rawResponse: { source: 'https://www.tcmb.gov.tr/kurlar/today.xml' },
            },
        })
        storedCount += 1
    }

    return storedCount > 0
}

export async function getEvdsSettings(userId: string): Promise<EvdsSettings> {
    const [apiKey, cacheRaw, seriesRaw] = await Promise.all([
        getSecureSetting(userId, SETTINGS_KEYS.apiKey).catch(() => null),
        getSetting(userId, SETTINGS_KEYS.cacheMinutes),
        getSetting(userId, SETTINGS_KEYS.seriesConfig),
    ])

    const cacheMinutes = Math.max(15, Number(cacheRaw ?? 180) || 180)

    return {
        hasApiKey: Boolean(apiKey),
        cacheMinutes,
        series: parseSeriesConfig(seriesRaw),
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
        setSetting(userId, SETTINGS_KEYS.cacheMinutes, String(Math.max(15, data.cacheMinutes || 180))),
        setSetting(userId, SETTINGS_KEYS.seriesConfig, JSON.stringify(data.series)),
    ])
}

async function getLatestStoredRates(userId: string, settings: EvdsSettings): Promise<MarketTickerItem[]> {
    const enabled = getEnabledSeries(settings)
    const items: MarketTickerItem[] = []

    for (const series of enabled) {
        const latest = await prisma.marketRate.findFirst({
            where: { userId, currencyCode: series.code },
            orderBy: [{ rateDate: 'desc' }, { createdAt: 'desc' }],
        })

        const previous = latest
            ? await prisma.marketRate.findFirst({
                where: {
                    userId,
                    currencyCode: series.code,
                    rateDate: { lt: latest.rateDate },
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
            updatedAt: latest?.createdAt.toISOString() ?? null,
            previousSellRate: previousValue,
            changePercent,
            stale: false,
            warning: latest ? undefined : 'Aktif kart, ancak EVDS henüz bu seri için veri döndürmedi.',
        })
    }

    return items
}

function shouldRefresh(items: MarketTickerItem[], cacheMinutes: number, settingsUpdatedAt: Date | null = null) {
    if (items.length === 0) return true
    const lastUpdated = getLastUpdatedAt(items)
    if (!lastUpdated) return true
    if (settingsUpdatedAt && settingsUpdatedAt.getTime() > lastUpdated) return true
    return Date.now() - lastUpdated > cacheMinutes * 60 * 1000
}

export async function refreshEvdsRates(userId: string): Promise<MarketTickerResult> {
    const settings = await getEvdsSettings(userId)
    const apiKeyState = await getEvdsApiKeyState(userId)

    if (apiKeyState.status === 'invalid') {
        await refreshTcmbDailyXmlRates(userId, settings).catch(() => false)
        const items = await getLatestStoredRates(userId, settings)
        return {
            status: hasAnyRate(items) ? 'stale' : 'invalid_key',
            message: hasAnyRate(items)
                ? 'EVDS API anahtarı çözülemedi. Resmi TCMB günlük kur yedeği gösteriliyor.'
                : 'EVDS API anahtarı çözülemedi. Lütfen Ayarlar > TCMB / EVDS bölümünden API anahtarını yeniden kaydedin.',
            lastUpdatedAt: getResultLastUpdatedAt(items),
            cacheMinutes: settings.cacheMinutes,
            items: hasAnyRate(items) ? markStoredRatesStale(items, 'TCMB günlük kur yedeği') : items,
        }
    }

    if (!apiKeyState.apiKey) {
        const items = await getLatestStoredRates(userId, settings)
        return {
            status: 'missing_key',
            message: 'EVDS API anahtarı girilmedi.',
            lastUpdatedAt: getResultLastUpdatedAt(items),
            cacheMinutes: settings.cacheMinutes,
            items,
        }
    }

    const enabled = getEnabledSeries(settings)
    if (enabled.length === 0) {
        return {
            status: 'empty',
            message: 'Gösterilecek EVDS serisi seçilmedi.',
            lastUpdatedAt: null,
            cacheMinutes: settings.cacheMinutes,
            items: [],
        }
    }

    const seriesCodes = Array.from(new Set(enabled.flatMap((item) => [item.buySeriesCode, item.sellSeriesCode]).filter(Boolean)))
    const end = new Date()
    const hasGoldSeries = enabled.some((series) => series.code === 'XAU_GRAM' || series.code === 'XAU_REPUBLIC')
    const start = subDays(end, hasGoldSeries ? 370 : 10)
    const url = `https://evds2.tcmb.gov.tr/service/evds/series=${seriesCodes.join('-')}&startDate=${formatEvdsDate(start)}&endDate=${formatEvdsDate(end)}&type=json&decimalSeperator=.`

    try {
        const response = await fetch(url, {
            headers: { key: apiKeyState.apiKey },
            cache: 'no-store',
        })

        if (!response.ok) {
            throw new Error(`EVDS HTTP ${response.status}`)
        }

        const responseText = await response.text()
        const contentType = response.headers.get('content-type') ?? ''
        if (!contentType.includes('json') && responseText.trim().startsWith('<')) {
            throw new Error('EVDS JSON yerine HTML döndürdü. API anahtarını ve EVDS erişimini kontrol edin.')
        }

        const raw = JSON.parse(responseText)
        const rows = Array.isArray(raw?.items) ? raw.items : []

        for (const series of enabled) {
            const row = [...rows].reverse().find((item) => {
                const buy = series.buySeriesCode ? parseNumber(item[series.buySeriesCode]) : null
                const sell = series.sellSeriesCode ? parseNumber(item[series.sellSeriesCode]) : null
                return buy !== null || sell !== null
            })
            if (!row) continue

            const rateDate = parseEvdsDate(row.Tarih ?? row.tarih ?? row.DATE) ?? new Date()
            const buyRate = series.buySeriesCode ? parseNumber(row[series.buySeriesCode]) : null
            const sellRate = series.sellSeriesCode ? parseNumber(row[series.sellSeriesCode]) : buyRate

            await prisma.marketRate.upsert({
                where: {
                    userId_source_currencyCode_seriesCode_rateDate: {
                        userId,
                        source: 'TCMB_EVDS',
                        currencyCode: series.code,
                        seriesCode: [series.buySeriesCode, series.sellSeriesCode].filter(Boolean).join('|'),
                        rateDate,
                    },
                },
                create: {
                    userId,
                    source: 'TCMB_EVDS',
                    currencyCode: series.code,
                    seriesCode: [series.buySeriesCode, series.sellSeriesCode].filter(Boolean).join('|'),
                    buyRate,
                    sellRate,
                    rateDate,
                    rawResponse: raw,
                },
                update: {
                    buyRate,
                    sellRate,
                    rawResponse: raw,
                },
            })
        }

        const items = await getLatestStoredRates(userId, settings)
        if (!hasAnyRate(items)) {
            return {
                status: 'empty',
                message: 'EVDS bağlantısı başarılı ancak seçili seriler için veri bulunamadı. Seri kodlarını ve tarih aralığını kontrol edin.',
                lastUpdatedAt: null,
                cacheMinutes: settings.cacheMinutes,
                items,
            }
        }

        const missingRateCount = getMissingRateCount(items)

        return {
            status: 'ok',
            message: missingRateCount > 0
                ? `Piyasa verileri güncellendi; ${missingRateCount} aktif kart için EVDS verisi bulunamadı.`
                : 'Piyasa verileri TCMB EVDS üzerinden güncellendi.',
            lastUpdatedAt: getResultLastUpdatedAt(items),
            cacheMinutes: settings.cacheMinutes,
            items,
        }
    } catch (error) {
        await refreshTcmbDailyXmlRates(userId, settings).catch(() => false)
        const items = await getLatestStoredRates(userId, settings)
        const hasStoredRate = hasAnyRate(items)
        return {
            status: hasStoredRate ? 'stale' : 'error',
            message: hasStoredRate ? 'EVDS verisi alınamadı. Resmi TCMB günlük kur yedeği gösteriliyor.' : `EVDS verisi alınamadı: ${String(error)}`,
            lastUpdatedAt: getResultLastUpdatedAt(items),
            cacheMinutes: settings.cacheMinutes,
            items: hasStoredRate ? markStoredRatesStale(items, 'TCMB günlük kur yedeği') : items,
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
            message: 'EVDS API anahtarı çözülemedi. Lütfen Ayarlar > TCMB / EVDS bölümünden API anahtarını yeniden kaydedin.',
            lastUpdatedAt: getResultLastUpdatedAt(items),
            cacheMinutes: settings.cacheMinutes,
            items,
        }
    }

    if (!apiKeyState.apiKey) {
        return {
            status: 'missing_key',
            message: 'EVDS API anahtarı girilmedi.',
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
            : 'Aktif piyasa kartları var ancak henüz veri yok.',
        lastUpdatedAt: getResultLastUpdatedAt(items),
        cacheMinutes: settings.cacheMinutes,
        items,
    }
}
