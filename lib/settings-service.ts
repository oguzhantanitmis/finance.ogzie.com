'use server'

import type { AppSettings } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function getSetting(userId: string, key: string): Promise<string | null> {
    const setting = await prisma.appSettings.findUnique({
        where: { userId_key: { userId, key } },
    })
    return setting?.value ?? null
}

export async function setSetting(userId: string, key: string, value: string, isEncrypted: boolean = false): Promise<void> {
    await prisma.appSettings.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, value, isEncrypted },
        update: { value, isEncrypted },
    })
}

export async function getSettingsGroup(userId: string, prefix: string): Promise<Record<string, string>> {
    const settings = await prisma.appSettings.findMany({
        where: { userId, key: { startsWith: prefix } },
    })
    return Object.fromEntries(settings.map((s) => [s.key, s.value]))
}

export async function deleteSetting(userId: string, key: string): Promise<void> {
    await prisma.appSettings.deleteMany({ where: { userId, key } })
}
