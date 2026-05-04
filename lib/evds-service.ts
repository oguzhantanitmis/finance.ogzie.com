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
        sellSeriesCode: '',
    },
    {
        code: 'XAU_REPUBLIC',
        label: 'Cumhuriyet Altını',
        enabled: false,
        buySeriesCode: '',
        sellSeriesCode: '',
    },
]

function parseSeriesConfig(raw: string | null): EvdsSeriesConfig[] {
    if (!raw) return DEFAULT_EVDS_SERIES
    try {
        const parsed = JSON.parse(raw) as Partial<EvdsSeriesConfig>[]
        return DEFAULT_EVDS_SERIES.map((defaults) => {
            const item = parsed.find((entry) => entry.code === defaults.code)
            return {
                ...defaults,
                ...item,
                enabled: Boolean(item?.enabled),
                buySeriesCode: String(item?.buySeriesCode ?? defaults.buySeriesCode ?? '').trim(),
                sellSeriesCode: String(item?.sellSeriesCode ?? defaults.sellSeriesCode ?? '').trim(),
            }
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

function getEnabledSeries(settings: EvdsSettings) {
    return settings.series.filter((series) => series.enabled && (series.buySeriesCode || series.sellSeriesCode))
}

function hasAnyRate(items: MarketTickerItem[]) {
    return items.some((item) => item.buyRate !== null || item.sellRate !== null)
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
        if (!latest) continue

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
        const changePercent = latestValue && previousValue
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
        })
    }

    return items
}

function shouldRefresh(items: MarketTickerItem[], cacheMinutes: number) {
    if (items.length === 0) return true
    const lastUpdated = items
        .map((item) => item.updatedAt ? new Date(item.updatedAt).getTime() : 0)
        .filter(Boolean)
        .sort((a, b) => b - a)[0]
    if (!lastUpdated) return true
    return Date.now() - lastUpdated > cacheMinutes * 60 * 1000
}

export async function refreshEvdsRates(userId: string): Promise<MarketTickerResult> {
    const settings = await getEvdsSettings(userId)
    const apiKeyState = await getEvdsApiKeyState(userId)

    if (apiKeyState.status === 'invalid') {
        const items = await getLatestStoredRates(userId, settings)
        return {
            status: 'invalid_key',
            message: 'EVDS API anahtarı çözülemedi. Lütfen Ayarlar > TCMB / EVDS bölümünden API anahtarını yeniden kaydedin.',
            lastUpdatedAt: items.find((item) => item.updatedAt)?.updatedAt ?? null,
            cacheMinutes: settings.cacheMinutes,
            items,
        }
    }

    if (!apiKeyState.apiKey) {
        const items = await getLatestStoredRates(userId, settings)
        return {
            status: 'missing_key',
            message: 'EVDS API anahtarı girilmedi.',
            lastUpdatedAt: items.find((item) => item.updatedAt)?.updatedAt ?? null,
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
    const start = subDays(end, 10)
    const url = `https://evds2.tcmb.gov.tr/service/evds/series=${seriesCodes.join('-')}&startDate=${formatEvdsDate(start)}&endDate=${formatEvdsDate(end)}&type=json&decimalSeperator=.`

    try {
        const response = await fetch(url, {
            headers: { key: apiKeyState.apiKey },
            cache: 'no-store',
        })

        if (!response.ok) {
            throw new Error(`EVDS HTTP ${response.status}`)
        }

        const raw = await response.json()
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
                message: 'EVDS bağlantısı başarılı ancak seçili seriler için son 10 günde veri bulunamadı. Seri kodlarını kontrol edin.',
                lastUpdatedAt: null,
                cacheMinutes: settings.cacheMinutes,
                items: [],
            }
        }

        return {
            status: 'ok',
            message: 'Piyasa verileri TCMB EVDS üzerinden güncellendi.',
            lastUpdatedAt: items.find((item) => item.updatedAt)?.updatedAt ?? null,
            cacheMinutes: settings.cacheMinutes,
            items,
        }
    } catch (error) {
        const items = await getLatestStoredRates(userId, settings)
        const hasStoredRate = hasAnyRate(items)
        return {
            status: hasStoredRate ? 'stale' : 'error',
            message: hasStoredRate ? 'Veri güncellenemedi. Son başarılı veri gösteriliyor.' : `EVDS verisi alınamadı: ${String(error)}`,
            lastUpdatedAt: items.find((item) => item.updatedAt)?.updatedAt ?? null,
            cacheMinutes: settings.cacheMinutes,
            items: hasStoredRate ? items.map((item) => ({ ...item, stale: true, warning: 'Veri güncellenemedi' })) : [],
        }
    }
}

export async function getMarketTicker(userId: string): Promise<MarketTickerResult> {
    const settings = await getEvdsSettings(userId)
    const items = await getLatestStoredRates(userId, settings)
    const apiKeyState = await getEvdsApiKeyState(userId)

    if (apiKeyState.status === 'invalid') {
        return {
            status: 'invalid_key',
            message: 'EVDS API anahtarı çözülemedi. Lütfen Ayarlar > TCMB / EVDS bölümünden API anahtarını yeniden kaydedin.',
            lastUpdatedAt: items.find((item) => item.updatedAt)?.updatedAt ?? null,
            cacheMinutes: settings.cacheMinutes,
            items,
        }
    }

    if (!apiKeyState.apiKey) {
        return {
            status: 'missing_key',
            message: 'EVDS API anahtarı girilmedi.',
            lastUpdatedAt: items.find((item) => item.updatedAt)?.updatedAt ?? null,
            cacheMinutes: settings.cacheMinutes,
            items,
        }
    }

    if (shouldRefresh(items, settings.cacheMinutes)) {
        return refreshEvdsRates(userId)
    }

    return {
        status: items.length > 0 ? 'ok' : 'empty',
        message: items.length > 0 ? 'Piyasa verileri cache üzerinden gösteriliyor.' : 'Henüz piyasa verisi yok.',
        lastUpdatedAt: items.find((item) => item.updatedAt)?.updatedAt ?? null,
        cacheMinutes: settings.cacheMinutes,
        items,
    }
}
