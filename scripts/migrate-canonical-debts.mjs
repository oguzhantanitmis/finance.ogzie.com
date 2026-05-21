#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function roundMoney(value) {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function sourceKey(sourceType, sourceEntityId) {
  return `${sourceType}:${sourceEntityId}`
}

function daysOverdue(dueDate, now = new Date()) {
  if (!dueDate) return 0
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime()
  return Math.max(0, Math.floor((today - due) / 86400000))
}

function obligationStatus(obligation) {
  if (obligation.remainingAmount <= 0) return 'PAID'
  if (obligation.paidAmount > 0) return 'PARTIAL_PAID'
  if (daysOverdue(obligation.dueDate) > 0) return 'OVERDUE'
  return 'PENDING'
}

function debtStatus(currentBalance, obligations) {
  if (currentBalance <= 0) return 'PAID'
  if (obligations.some((obligation) => obligationStatus(obligation) === 'OVERDUE')) return 'OVERDUE'
  return 'ACTIVE'
}

function legacySourceType(type) {
  if (type === 'LOAN') return 'LOAN'
  if (type === 'CREDIT_CARD') return 'CREDIT_CARD'
  if (type === 'KMH') return 'KMH'
  if (type === 'PERSONAL') return 'PERSONAL_PAYABLE'
  return 'MANUAL'
}

function nextMonthlyDate(day) {
  if (!day) return new Date()
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28))
  if (date < now) date.setMonth(date.getMonth() + 1)
  return date
}

function accumulatedInterest(principal, monthlyRate, days, kkdfRate = 0.15, bsmvRate = 0.15) {
  if (principal <= 0 || monthlyRate <= 0 || days <= 0) return { interest: 0, tax: 0, total: 0 }
  const interest = (principal * monthlyRate * days) / 3000
  const tax = interest * (kkdfRate + bsmvRate)
  return {
    interest: roundMoney(interest),
    tax: roundMoney(tax),
    total: roundMoney(interest + tax),
  }
}

function kmhStatement(principal, monthlyRate, statementInterestTotal = null) {
  const estimated = accumulatedInterest(principal, monthlyRate, 30)
  const interestWithTax = roundMoney(statementInterestTotal ?? estimated.total)
  const minimumPrincipal = roundMoney(principal * 0.05)
  return {
    interestWithTax,
    minimumPrincipal,
    minimumPayment: roundMoney(minimumPrincipal + interestWithTax),
    periodDebt: roundMoney(principal + interestWithTax),
  }
}

async function upsertCanonicalDebt(userId, data, obligations) {
  const normalized = obligations.map((obligation) => {
    const totalAmount = roundMoney(obligation.totalAmount)
    const paidAmount = roundMoney(obligation.paidAmount ?? 0)
    const remainingAmount = roundMoney(obligation.remainingAmount ?? Math.max(0, totalAmount - paidAmount))
    return {
      ...obligation,
      principalAmount: roundMoney(obligation.principalAmount ?? totalAmount),
      interestAmount: roundMoney(obligation.interestAmount ?? 0),
      taxAmount: roundMoney(obligation.taxAmount ?? 0),
      lateFeeAmount: roundMoney(obligation.lateFeeAmount ?? 0),
      totalAmount,
      paidAmount,
      remainingAmount,
      status: obligation.status ?? obligationStatus({ ...obligation, totalAmount, paidAmount, remainingAmount }),
    }
  })

  const account = await prisma.debtAccount.upsert({
    where: {
      userId_sourceKey: {
        userId,
        sourceKey: data.sourceKey,
      },
    },
    create: {
      userId,
      ...data,
      status: debtStatus(data.currentBalance, normalized),
    },
    update: {
      ...data,
      status: debtStatus(data.currentBalance, normalized),
    },
  })

  await prisma.debtObligation.deleteMany({
    where: {
      debtAccountId: account.id,
      payments: { none: {} },
    },
  })

  if (normalized.length > 0) {
    await prisma.debtObligation.createMany({
      data: normalized.map((obligation) => ({
        debtAccountId: account.id,
        userId,
        ...obligation,
      })),
    })
  }

  return account.id
}

