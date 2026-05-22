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
        await requireSuperuser()
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

        revalidatePath('/admin')
        return createSuccessResult(message, user.id)
    } catch (error) {
        return getActionErrorResult<UserField>(error, 'Kullanıcı oluşturulamadı.')
    }
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
    try {
        const currentUser = await requireSuperuser()
        await deleteManagedUser(currentUser.id, userId)
        revalidatePath('/admin')
        return createSuccessResult('Kullanıcı ve bağlı verileri silindi.', userId)
    } catch (error) {
        return getActionErrorResult(error, 'Kullanıcı silinemedi.')
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
        await requireSuperuser()
        await (await import('@/lib/prisma')).prisma.user.update({
            where: { id: targetUserId },
            data: { sessionVersion: { increment: 1 } },
        })
        revalidatePath('/admin')
        return createSuccessResult('Kullanıcı oturumları sıfırlandı.')
    } catch (error) {
        return getActionErrorResult(error, 'Oturumlar sıfırlanamadı.')
    }
}

export async function unlockUserAction(targetUserId: string): Promise<ActionResult> {
    try {
        await requireSuperuser()
        await (await import('@/lib/prisma')).prisma.user.update({
            where: { id: targetUserId },
            data: { failedLoginAttempts: 0, lockedUntil: null },
        })
        revalidatePath('/admin')
        return createSuccessResult('Hesap kilidi kaldırıldı.')
    } catch (error) {
        return getActionErrorResult(error, 'Kilit kaldırılamadı.')
    }
}
