import { prisma } from '@/lib/prisma'

export interface UserPreferences {
    preferredCurrency: string  // TRY, USD, EUR, GBP
    locale: string             // tr-TR, en-US
    timezone: string           // Europe/Istanbul, ...
}

const DEFAULTS: UserPreferences = {
    preferredCurrency: 'TRY',
    locale:            'tr-TR',
    timezone:          'Europe/Istanbul',
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferredCurrency: true, locale: true, timezone: true },
    })
    if (!user) return DEFAULTS
    return {
        preferredCurrency: user.preferredCurrency ?? DEFAULTS.preferredCurrency,
        locale:            user.locale            ?? DEFAULTS.locale,
        timezone:          user.timezone          ?? DEFAULTS.timezone,
    }
}

export async function updateUserPreferences(userId: string, prefs: Partial<UserPreferences>) {
    await prisma.user.update({
        where: { id: userId },
        data: {
            ...(prefs.preferredCurrency !== undefined ? { preferredCurrency: prefs.preferredCurrency } : {}),
            ...(prefs.locale            !== undefined ? { locale:            prefs.locale            } : {}),
            ...(prefs.timezone          !== undefined ? { timezone:          prefs.timezone          } : {}),
        },
    })
}
