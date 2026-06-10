'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/server-auth'
import { createSuccessResult, createErrorResult, type ActionResult } from '@/lib/action-result'

const ALLOWED_CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP', 'XAU']

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
    const user = await getCurrentUser()
    if (!user) return createErrorResult('Oturum bulunamadı.')

    const name = formData.get('name') as string | null
    if (!name || name.trim().length < 2) {
        return createErrorResult('Ad en az 2 karakter olmalıdır.')
    }

    const preferredCurrency = (formData.get('preferredCurrency') as string | null) ?? user.preferredCurrency
    if (!ALLOWED_CURRENCIES.includes(preferredCurrency)) {
        return createErrorResult('Geçersiz para birimi.')
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { name: name.trim(), preferredCurrency },
    })

    revalidatePath('/settings')
    return createSuccessResult('Profil güncellendi.')
}

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
    const user = await getCurrentUser()
    if (!user) return createErrorResult('Oturum bulunamadı.')

    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!currentPassword || !newPassword || !confirmPassword) {
        return createErrorResult('Tüm alanları doldurun.')
    }

    if (newPassword.length < 8) {
        return createErrorResult('Yeni şifre en az 8 karakter olmalıdır.')
    }

    if (newPassword !== confirmPassword) {
        return createErrorResult('Yeni şifreler eşleşmiyor.')
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) return createErrorResult('Kullanıcı bulunamadı.')

    const isValid = await bcrypt.compare(currentPassword, dbUser.password)
    if (!isValid) {
        return createErrorResult('Mevcut şifre hatalı.')
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, sessionVersion: { increment: 1 } },
    })

    return createSuccessResult('Şifre başarıyla değiştirildi. Yeniden giriş yapmanız gerekecek.')
}

export async function updatePreferencesAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
    const user = await getCurrentUser()
    if (!user) return createErrorResult('Oturum bulunamadı.')

    // Ana para birimi Profil formundan yönetilir (updateProfileAction)
    const locale   = (formData.get('locale')   as string | null) ?? 'tr-TR'
    const timezone = (formData.get('timezone') as string | null) ?? 'Europe/Istanbul'

    await prisma.user.update({
        where: { id: user.id },
        data: { locale, timezone },
    })

    revalidatePath('/settings')
    return createSuccessResult('Tercihler kaydedildi.')
}

export async function signOutAllDevicesAction(): Promise<ActionResult> {
    const user = await getCurrentUser()
    if (!user) return createErrorResult('Oturum bulunamadı.')

    await prisma.user.update({
        where: { id: user.id },
        data: { sessionVersion: { increment: 1 } },
    })

    revalidatePath('/settings')
    return createSuccessResult('Tüm cihazlardaki oturumlar sonlandırıldı.')
}
