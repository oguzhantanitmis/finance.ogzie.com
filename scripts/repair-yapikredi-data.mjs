import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const USER_EMAIL = 'oguzhan@tanitmis.com'

function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100
}

function addMonths(date, months) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()))
}

function calculateLoanSchedule(principal, monthlyRate, installments, kkdfRate = 0.15, bsmvRate = 0.15) {
    const r = monthlyRate / 100
    const effectiveRate = r * (1 + kkdfRate + bsmvRate)
    const monthlyPayment = roundMoney(
        principal * (effectiveRate * Math.pow(1 + effectiveRate, installments)) /
        (Math.pow(1 + effectiveRate, installments) - 1),
    )
    let remainingPrincipal = roundMoney(principal)

    return Array.from({ length: installments }).map((_, index) => {
        const installmentNo = index + 1
        const interest = roundMoney(remainingPrincipal * r)
        const kkdf = roundMoney(interest * kkdfRate)
        const bsmv = roundMoney(interest * bsmvRate)
        const tax = roundMoney(kkdf + bsmv)
        const principalAmount = installmentNo === installments
            ? remainingPrincipal
            : roundMoney(monthlyPayment - interest - tax)

        remainingPrincipal = roundMoney(Math.max(0, remainingPrincipal - principalAmount))

        return {
            installmentNo,
            amount: installmentNo === installments ? roundMoney(principalAmount + interest + tax) : monthlyPayment,
            principalAmount,
            interestAmount: interest,
            taxAmount: tax,
            remainingPrincipal,
        }
    })
}

async function upsertYapiKrediLoan(userId) {
    const principal = 343_156.99
    const interestRate = 4.49
    const installments = 12
    const paidInstallments = 1
    const firstDueDate = new Date(Date.UTC(2026, 3, 4))
    const plan = calculateLoanSchedule(principal, interestRate, installments)
    const totalBalance = roundMoney(plan.reduce((total, item) => total + item.amount, 0))
    const remainingBalance = roundMoney(plan.slice(paidInstallments).reduce((total, item) => total + item.amount, 0))

    let debt = await prisma.debt.findFirst({
        where: {
            userId,
            type: 'LOAN',
            name: { contains: 'Yapı Kredi' },
        },
        select: { id: true },
    })

    if (!debt) {
        debt = await prisma.debt.findFirst({
            where: {
                userId,
                type: 'LOAN',
                name: { contains: 'Yapi Kredi' },
            },
            select: { id: true },
        })
    }

    const data = {
        userId,
        name: 'Yapı Kredi İhtiyaç',
        type: 'LOAN',
        limit: null,
        cutOffDay: null,
        paymentDueDay: 4,
        totalPrincipal: principal,
        installments,
        remainingInstallments: installments - paidInstallments,
        totalBalance,
        remainingBalance,
        interestRate,
        minPaymentRate: 0,
        kkdfRate: 0.15,
        bsmvRate: 0.15,
        dueDate: firstDueDate,
        lastPaymentDate: firstDueDate,
        isPaid: false,
    }

    debt = debt
        ? await prisma.debt.update({ where: { id: debt.id }, data, select: { id: true } })
        : await prisma.debt.create({ data, select: { id: true } })

    await prisma.paymentPlan.deleteMany({ where: { debtId: debt.id } })
    await prisma.paymentPlan.createMany({
        data: plan.map((item, index) => ({
            debtId: debt.id,
            installmentNo: item.installmentNo,
            amount: item.amount,
            principalAmount: item.principalAmount,
            interestAmount: item.interestAmount,
            taxAmount: item.taxAmount,
            dueDate: addMonths(firstDueDate, index),
            isPaid: item.installmentNo <= paidInstallments,
            paidDate: item.installmentNo <= paidInstallments ? addMonths(firstDueDate, index) : null,
        })),
    })

    return { debtId: debt.id, totalBalance, remainingBalance }
}

async function upsertYapiKrediKmh(userId) {
    const iban = 'TR720006701000000033914270'
    const data = {
        userId,
        name: 'Yapı Kredi Vadesiz',
        type: 'BANK_ACCOUNT',
        balance: -249_116.03,
        currency: 'TRY',
        bankName: 'Yapı Kredi',
        iban,
        hasKmh: true,
        kmhLimit: 250_000,
        kmhInterestRate: 4.25,
        kmhCutOffDay: 5,
        kmhPaymentDueDay: 20,
        kmhStatementDate: new Date(Date.UTC(2026, 4, 5)),
        kmhStatementPrincipal: 249_116.03,
        kmhStatementInterest: 28_640.96,
        kmhMinimumPayment: 41_096.76,
        kmhNextCutOffDate: new Date(Date.UTC(2026, 5, 5)),
        kmhNextPaymentDate: new Date(Date.UTC(2026, 4, 20)),
        isDefault: false,
        isActive: true,
    }

    const existing = await prisma.account.findFirst({
        where: {
            userId,
            OR: [
                { iban },
                { name: { contains: 'Yapı Kredi' } },
                { name: { contains: 'Yapi Kredi' } },
                { bankName: { contains: 'Yapı Kredi' } },
                { bankName: { contains: 'Yapi Kredi' } },
            ],
        },
        select: { id: true, notes: true },
    })

    const account = existing
        ? await prisma.account.update({
            where: { id: existing.id },
            data: { ...data, notes: existing.notes },
            select: { id: true },
        })
        : await prisma.account.create({
            data: {
                ...data,
                notes: 'Yapı Kredi Esnek Hesap özeti Nisan 2026 verileriyle oluşturuldu.',
            },
            select: { id: true },
        })

    return { accountId: account.id }
}

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: USER_EMAIL },
        select: { id: true, email: true },
    })

    if (!user) {
        throw new Error(`${USER_EMAIL} kullanicisi bulunamadi.`)
    }

    const loan = await upsertYapiKrediLoan(user.id)
    const kmh = await upsertYapiKrediKmh(user.id)

    console.log(JSON.stringify({ user: user.email, loan, kmh }, null, 2))
}

main()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
