'use server'

import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import {
    type ActionResult,
    ActionError,
    createSuccessResult,
    getActionErrorResult,
    resolveFormData,
    toOptionalString,
    toRequiredString,
} from '@/lib/action-result'
import { createManagedUser, deleteManagedUser } from '@/lib/admin-users'
import { isSmtpConfigured, sendSmtpTestEmail, sendWelcomeEmail } from '@/lib/email/smtp'
import { requireSuperuser } from '@/lib/server-auth'

type UserField = 'email' | 'name' | 'password' | 'role'
type SmtpField = 'testEmail'

function parseUserRole(value: FormDataEntryValue | null) {
    return value === UserRole.SUPERUSER ? UserRole.SUPERUSER : UserRole.USER
}

export async function createUserAction(
    previousState: ActionResult<UserField> | FormData,
    formData?: FormData,
): Promise<ActionResult<UserField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const currentUser = await requireSuperuser()
        const email = toRequiredString(data.get('email'), 'email', 'E-posta')
        const password = toRequiredString(data.get('password'), 'password', 'Şifre')
        const user = await createManagedUser({
            email,
            name: toOptionalString(data.get('name')),
            password,
            role: parseUserRole(data.get('role')),
        })

        let message = 'Kullanıcı oluşturuldu.'
        if (isSmtpConfigured()) {
            try {
                await sendWelcomeEmail({
                    to: user.email,
                    email: user.email,
                    name: user.name,
                    password,
                    role: user.role,
                })
                message = 'Kullanıcı oluşturuldu ve giriş bilgileri e-posta ile gönderildi.'
            } catch (mailError) {
                const detail = mailError instanceof Error ? mailError.message : 'Bilinmeyen SMTP hatası'
                message = `Kullanıcı oluşturuldu; e-posta gönderilemedi: ${detail}`
            }
        } else {
            message = 'Kullanıcı oluşturuldu. SMTP ayarlı olmadığı için e-posta gönderilmedi.'
        }

        await logAction(currentUser.id, 'USER_CREATED', user.id, { email: user.email, role: user.role })
        revalidatePath('/admin')
        return createSuccessResult(message, user.id)
    } catch (error) {
        return getActionErrorResult<UserField>(error, 'Kullanıcı oluşturulamadı.')
    }
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
    try {
        const currentUser = await requireSuperuser()
        if (currentUser.id === userId) {
            throw new Error('Kendi hesabınızı silemezsiniz.')
        }
        // Soft-delete: deletedAt + isActive=false; veriyi koru
        const { prisma } = await import('@/lib/prisma')
        await prisma.user.update({
            where: { id: userId },
            data: {
                deletedAt: new Date(),
                isActive: false,
                sessionVersion: { increment: 1 },
            },
        })
        await logAction(currentUser.id, 'USER_DELETED', userId)
        revalidatePath('/admin')
        return createSuccessResult('Kullanıcı arşivlendi (soft-delete). Geri yüklenebilir.', userId)
    } catch (error) {
        return getActionErrorResult(error, 'Kullanıcı silinemedi.')
    }
}

export async function restoreUserAction(userId: string): Promise<ActionResult> {
    try {
        const currentUser = await requireSuperuser()
        const { prisma } = await import('@/lib/prisma')
        await prisma.user.update({
            where: { id: userId },
            data: { deletedAt: null, isActive: true },
        })
        await logAction(currentUser.id, 'USER_RESTORED', userId)
        revalidatePath('/admin')
        return createSuccessResult('Kullanıcı geri yüklendi.')
    } catch (error) {
        return getActionErrorResult(error, 'Kullanıcı geri yüklenemedi.')
    }
}

export async function hardDeleteUserAction(userId: string): Promise<ActionResult> {
    try {
        const currentUser = await requireSuperuser()
        await deleteManagedUser(currentUser.id, userId)
        await logAction(currentUser.id, 'USER_HARD_DELETED', userId)
        revalidatePath('/admin')
        return createSuccessResult('Kullanıcı ve tüm verileri kalıcı olarak silindi.')
    } catch (error) {
        return getActionErrorResult(error, 'Kullanıcı kalıcı silinemedi.')
    }
}

export async function updateAiLimitAction(userId: string, limit: number): Promise<ActionResult> {
    try {
        const currentUser = await requireSuperuser()
        if (!Number.isInteger(limit) || limit < 0) {
            throw new ActionError('Limit 0 veya pozitif bir tam sayı olmalı.')
        }
        const { prisma } = await import('@/lib/prisma')
        await prisma.user.update({ where: { id: userId }, data: { aiMonthlyTokenLimit: limit } })
        await logAction(currentUser.id, 'AI_LIMIT_UPDATED', userId, { limit })
        revalidatePath('/admin')
        return createSuccessResult('AI kota limiti güncellendi.', userId)
    } catch (error) {
        return getActionErrorResult(error, 'Kota güncellenemedi.')
    }
}

async function logAction(actorId: string, action: string, targetId?: string, metadata?: object) {
    try {
        const { prisma } = await import('@/lib/prisma')
        await prisma.userActionLog.create({
            data: { actorId, action, targetId, metadata: metadata as never },
        })
    } catch (e) {
        console.error('action log error:', e)
    }
}

export async function sendSmtpTestEmailAction(
    previousState: ActionResult<SmtpField> | FormData,
    formData?: FormData,
): Promise<ActionResult<SmtpField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const currentUser = await requireSuperuser()
        if (!isSmtpConfigured()) {
            throw new ActionError<SmtpField>('SMTP ayarları eksik.', { testEmail: 'SMTP env değerleri tamamlanmalı.' })
        }

        const to = toRequiredString(data.get('testEmail'), 'testEmail', 'Test e-postası')
        await sendSmtpTestEmail(to, currentUser.email)
        return createSuccessResult('SMTP test e-postası gönderildi.')
    } catch (error) {
        return getActionErrorResult<SmtpField>(error, 'SMTP test e-postası gönderilemedi.')
    }
}

export async function resetUserSessionsAction(targetUserId: string): Promise<ActionResult> {
    try {
        const currentUser = await requireSuperuser()
        const { prisma } = await import('@/lib/prisma')
        await prisma.user.update({
            where: { id: targetUserId },
            data: { sessionVersion: { increment: 1 } },
        })
        await logAction(currentUser.id, 'SESSIONS_RESET', targetUserId)
        revalidatePath('/admin')
        return createSuccessResult('Kullanıcı oturumları sıfırlandı.')
    } catch (error) {
        return getActionErrorResult(error, 'Oturumlar sıfırlanamadı.')
    }
}

export async function unlockUserAction(targetUserId: string): Promise<ActionResult> {
    try {
        const currentUser = await requireSuperuser()
        const { prisma } = await import('@/lib/prisma')
        await prisma.user.update({
            where: { id: targetUserId },
            data: { failedLoginAttempts: 0, lockedUntil: null },
        })
        await logAction(currentUser.id, 'USER_UNLOCKED', targetUserId)
        revalidatePath('/admin')
        return createSuccessResult('Hesap kilidi kaldırıldı.')
    } catch (error) {
        return getActionErrorResult(error, 'Kilit kaldırılamadı.')
    }
}
