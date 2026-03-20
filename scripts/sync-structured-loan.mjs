import fs from 'node:fs'
import path from 'node:path'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const structuredLoanPath = path.resolve(process.cwd(), 'lib/restructured-loan-data.json')
const structuredLoan = JSON.parse(fs.readFileSync(structuredLoanPath, 'utf8'))

function parseArgs(argv) {
    const result = {}

    for (const arg of argv) {
        if (!arg.startsWith('--')) continue

        const [key, value] = arg.slice(2).split('=')
        result[key] = value ?? 'true'
    }

    return result
}

function buildPlanRows(debtId) {
    return structuredLoan.rows.map((row) => ({
        debtId,
        installmentNo: row.installmentNo,
        amount: row.amount,
        principalAmount: row.principalAmount,
        interestAmount: row.interestAmount,
        taxAmount: row.taxAmount,
        dueDate: new Date(row.dueDate),
        isPaid: false,
    }))
}

async function resolveUser(args) {
    if (args.userId) {
        return prisma.user.findUnique({ where: { id: args.userId } })
    }

    if (args.email) {
        return prisma.user.findUnique({ where: { email: args.email } })
    }

    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true },
        take: 2,
    })

    if (users.length !== 1) {
        throw new Error('Birden fazla kullanıcı bulundu. --email veya --userId verin.')
    }

    return users[0]
}

async function resolveDebt(userId, args) {
    if (args.debtId) {
        return prisma.debt.findFirst({
            where: {
                id: args.debtId,
                userId,
                type: 'LOAN',
            },
            select: { id: true, name: true },
        })
    }

    const debts = await prisma.debt.findMany({
        where: {
            userId,
            type: 'LOAN',
            isPaid: false,
        },
        select: { id: true, name: true },
        take: 2,
    })

    if (debts.length !== 1) {
        throw new Error('Tekil aktif LOAN kaydı bulunamadı. --debtId ile manuel kayıt seçin.')
    }

    return debts[0]
}

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL tanımlı değil. Script çalıştırılmadı.')
    }

    const args = parseArgs(process.argv.slice(2))
    const isDryRun = args['dry-run'] === 'true'

    const user = await resolveUser(args)
    if (!user) {
        throw new Error('Kullanıcı bulunamadı.')
    }

    const debt = await resolveDebt(user.id, args)
    if (!debt) {
        throw new Error('Hedef kredi kaydı bulunamadı.')
    }

    const paidInstallmentCount = await prisma.paymentPlan.count({
        where: {
            debtId: debt.id,
            isPaid: true,
        },
    })

    if (paidInstallmentCount > 0) {
        throw new Error('Kayıtta ödenmiş taksit var. Güvenlik nedeniyle otomatik sync durduruldu.')
    }

    const debtUpdate = {
        totalPrincipal: structuredLoan.totalPrincipal,
        totalBalance: structuredLoan.totalBalance,
        remainingBalance: structuredLoan.totalPrincipal,
        interestRate: structuredLoan.interestRate,
        kkdfRate: structuredLoan.kkdfRate,
        bsmvRate: structuredLoan.bsmvRate,
        installments: structuredLoan.installments,
        remainingInstallments: structuredLoan.installments,
        dueDate: new Date(structuredLoan.startDueDate),
        paymentDueDay: structuredLoan.paymentDueDay,
        isPaid: false,
    }

    if (isDryRun) {
        console.log(JSON.stringify({
            mode: 'dry-run',
            user,
            debt,
            debtUpdate,
            paymentPlanCount: structuredLoan.rows.length,
        }, null, 2))
        return
    }

    await prisma.$transaction([
        prisma.debt.update({
            where: { id: debt.id },
            data: debtUpdate,
        }),
        prisma.paymentPlan.deleteMany({
            where: {
                debtId: debt.id,
                isPaid: false,
            },
        }),
        prisma.paymentPlan.createMany({
            data: buildPlanRows(debt.id),
        }),
    ])

    console.log(JSON.stringify({
        mode: 'applied',
        userId: user.id,
        debtId: debt.id,
        creditNumber: structuredLoan.creditNumber,
        installments: structuredLoan.installments,
    }, null, 2))
}

main()
    .catch((error) => {
        console.error(String(error))
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
