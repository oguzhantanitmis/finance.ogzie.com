// Tek seferlik superuser şifre sıfırlama — raw SQL (schema bağımsız)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const bcrypt   = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SUPERUSER_EMAIL = 'oguzhan@tanitmis.com'
const NEW_PASSWORD    = 'OgzieFinans2026!'

async function main() {
    const hash = await bcrypt.hash(NEW_PASSWORD, 12)

    // Raw SQL: sadece password + isActive güncelle, yeni kolonlara dokunma
    const result = await prisma.$executeRaw`
        UPDATE \`User\`
        SET    \`password\` = ${hash},
               \`isActive\` = 1,
               \`updatedAt\` = NOW()
        WHERE  \`email\` = ${SUPERUSER_EMAIL}
    `

    if (result === 0) {
        // Kullanıcı yoksa oluştur
        const cuid = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
        await prisma.$executeRaw`
            INSERT INTO \`User\` (\`id\`, \`email\`, \`password\`, \`name\`, \`role\`, \`isActive\`, \`createdAt\`, \`updatedAt\`)
            VALUES (${cuid}, ${SUPERUSER_EMAIL}, ${hash}, 'Oguzhan', 'SUPERUSER', 1, NOW(), NOW())
        `
        console.log('✅ Superuser oluşturuldu.')
    } else {
        console.log('✅ Şifre sıfırlandı.')
    }

    console.log('')
    console.log('  E-posta :', SUPERUSER_EMAIL)
    console.log('  Şifre   :', NEW_PASSWORD)
    console.log('  Giriş   : https://finance.ogzie.com/login')
}

main()
    .catch(e => { console.error('❌', e.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
