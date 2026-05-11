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
import {
    DEFAULT_EVDS_SERIES,
    getCollectApiSettingsOwnerId,
    refreshEvdsRates,
    saveEvdsSettings,
    type EvdsSeriesConfig,
} from '@/lib/evds-service'
import { requireCurrentUser, requireSuperuser } from '@/lib/server-auth'

type EvdsField = 'apiKey' | 'cacheMinutes' | 'series'

function revalidateEvdsPaths() {
    ;['/', '/assets', '/settings', '/reports'].forEach((path) => revalidatePath(path))
}

export async function saveEvdsSettingsAction(
    previousState: ActionResult<EvdsField> | FormData,
    formData?: FormData,
): Promise<ActionResult<EvdsField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireSuperuser()
        const apiKey = toOptionalString(data.get('apiKey'))
        const keepExistingApiKey = data.get('keepExistingApiKey') === 'on'
        const cacheMinutes = Math.max(15, Number(data.get('cacheMinutes') ?? 180) || 180)

        const series: EvdsSeriesConfig[] = DEFAULT_EVDS_SERIES.map((defaults) => {
            const code = defaults.code
            return {
                code,
                label: String(data.get(`${code}_label`) ?? defaults.label).trim() || defaults.label,
                enabled: data.get(`${code}_enabled`) === 'on',
                buySeriesCode: String(data.get(`${code}_buy`) ?? defaults.buySeriesCode).trim() || defaults.buySeriesCode,
                sellSeriesCode: String(data.get(`${code}_sell`) ?? defaults.sellSeriesCode).trim() || defaults.sellSeriesCode,
            }
        })

        const settingsOwnerId = await getCollectApiSettingsOwnerId(user.id)
        await saveEvdsSettings(settingsOwnerId, {
            apiKey: apiKey ?? undefined,
            keepExistingApiKey,
            cacheMinutes,
            series,
        })

        const refreshResult = await refreshEvdsRates(user.id).catch(() => null)

        revalidateEvdsPaths()
        if (refreshResult?.status === 'ok' || refreshResult?.status === 'stale') {
            return createSuccessResult(`CollectAPI ayarları kaydedildi. ${refreshResult.message}`)
        }

        if (refreshResult?.message) {
            return createSuccessResult(`CollectAPI ayarları kaydedildi. ${refreshResult.message}`)
        }

        return createSuccessResult('CollectAPI ayarları kaydedildi.')
    } catch (error) {
        return getActionErrorResult<EvdsField>(error, 'CollectAPI ayarları kaydedilemedi.')
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
        return getActionErrorResult(error, 'CollectAPI verileri yenilenemedi.')
    }
}

export async function refreshEvdsRatesFormAction(): Promise<void> {
    await refreshEvdsRatesAction()
}
