'use server'

import { revalidatePath } from 'next/cache'

import {
    type ActionResult,
    createErrorResult,
    createSuccessResult,
    getActionErrorResult,
    resolveFormData,
    toOptionalString,
} from '@/lib/action-result'
import { DEFAULT_EVDS_SERIES, refreshEvdsRates, saveEvdsSettings, type EvdsSeriesConfig } from '@/lib/evds-service'
import { requireCurrentUser } from '@/lib/server-auth'

type EvdsField = 'apiKey' | 'cacheMinutes' | 'series'

const GOLD_SELL_SERIES: Partial<Record<EvdsSeriesConfig['code'], string>> = {
    XAU_GRAM: 'TP.MK.KUL.YTL',
    XAU_REPUBLIC: 'TP.MK.CUM.YTL',
}

function normalizeSeriesInput(series: EvdsSeriesConfig): EvdsSeriesConfig {
    const goldSellCode = GOLD_SELL_SERIES[series.code]
    if (!goldSellCode || !series.enabled) return series

    const hasNoCode = !series.buySeriesCode && !series.sellSeriesCode
    const hasCurrencyCode = series.buySeriesCode.startsWith('TP.DK.') || series.sellSeriesCode.startsWith('TP.DK.')

    if (!hasNoCode && !hasCurrencyCode) return series

    return {
        ...series,
        buySeriesCode: '',
        sellSeriesCode: goldSellCode,
    }
}

function revalidateEvdsPaths() {
    ;['/', '/assets', '/settings', '/reports'].forEach((path) => revalidatePath(path))
}

export async function saveEvdsSettingsAction(
    previousState: ActionResult<EvdsField> | FormData,
    formData?: FormData,
): Promise<ActionResult<EvdsField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const apiKey = toOptionalString(data.get('apiKey'))
        const keepExistingApiKey = data.get('keepExistingApiKey') === 'on'
        const cacheMinutes = Math.max(15, Number(data.get('cacheMinutes') ?? 180) || 180)

        const series: EvdsSeriesConfig[] = DEFAULT_EVDS_SERIES.map((defaults) => {
            const code = defaults.code
            return normalizeSeriesInput({
                code,
                label: String(data.get(`${code}_label`) ?? defaults.label).trim() || defaults.label,
                enabled: data.get(`${code}_enabled`) === 'on',
                buySeriesCode: String(data.get(`${code}_buy`) ?? defaults.buySeriesCode ?? '').trim(),
                sellSeriesCode: String(data.get(`${code}_sell`) ?? defaults.sellSeriesCode ?? '').trim(),
            })
        })

        const hasEnabledSeriesWithoutCode = series.some((item) => item.enabled && !item.buySeriesCode && !item.sellSeriesCode)
        if (hasEnabledSeriesWithoutCode) {
            return {
                success: false,
                message: 'Aktif seçilen her piyasa kartı için en az bir EVDS seri kodu girilmelidir.',
                fieldErrors: { series: 'Eksik seri kodu var.' },
            }
        }

        await saveEvdsSettings(user.id, {
            apiKey: apiKey ?? undefined,
            keepExistingApiKey,
            cacheMinutes,
            series,
        })

        const refreshResult = await refreshEvdsRates(user.id).catch(() => null)

        revalidateEvdsPaths()
        if (refreshResult?.status === 'ok' || refreshResult?.status === 'stale') {
            return createSuccessResult(`TCMB / EVDS ayarları kaydedildi. ${refreshResult.message}`)
        }

        if (refreshResult?.message) {
            return createSuccessResult(`TCMB / EVDS ayarları kaydedildi. ${refreshResult.message}`)
        }

        return createSuccessResult('TCMB / EVDS ayarları kaydedildi.')
    } catch (error) {
        return getActionErrorResult<EvdsField>(error, 'TCMB / EVDS ayarları kaydedilemedi.')
    }
}

export async function refreshEvdsRatesAction(): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
        const result = await refreshEvdsRates(user.id)
        revalidateEvdsPaths()
        return result.status === 'ok' || result.status === 'stale'
            ? createSuccessResult(result.message)
            : createErrorResult(result.message)
    } catch (error) {
        return getActionErrorResult(error, 'EVDS verileri yenilenemedi.')
    }
}

export async function refreshEvdsRatesFormAction(): Promise<void> {
    await refreshEvdsRatesAction()
}
