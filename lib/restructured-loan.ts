import type { Debt, Prisma } from '@prisma/client'

import restructuredLoanData from '@/lib/restructured-loan-data.json'

export interface RestructuredLoanRow {
    installmentNo: number
    dueDate: string
    amount: number
    principalAmount: number
    interestAmount: number
    taxAmount: number
    remainingPrincipal: number
}

export interface RestructuredLoanProfile {
    customerNumber: string
    creditNumber: string
    loanType: string
    contractDate: string
    startDueDate: string
    paymentDueDay: number
    totalPrincipal: number
    totalBalance: number
    interestRate: number
    kkdfRate: number
    bsmvRate: number
    installments: number
    rows: RestructuredLoanRow[]
}

export const RESTRUCTURED_LOAN_PROFILE: RestructuredLoanProfile = restructuredLoanData

function toDateOnlyValue(date: Date | string | null | undefined) {
    if (!date) return null

    const value = typeof date === 'string' ? new Date(date) : date
    if (Number.isNaN(value.getTime())) return null

    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function sameNumber(left: number | null | undefined, right: number | null | undefined) {
    if (left == null && right == null) return true
    if (left == null || right == null) return false
    return Math.abs(left - right) < 0.01
}

export function getRestructuredLoanDebtData() {
    return {
        totalPrincipal: RESTRUCTURED_LOAN_PROFILE.totalPrincipal,
        totalBalance: RESTRUCTURED_LOAN_PROFILE.totalBalance,
        remainingBalance: RESTRUCTURED_LOAN_PROFILE.totalPrincipal,
        interestRate: RESTRUCTURED_LOAN_PROFILE.interestRate,
        kkdfRate: RESTRUCTURED_LOAN_PROFILE.kkdfRate,
        bsmvRate: RESTRUCTURED_LOAN_PROFILE.bsmvRate,
        installments: RESTRUCTURED_LOAN_PROFILE.installments,
        remainingInstallments: RESTRUCTURED_LOAN_PROFILE.installments,
        dueDate: new Date(RESTRUCTURED_LOAN_PROFILE.startDueDate),
        paymentDueDay: RESTRUCTURED_LOAN_PROFILE.paymentDueDay,
        isPaid: false,
    }
}

export function getRestructuredLoanPaymentPlanRows(debtId: string): Prisma.PaymentPlanCreateManyInput[] {
    return RESTRUCTURED_LOAN_PROFILE.rows.map((row) => ({
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

export function shouldRebuildLoanPaymentPlan(
    existingDebt: Pick<Debt, 'type' | 'totalPrincipal' | 'installments' | 'interestRate' | 'kkdfRate' | 'bsmvRate' | 'dueDate'> & {
        paymentPlan: Array<{ id: string }>
    },
    nextValues: {
        totalPrincipal: number | null
        installments: number | null
        interestRate: number
        kkdfRate: number
        bsmvRate: number
        dueDate: Date | null
    },
) {
    if (existingDebt.type !== 'LOAN') {
        return true
    }

    if (existingDebt.paymentPlan.length === 0) {
        return true
    }

    return !(
        sameNumber(existingDebt.totalPrincipal, nextValues.totalPrincipal) &&
        sameNumber(existingDebt.installments, nextValues.installments) &&
        sameNumber(existingDebt.interestRate, nextValues.interestRate) &&
        sameNumber(existingDebt.kkdfRate, nextValues.kkdfRate) &&
        sameNumber(existingDebt.bsmvRate, nextValues.bsmvRate) &&
        toDateOnlyValue(existingDebt.dueDate) === toDateOnlyValue(nextValues.dueDate)
    )
}
