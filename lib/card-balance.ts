import { calculateMinimumPayment } from '@/lib/card-engine/payment-engine'

interface CardTransactionLike {
    type: string
    amount: number
}

interface CardPaymentLike {
    amount: number
}

interface CardStatementLike {
    statementBalance: number
    minimumPayment: number
    dueDate: Date
    status?: string
    paymentsReceived?: number
}

interface CardSnapshotInput {
    totalLimit: number
    minPaymentRate: number
    transactions: CardTransactionLike[]
    payments: CardPaymentLike[]
    statements?: CardStatementLike[]
}

export function calculateCurrentCardDebt(card: Pick<CardSnapshotInput, 'transactions' | 'payments'>) {
    const charges = card.transactions
        .filter((transaction) => transaction.type !== 'REFUND')
        .reduce((sum, transaction) => sum + transaction.amount, 0)

    const refunds = card.transactions
        .filter((transaction) => transaction.type === 'REFUND')
        .reduce((sum, transaction) => sum + transaction.amount, 0)

    const payments = card.payments.reduce((sum, payment) => sum + payment.amount, 0)

    return Math.max(charges - refunds - payments, 0)
}

export function getCardFinancialSnapshot(card: CardSnapshotInput, now = new Date()) {
    const currentDebt = calculateCurrentCardDebt(card)
    const latestStatement = card.statements?.[0] ?? null

    const statementBalance =
        latestStatement && latestStatement.statementBalance > 0
            ? latestStatement.statementBalance
            : currentDebt

    const minimumPayment =
        latestStatement && latestStatement.minimumPayment > 0
            ? latestStatement.minimumPayment
            : currentDebt > 0
                ? calculateMinimumPayment(card.totalLimit, currentDebt, card.minPaymentRate)
                : 0

    const utilization = card.totalLimit > 0 ? currentDebt / card.totalLimit : 0

    const isOverdue = Boolean(
        latestStatement &&
        statementBalance > 0 &&
        (
            latestStatement.status === 'OVERDUE' ||
            (
                latestStatement.dueDate < now &&
                (latestStatement.paymentsReceived ?? 0) < latestStatement.minimumPayment
            )
        ),
    )

    return {
        currentDebt,
        statementBalance,
        minimumPayment,
        dueDate: latestStatement?.dueDate ?? null,
        utilization,
        isOverdue,
    }
}
