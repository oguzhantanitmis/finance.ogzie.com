export type ActionFieldErrors<TField extends string = string> = Partial<Record<TField, string>>

export interface ActionResult<TField extends string = string> {
    success: boolean
    message: string
    fieldErrors: ActionFieldErrors<TField>
    entityId?: string
}

export const EMPTY_ACTION_RESULT: ActionResult = {
    success: false,
    message: '',
    fieldErrors: {},
}

export class ActionError<TField extends string = string> extends Error {
    fieldErrors: ActionFieldErrors<TField>

    constructor(message: string, fieldErrors: ActionFieldErrors<TField> = {}) {
        super(message)
        this.name = 'ActionError'
        this.fieldErrors = fieldErrors
    }
}

export function createSuccessResult<TField extends string = string>(
    message: string,
    entityId?: string,
): ActionResult<TField> {
    return {
        success: true,
        message,
        fieldErrors: {},
        entityId,
    }
}

export function createErrorResult<TField extends string = string>(
    message: string,
    fieldErrors: ActionFieldErrors<TField> = {},
): ActionResult<TField> {
    return {
        success: false,
        message,
        fieldErrors,
    }
}

export function resolveFormData<TField extends string = string>(
    payload: FormData | ActionResult<TField>,
    formData?: FormData,
): FormData {
    if (formData instanceof FormData) {
        return formData
    }

    if (payload instanceof FormData) {
        return payload
    }

    throw new ActionError('Form verisi okunamadi.')
}

export function toOptionalString(value: FormDataEntryValue | null) {
    const parsed = String(value ?? '').trim()
    return parsed.length > 0 ? parsed : undefined
}

export function toRequiredString<TField extends string = string>(
    value: FormDataEntryValue | null,
    field: TField,
    label: string,
) {
    const parsed = String(value ?? '').trim()
    if (!parsed) {
        throw new ActionError(`${label} alani zorunludur.`, { [field]: `${label} zorunludur.` } as ActionFieldErrors<TField>)
    }
    return parsed
}

export function toOptionalNumber(value: FormDataEntryValue | null) {
    const raw = String(value ?? '').trim()
    if (!raw) return undefined
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : undefined
}

export function toNumberOrZero<TField extends string = string>(
    value: FormDataEntryValue | null,
    field: TField,
    label: string,
    options?: { min?: number },
) {
    const raw = String(value ?? '').trim()
    if (!raw) return 0

    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
        throw new ActionError(`${label} alani gecersiz.`, { [field]: `${label} gecersiz.` } as ActionFieldErrors<TField>)
    }
    if (typeof options?.min === 'number' && parsed < options.min) {
        throw new ActionError(`${label} en az ${options.min} olmalidir.`, { [field]: `${label} en az ${options.min} olmalidir.` } as ActionFieldErrors<TField>)
    }
    return parsed
}

export function toRequiredNumber<TField extends string = string>(
    value: FormDataEntryValue | null,
    field: TField,
    label: string,
    options?: { min?: number },
) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
        throw new ActionError(`${label} alani gecersiz.`, { [field]: `${label} gecersiz.` } as ActionFieldErrors<TField>)
    }
    if (typeof options?.min === 'number' && parsed < options.min) {
        throw new ActionError(`${label} en az ${options.min} olmalidir.`, { [field]: `${label} en az ${options.min} olmalidir.` } as ActionFieldErrors<TField>)
    }
    return parsed
}

export function getActionErrorResult<TField extends string = string>(
    error: unknown,
    fallbackMessage: string,
): ActionResult<TField> {
    if (error instanceof ActionError) {
        return createErrorResult<TField>(error.message, error.fieldErrors)
    }

    if (error instanceof Error) {
        return createErrorResult<TField>(error.message || fallbackMessage)
    }

    return createErrorResult<TField>(fallbackMessage)
}
