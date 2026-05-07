import 'dotenv/config'
import { AssetType, DebtType, PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = (process.env.SEED_SUPERUSER_EMAIL ?? 'oguzhan@tanitmis.com').trim().toLowerCase()
    const rawPassword = process.env.SEED_SUPERUSER_PASSWORD ?? process.env.SUPERUSER_PASSWORD

    if (!rawPassword) {
        throw new Error('SEED_SUPERUSER_PASSWORD veya SUPERUSER_PASSWORD tanımlanmalıdır.')
    }

    const user = await prisma.user.upsert({
        where: { email },
        create: {
            email,
            name: process.env.SEED_SUPERUSER_NAME ?? 'Oguzhan Tanitmis',
            password: await bcrypt.hash(rawPassword, 12),
            role: 'SUPERUSER',
            isActive: true,
            netWorth: 0,
            riskScore: 85,
        },
        update: {
            role: 'SUPERUSER',
            isActive: true,
        },
    })

    const existingAssets = await prisma.asset.count({ where: { userId: user.id } })
    const existingDebts = await prisma.debt.count({ where: { userId: user.id } })

    if (existingAssets === 0) {
        await prisma.asset.createMany({
            data: [
                {
                    userId: user.id,
                    name: 'Ziraat Vadesiz',
                    type: AssetType.BANK,
                    amount: 15400,
                    currency: 'TRY',
                },
                {
                    userId: user.id,
                    name: 'Fiziki Altın',
                    type: AssetType.GOLD,
                    amount: 10,
                    unitPrice: 2450,
                    currency: 'XAU',
                },
                {
                    userId: user.id,
                    name: 'Binance USDT',
                    type: AssetType.CRYPTO,
                    amount: 1250,
                    currency: 'USD',
                },
                {
                    userId: user.id,
                    name: 'Nakit Cüzdan',
                    type: AssetType.CASH,
                    amount: 850,
                    currency: 'TRY',
                },
            ],
        })
    }

    if (existingDebts === 0) {
        await prisma.debt.create({
            data: {
                userId: user.id,
                name: 'Garanti Bonus',
                type: DebtType.CREDIT_CARD,
                limit: 150000,
                cutOffDay: 10,
                paymentDueDay: 20,
                totalBalance: 24500.5,
                remainingBalance: 24500.5,
                interestRate: 4.25,
                minPaymentRate: 0.4,
            },
        })

        const loan = await prisma.debt.create({
            data: {
                userId: user.id,
                name: 'Yapı Kredi İhtiyaç',
                type: DebtType.LOAN,
                totalPrincipal: 100000,
                installments: 12,
                remainingInstallments: 8,
                totalBalance: 100000,
                remainingBalance: 92000,
                interestRate: 3.99,
            },
        })

        await prisma.paymentPlan.createMany({
            data: Array.from({ length: 12 }).map((_, index) => {
                const isPaid = index < 4
                const dueDate = new Date()
                dueDate.setMonth(dueDate.getMonth() + (index - 4))

                return {
                    debtId: loan.id,
                    installmentNo: index + 1,
                    amount: 11500,
                    principalAmount: 8050,
                    interestAmount: 2300,
                    taxAmount: 1150,
                    dueDate,
                    isPaid,
                    paidDate: isPaid ? new Date() : null,
                }
            }),
        })

        await prisma.debt.create({
            data: {
                userId: user.id,
                name: 'Enpara Ek Hesap',
                type: DebtType.KMH,
                limit: 20000,
                totalBalance: 5400,
                remainingBalance: 5400,
                interestRate: 5,
            },
        })
    }

    console.log(`Superuser hazır: ${user.email}`)
}

main()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
