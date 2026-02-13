const { PrismaClient } = require('@prisma/client')

try {
    const prisma = new PrismaClient()
    console.log('Prisma Client initialized successfully')
    prisma.$disconnect()
} catch (e) {
    console.error('Prisma Client failed:', e)
}
