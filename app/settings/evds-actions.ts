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

function revalidateEvdsPaths() {
    ;['/', '/settings', '/reports'].forEach((path) => revalidatePath(path))
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
            return {
                code,
                label: String(data.get(`${code}_label`) ?? defaults.label).trim() || defaults.label,
                enabled: data.get(`${code}_enabled`) === 'on',
                buySeriesCode: String(data.get(`${code}_buy`) ?? '').trim(),
                sellSeriesCode: String(data.get(`${code}_sell`) ?? '').trim(),
            }
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

        revalidateEvdsPaths()
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
