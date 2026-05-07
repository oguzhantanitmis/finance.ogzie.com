'use server'

import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import {
    type ActionResult,
    createSuccessResult,
    getActionErrorResult,
    resolveFormData,
    toOptionalString,
    toRequiredString,
} from '@/lib/action-result'
import { createManagedUser, deleteManagedUser } from '@/lib/admin-users'
import { requireSuperuser } from '@/lib/server-auth'

type UserField = 'email' | 'name' | 'password' | 'role'

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
        const user = await createManagedUser({
            email: toRequiredString(data.get('email'), 'email', 'E-posta'),
            name: toOptionalString(data.get('name')),
            password: toRequiredString(data.get('password'), 'password', 'Şifre'),
            role: parseUserRole(data.get('role')),
        })
        revalidatePath('/admin')
        return createSuccessResult('Kullanıcı oluşturuldu.', user.id)
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
