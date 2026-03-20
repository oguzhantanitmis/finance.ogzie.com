import type {
    BillingCycle,
    BudgetAlertState,
    BudgetAlertType,
    RecordStatus,
} from '@prisma/client'

export interface SubscriptionDraft {
    name: string
    amount: number
    currency: string
    nextPayment: string
    billingCycle?: BillingCycle
    category?: string
}

export interface SubscriptionEnrichment {
    brandKey?: string
    displayName: string
    category: string
    color: string
    providerDomain?: string
    logoUrl?: string
    billingCycle: BillingCycle
    billingAnchorDay?: number
}

export interface RecurringExpenseInput {
    name: string
    category: string
    amount: number
    currency: string
    billingCycle: BillingCycle
    nextPayment: string
    billingAnchorDay?: number
    autopay?: boolean
    isEssential?: boolean
    notes?: string
}

export interface IncomeSourceInput {
    name: string
    amount: number
    currency: string
    billingCycle: BillingCycle
    payday?: number
    isPrimary?: boolean
}

export interface UpcomingObligation {
    id: string
    source: 'subscription' | 'recurring' | 'debt'
    name: string
    amount: number
    currency: string
    dueDate: Date
    category: string
    note?: string
}

export type MonthlyPaymentStatus = 'PAID' | 'OPEN' | 'OVERDUE' | 'PLANNED'

export type MonthlyPaymentSource =
    | 'loan_installment'
    | 'card_statement'
    | 'manual_debt'
    | 'subscription'
    | 'recurring'

export interface MonthlyPaymentItem {
    id: string
    source: MonthlyPaymentSource
    name: string
    amount: number
    currency: string
    dueDate: Date
    status: MonthlyPaymentStatus
    isEstimated: boolean
    detail?: {
        installmentNo?: number
        principalAmount?: number
        interestAmount?: number
        taxAmount?: number
        paidDate?: Date | null
        statementBalance?: number
        minimumPayment?: number
        cardStatus?: string
        billingCycle?: BillingCycle
        autopay?: boolean
        category?: string
        note?: string
        currentStatus?: string
    }
    navigateHref?: string
}

export interface MonthlyPaymentForecast {
    month: Date
    items: MonthlyPaymentItem[]
    totalScheduled: number
    totalPaid: number
    totalOpen: number
    totalOverdue: number
    totalPlanned: number
}

export interface FinanceAlertView {
    id: string
    type: BudgetAlertType
    state: BudgetAlertState
    title: string
    content: string
    dueDate: Date | null
}

export interface MonthlyBudgetSummary {
    month: Date
    plannedIncome: number
    fixedCommitments: number
    debtCommitments: number
    freeCash: number
    bufferTarget: number
    notes: string | null
    recurringLoad: number
    subscriptionLoad: number
    totalAssets: number
    totalDebts: number
    netWorth: number
    alerts: FinanceAlertView[]
    subscriptions: Array<{
        id: string
        name: string
        amount: number
        currency: string
        billingCycle: BillingCycle
        nextPayment: Date
        monthlyNormalizedAmount: number
        category: string
        logoUrl: string | null
        autopay: boolean
        notes: string | null
        status: RecordStatus
    }>
    recurringExpenses: Array<{
        id: string
        name: string
        amount: number
        currency: string
        billingCycle: BillingCycle
        nextPayment: Date
        category: string
        status: RecordStatus
        isEssential: boolean
        autopay: boolean
        notes: string | null
    }>
    incomeSources: Array<{
        id: string
        name: string
        amount: number
        currency: string
        billingCycle: BillingCycle
        payday: number | null
        status: RecordStatus
        isPrimary: boolean
    }>
    upcomingObligations: UpcomingObligation[]
}
