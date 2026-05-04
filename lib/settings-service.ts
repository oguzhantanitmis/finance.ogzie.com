import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const ENCRYPTION_PREFIX = 'enc:v1:'

function getEncryptionSecret() {
    return process.env.APP_SETTINGS_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || null
}

function getEncryptionKey(secret: string) {
    return crypto.createHash('sha256').update(secret).digest()
}

export function encryptSettingValue(value: string) {
    const secret = getEncryptionSecret()
    if (!secret) {
        throw new Error('Güvenli ayar kaydı için APP_SETTINGS_SECRET veya NEXTAUTH_SECRET tanımlanmalıdır.')
    }

    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(secret), iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return `${ENCRYPTION_PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64')}`
}

export function decryptSettingValue(value: string) {
    if (!value.startsWith(ENCRYPTION_PREFIX)) {
        return value
    }

    const secret = getEncryptionSecret()
    if (!secret) {
        throw new Error('Şifreli ayarı okumak için APP_SETTINGS_SECRET veya NEXTAUTH_SECRET tanımlanmalıdır.')
    }

    const payload = Buffer.from(value.slice(ENCRYPTION_PREFIX.length), 'base64')
    const iv = payload.subarray(0, 12)
    const tag = payload.subarray(12, 28)
    const encrypted = payload.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(secret), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export async function getSetting(userId: string, key: string): Promise<string | null> {
    const setting = await prisma.appSettings.findUnique({
        where: { userId_key: { userId, key } },
    })
    return setting?.value ?? null
}

export async function getSecureSetting(userId: string, key: string): Promise<string | null> {
    const setting = await prisma.appSettings.findUnique({
        where: { userId_key: { userId, key } },
    })
    if (!setting?.value) return null
    return setting.isEncrypted ? decryptSettingValue(setting.value) : setting.value
}

export async function setSetting(userId: string, key: string, value: string, isEncrypted: boolean = false): Promise<void> {
    const storedValue = isEncrypted ? encryptSettingValue(value) : value
    await prisma.appSettings.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, value: storedValue, isEncrypted },
        update: { value: storedValue, isEncrypted },
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