async function migrateLegacyDebt(userId, debtId) {
  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId },
    include: { paymentPlan: { orderBy: { installmentNo: 'asc' } } },
  })
  if (!debt) return null

  const sourceType = legacySourceType(debt.type)
  const obligations = debt.paymentPlan.length > 0
    ? debt.paymentPlan.map((plan) => ({
        type: 'INSTALLMENT',
        installmentNo: plan.installmentNo,
        dueDate: plan.dueDate,
        principalAmount: plan.principalAmount,
        interestAmount: plan.interestAmount,
        taxAmount: plan.taxAmount,
        totalAmount: plan.amount,
        paidAmount: plan.isPaid ? plan.amount : 0,
        remainingAmount: plan.isPaid ? 0 : plan.amount,
        status: plan.isPaid ? 'PAID' : undefined,
        metadata: { legacyPaymentPlanId: plan.id, source: 'PaymentPlan' },
      }))
    : debt.remainingBalance > 0
      ? [{
          type: debt.type === 'LOAN' ? 'INSTALLMENT' : 'MANUAL_PAYMENT',
          installmentNo: debt.remainingInstallments && debt.installments
            ? Math.max(1, debt.installments - debt.remainingInstallments + 1)
            : null,
          dueDate: debt.dueDate ?? nextMonthlyDate(debt.paymentDueDay),
          principalAmount: debt.remainingBalance,
          totalAmount: debt.remainingBalance,
          remainingAmount: debt.remainingBalance,
          metadata: { legacyDebtId: debt.id, source: 'Debt' },
        }]
      : []
  const openAmount = obligations
    .filter((obligation) => obligation.status !== 'PAID')
    .reduce((sum, obligation) => sum + roundMoney(obligation.remainingAmount ?? obligation.totalAmount), 0)

  return upsertCanonicalDebt(userId, {
    sourceType,
    sourceEntityId: debt.id,
    sourceKey: sourceKey(sourceType, debt.id),
    name: debt.name,
    counterpartyName: null,
    currency: 'TRY',
    limit: debt.limit,
    principalBalance: roundMoney(debt.totalPrincipal ?? debt.remainingBalance),
    statementBalance: roundMoney(openAmount),
    currentBalance: roundMoney(debt.remainingBalance),
    interestRate: debt.interestRate,
    lateInterestRate: null,
    kkdfRate: debt.kkdfRate,
    bsmvRate: debt.bsmvRate,
    cutOffDay: debt.cutOffDay,
    paymentDueDay: debt.paymentDueDay,
    statementDate: null,
    nextDueDate: obligations.find((obligation) => obligation.status !== 'PAID')?.dueDate ?? debt.dueDate,
    metadata: {
      source: 'Debt',
      legacyDebtId: debt.id,
      legacyDebtType: debt.type,
      installments: debt.installments,
      remainingInstallments: debt.remainingInstallments,
    },
  }, obligations)
}

