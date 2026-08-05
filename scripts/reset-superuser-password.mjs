// Tek seferlik superuser şifre sıfırlama — Prisma ile sağlayıcı bağımsız.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const bcrypt   = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SUPERUSER_EMAIL = process.env.SUPERUSER_EMAIL?.trim().toLowerCase()
const NEW_PASSWORD = process.env.SUPERUSER_NEW_PASSWORD

async function main() {
    if (!SUPERUSER_EMAIL || !NEW_PASSWORD || NEW_PASSWORD.length < 12) {
        throw new Error('SUPERUSER_EMAIL ve en az 12 karakterli SUPERUSER_NEW_PASSWORD gerekli')
    }
    const hash = await bcrypt.hash(NEW_PASSWORD, 12)

    await prisma.user.upsert({
        where: { email: SUPERUSER_EMAIL },
        create: {
            email: SUPERUSER_EMAIL,
            password: hash,
            name: process.env.SUPERUSER_NAME?.trim() || 'Superuser',
            role: 'SUPERUSER',
            isActive: true,
        },
        update: { password: hash, isActive: true, sessionVersion: { increment: 1 } },
    })

    console.log('Superuser kimlik bilgileri güvenli biçimde güncellendi.')
}

main()
    .catch(e => { console.error('❌', e.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