async function migrateCreditCard(userId, cardId) {
  const card = await prisma.creditCard.findFirst({
    where: { id: cardId, userId },
    include: {
      statements: { orderBy: { statementDate: 'desc' }, take: 1 },
      transactions: { select: { type: true, amount: true } },
      payments: { select: { amount: true } },
    },
  })
  if (!card) return null

  const charges = card.transactions.filter((tx) => tx.type !== 'REFUND').reduce((sum, tx) => sum + tx.amount, 0)
  const refunds = card.transactions.filter((tx) => tx.type === 'REFUND').reduce((sum, tx) => sum + tx.amount, 0)
  const payments = card.payments.reduce((sum, payment) => sum + payment.amount, 0)
  const currentDebt = roundMoney(card.currentDebt && card.currentDebt > 0 ? card.currentDebt : Math.max(charges - refunds - payments, 0))
  const statement = card.statements[0] ?? null
  const statementBalance = roundMoney(statement?.statementBalance ?? currentDebt)
  const paidMinimum = roundMoney(statement?.paymentsReceived ?? 0)
  const minimumPayment = roundMoney(Math.max(0, (statement?.minimumPayment ?? statementBalance * card.minPaymentRate) - paidMinimum))
  const dueDate = statement?.dueDate ?? card.dueDate ?? nextMonthlyDate(card.paymentDueDay)
  const lateCost = daysOverdue(dueDate) > 0
    ? accumulatedInterest(Math.max(0, statementBalance - paidMinimum), card.defaultRate, daysOverdue(dueDate), card.kkdfRate, card.bsmvRate)
    : { interest: 0, tax: 0, total: 0 }
  const totalDue = roundMoney(minimumPayment + lateCost.total)
  const obligations = totalDue > 0
    ? [{
        type: 'MINIMUM_PAYMENT',
        dueDate,
        principalAmount: minimumPayment,
        interestAmount: lateCost.interest,
        taxAmount: lateCost.tax,
        lateFeeAmount: lateCost.total,
        totalAmount: totalDue,
        remainingAmount: totalDue,
        metadata: { source: 'CreditCard', statementId: statement?.id ?? null, minimumPayment, overdueDays: daysOverdue(dueDate) },
      }]
    : []

  return upsertCanonicalDebt(userId, {
    sourceType: 'CREDIT_CARD',
    sourceEntityId: card.id,
    sourceKey: sourceKey('CREDIT_CARD', card.id),
    name: card.cardName,
    counterpartyName: card.bankName,
    currency: 'TRY',
    limit: card.totalLimit,
    principalBalance: currentDebt,
    statementBalance,
    currentBalance: currentDebt,
    interestRate: card.contractualRate,
    lateInterestRate: card.defaultRate,
    kkdfRate: card.kkdfRate,
    bsmvRate: card.bsmvRate,
    cutOffDay: card.cutOffDay,
    paymentDueDay: card.paymentDueDay,
    statementDate: statement?.statementDate ?? card.statementDate,
    nextDueDate: dueDate,
    metadata: { source: 'CreditCard', cardId: card.id, statementId: statement?.id ?? null },
  }, obligations)
}

async function migrateKmhAccount(userId, accountId) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId, hasKmh: true } })
  if (!account) return null

  const usedAmount = roundMoney(Math.max(account.balance * -1, 0))
  const principal = roundMoney(account.kmhStatementPrincipal ?? usedAmount)
  if (principal <= 0) return null

  const statement = kmhStatement(principal, account.kmhInterestRate ?? 4.25, account.kmhStatementInterest)
  const dueDate = account.kmhNextPaymentDate ?? nextMonthlyDate(account.kmhPaymentDueDay)
  const lateCost = accumulatedInterest(principal, account.kmhLateInterestRate ?? 4.55, daysOverdue(dueDate))
  const minimumPayment = roundMoney(account.kmhMinimumPayment ?? statement.minimumPayment)
  const totalDue = roundMoney(minimumPayment + lateCost.total)
  const obligations = totalDue > 0
    ? [{
        type: 'MINIMUM_PAYMENT',
        dueDate,
        principalAmount: statement.minimumPrincipal,
        interestAmount: statement.interestWithTax,
        taxAmount: 0,
        lateFeeAmount: lateCost.total,
        totalAmount: totalDue,
        remainingAmount: totalDue,
        metadata: {
          source: 'Account.KMH',
          accountId: account.id,
          minimumPrincipal: statement.minimumPrincipal,
          interestWithTax: statement.interestWithTax,
          overdueDays: daysOverdue(dueDate),
        },
      }]
    : []

  return upsertCanonicalDebt(userId, {
    sourceType: 'KMH',
    sourceEntityId: account.id,
    sourceKey: sourceKey('KMH', account.id),
    name: `${account.name} KMH`,
    counterpartyName: account.bankName,
    currency: account.currency,
    limit: account.kmhLimit,
    principalBalance: principal,
    statementBalance: statement.periodDebt,
    currentBalance: statement.periodDebt,
    interestRate: account.kmhInterestRate ?? 4.25,
    lateInterestRate: account.kmhLateInterestRate ?? 4.55,
    kkdfRate: 0.15,
    bsmvRate: 0.15,
    cutOffDay: account.kmhCutOffDay,
    paymentDueDay: account.kmhPaymentDueDay,
    statementDate: account.kmhStatementDate,
    nextDueDate: dueDate,
    metadata: {
      source: 'Account.KMH',
      accountId: account.id,
      kmhNextCutOffDate: account.kmhNextCutOffDate?.toISOString() ?? null,
      kmhMinimumPrincipalPayment: statement.minimumPrincipal,
      kmhStatementInterest: statement.interestWithTax,
      kmhMinimumPayment: minimumPayment,
    },
  }, obligations)
}

async function migratePayable(userId, payableId) {
  const record = await prisma.receivablePayable.findFirst({
    where: { id: payableId, userId, type: 'PAYABLE' },
    include: { person: true, installments: { orderBy: { installmentNo: 'asc' } } },
  })
  if (!record) return null

  const obligations = record.installments.length > 0
    ? record.installments
        .filter((installment) => installment.status !== 'CANCELED')
        .map((installment) => ({
          type: 'INSTALLMENT',
          installmentNo: installment.installmentNo,
          dueDate: installment.dueDate,
          principalAmount: installment.plannedAmount,
          totalAmount: installment.plannedAmount,
          paidAmount: installment.paidAmount,
          remainingAmount: installment.remainingAmount,
          status: installment.remainingAmount <= 0 ? 'PAID' : installment.status === 'OVERDUE' ? 'OVERDUE' : undefined,
          metadata: { source: 'ReceivablePayable', installmentId: installment.id },
        }))
    : record.remainingAmount > 0
      ? [{
          type: 'MANUAL_PAYMENT',
          dueDate: record.dueDate ?? new Date(),
          principalAmount: record.remainingAmount,
          totalAmount: record.remainingAmount,
          remainingAmount: record.remainingAmount,
          metadata: { source: 'ReceivablePayable', receivablePayableId: record.id },
        }]
      : []

  return upsertCanonicalDebt(userId, {
    sourceType: 'PERSONAL_PAYABLE',
    sourceEntityId: record.id,
    sourceKey: sourceKey('PERSONAL_PAYABLE', record.id),
    name: record.title ?? record.description,
    counterpartyName: record.person.name,
    currency: record.currency,
    limit: null,
    principalBalance: record.remainingAmount,
    statementBalance: record.remainingAmount,
    currentBalance: record.remainingAmount,
    interestRate: 0,
    lateInterestRate: null,
    kkdfRate: 0,
    bsmvRate: 0,
    cutOffDay: null,
    paymentDueDay: null,
    statementDate: null,
    nextDueDate: obligations.find((obligation) => obligation.status !== 'PAID')?.dueDate ?? record.dueDate,
    metadata: {
      source: 'ReceivablePayable',
      receivablePayableId: record.id,
      personId: record.personId,
      riskLevel: record.riskLevel,
      isInstallment: record.isInstallment,
    },
  }, obligations)
}

async function main() {
  const userWhere = process.env.USER_EMAIL ? { email: process.env.USER_EMAIL } : {}
  const users = await prisma.user.findMany({ where: userWhere, select: { id: true, email: true } })
  let createdOrUpdated = 0

  for (const user of users) {
    const [debts, cards, kmhAccounts, payables] = await Promise.all([
      prisma.debt.findMany({ where: { userId: user.id }, select: { id: true } }),
      prisma.creditCard.findMany({ where: { userId: user.id }, select: { id: true } }),
      prisma.account.findMany({ where: { userId: user.id, hasKmh: true }, select: { id: true } }),
      prisma.receivablePayable.findMany({ where: { userId: user.id, type: 'PAYABLE' }, select: { id: true } }),
    ])

    for (const debt of debts) if (await migrateLegacyDebt(user.id, debt.id)) createdOrUpdated += 1
    for (const card of cards) if (await migrateCreditCard(user.id, card.id)) createdOrUpdated += 1
    for (const account of kmhAccounts) if (await migrateKmhAccount(user.id, account.id)) createdOrUpdated += 1
    for (const payable of payables) if (await migratePayable(user.id, payable.id)) createdOrUpdated += 1

    console.log(`canonical debt backfill: ${user.email} tamamlandı`)
  }

  console.log(`canonical debt backfill: ${createdOrUpdated} kayıt işlendi`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
