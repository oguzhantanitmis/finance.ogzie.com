-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPERUSER');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BudgetAlertType" AS ENUM ('UPCOMING_PAYMENT', 'BUDGET_PRESSURE', 'RENEWAL', 'PRICE_CHANGE');

-- CreateEnum
CREATE TYPE "BudgetAlertState" AS ENUM ('OPEN', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('CASH', 'BANK', 'GOLD', 'FX', 'CRYPTO', 'STOCK', 'ESTATE', 'OTHER', 'RECEIVABLE');

-- CreateEnum
CREATE TYPE "RPType" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateEnum
CREATE TYPE "RPStatus" AS ENUM ('OPEN', 'PARTIAL', 'CLOSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "RPPaymentPlanType" AS ENUM ('ONE_TIME', 'INSTALLMENT', 'FLEXIBLE', 'CUSTOM_DATES');

-- CreateEnum
CREATE TYPE "RPRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RPInstallmentStatus" AS ENUM ('PENDING', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'POSTPONED', 'CANCELED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "RPEventType" AS ENUM ('CREATED', 'PLAN_CREATED', 'PAYMENT_RECEIVED', 'PARTIAL_PAYMENT_RECEIVED', 'PAYMENT_MADE', 'PARTIAL_PAYMENT_MADE', 'INSTALLMENT_OVERDUE', 'NOTE_ADDED', 'RESCHEDULED', 'CLOSED', 'CANCELED', 'UPDATED');

-- CreateEnum
CREATE TYPE "RPNoteType" AS ENUM ('GENERAL', 'PAYMENT', 'DELAY', 'RESCHEDULE', 'PERSON_INTERNAL');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BANK_ACCOUNT', 'CASH', 'WALLET', 'INVESTMENT', 'OTHER_ACCOUNT');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('INCOME', 'EXPENSE', 'COLLECTION', 'PAYMENT_TO_PERSON', 'CARD_PAYMENT', 'SUBSCRIPTION_PAYMENT', 'DEBT_PAYMENT', 'DEBT_ADDITION', 'RECEIVABLE_ADDITION', 'TRANSFER', 'BALANCE_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('GOAL_ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('CREDIT_CARD', 'LOAN', 'KMH', 'PERSONAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "DebtSourceType" AS ENUM ('LOAN', 'CREDIT_CARD', 'KMH', 'PERSONAL_PAYABLE', 'MANUAL');

-- CreateEnum
CREATE TYPE "DebtObligationType" AS ENUM ('INSTALLMENT', 'MINIMUM_PAYMENT', 'STATEMENT_PAYMENT', 'FULL_PAYMENT', 'MANUAL_PAYMENT');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('ACTIVE', 'OVERDUE', 'PAID', 'CLOSED');

-- CreateEnum
CREATE TYPE "DebtObligationStatus" AS ENUM ('PENDING', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "CardNetwork" AS ENUM ('VISA', 'MASTERCARD', 'TROY', 'AMERICAN_EXPRESS');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'INSTALLMENT_PURCHASE', 'CASH_ADVANCE', 'FEE', 'REFUND', 'ADJUSTMENT', 'INTEREST_CHARGE', 'TAX_CHARGE');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('OPEN', 'PAID', 'CLOSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "InterestType" AS ENUM ('CONTRACTUAL', 'DEFAULT_INTEREST', 'CASH_ADVANCE_INTEREST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "preferredCurrency" TEXT NOT NULL DEFAULT 'TRY',
    "locale" TEXT NOT NULL DEFAULT 'tr-TR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "passwordResetToken" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),
    "riskScore" INTEGER NOT NULL DEFAULT 100,
    "aiMonthlyTokenLimit" INTEGER NOT NULL DEFAULT 30000,
    "netWorth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ogzie',
    "issuer" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "emailSnapshot" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OgzieCommand" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OgzieCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActionLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "lastValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "type" "DebtType" NOT NULL,
    "limit" DOUBLE PRECISION,
    "cutOffDay" INTEGER,
    "paymentDueDay" INTEGER,
    "totalPrincipal" DOUBLE PRECISION,
    "installments" INTEGER,
    "remainingInstallments" INTEGER,
    "totalBalance" DOUBLE PRECISION NOT NULL,
    "remainingBalance" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minPaymentRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "kkdfRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "bsmvRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "dueDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "interestAmount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" TIMESTAMP(3),

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" "DebtSourceType" NOT NULL,
    "sourceEntityId" TEXT,
    "sourceKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "counterpartyName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" "DebtStatus" NOT NULL DEFAULT 'ACTIVE',
    "limit" DOUBLE PRECISION,
    "principalBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statementBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateInterestRate" DOUBLE PRECISION,
    "kkdfRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "bsmvRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "cutOffDay" INTEGER,
    "paymentDueDay" INTEGER,
    "statementDate" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebtAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtObligation" (
    "id" TEXT NOT NULL,
    "debtAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DebtObligationType" NOT NULL,
    "installmentNo" INTEGER,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "principalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interestAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "DebtObligationStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebtObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtPayment" (
    "id" TEXT NOT NULL,
    "debtAccountId" TEXT NOT NULL,
    "obligationId" TEXT,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocation" JSONB,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT,
    "debtId" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "billingCycle" "BillingCycle" NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Genel',
    "nextPayment" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "brandKey" TEXT,
    "providerDomain" TEXT,
    "logoUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#27272A',
    "billingAnchorDay" INTEGER,
    "autopay" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "lastAmount" DOUBLE PRECISION,
    "monthlyNormalizedAmount" DOUBLE PRECISION,
    "isEssential" BOOLEAN NOT NULL DEFAULT false,
    "linkedAccountId" TEXT,
    "source" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "billingCycle" "BillingCycle" NOT NULL,
    "billingAnchorDay" INTEGER,
    "nextPayment" TIMESTAMP(3) NOT NULL,
    "autopay" BOOLEAN NOT NULL DEFAULT false,
    "isEssential" BOOLEAN NOT NULL DEFAULT true,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "billingCycle" "BillingCycle" NOT NULL,
    "payday" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetMonth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "openingCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedCommitments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "debtCommitments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedReceivableCollection" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savingGoal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "debtPaymentBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manualAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bufferTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BudgetAlertType" NOT NULL,
    "state" "BudgetAlertState" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "dedupeKey" TEXT NOT NULL,
    "metadata" JSONB,
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceJournal" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isParsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FinanceJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "financialRecordId" TEXT,
    "installmentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "reminderType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "netWorth" DOUBLE PRECISION NOT NULL,
    "totalAssets" DOUBLE PRECISION NOT NULL,
    "totalDebts" DOUBLE PRECISION NOT NULL,
    "assets" JSONB NOT NULL,
    "debts" JSONB NOT NULL,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "cardProgram" TEXT,
    "last4Digits" TEXT NOT NULL,
    "cardNetwork" "CardNetwork" NOT NULL DEFAULT 'VISA',
    "status" "CardStatus" NOT NULL DEFAULT 'ACTIVE',
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "logoPath" TEXT,
    "cardImagePath" TEXT,
    "description" TEXT,
    "totalLimit" DOUBLE PRECISION NOT NULL,
    "cashAdvanceLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableLimit" DOUBLE PRECISION,
    "currentDebt" DOUBLE PRECISION,
    "cutOffDay" INTEGER NOT NULL,
    "paymentDueDay" INTEGER NOT NULL,
    "statementDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "contractualRate" DOUBLE PRECISION NOT NULL DEFAULT 4.42,
    "defaultRate" DOUBLE PRECISION NOT NULL DEFAULT 5.42,
    "cashAdvanceRate" DOUBLE PRECISION NOT NULL DEFAULT 5.92,
    "kkdfRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "bsmvRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "minPaymentRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "rewardsPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "useGlobalRates" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardStatement" (
    "id" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "previousBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interestCharged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxCharged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentsReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statementBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatementStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardTransaction" (
    "id" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "statementId" TEXT,
    "type" "TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "remainingAmount" DOUBLE PRECISION NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalInstallments" INTEGER NOT NULL DEFAULT 1,
    "currentInstallment" INTEGER NOT NULL DEFAULT 1,
    "isCashAdvance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardInstallment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "statementId" TEXT,
    "installmentNo" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardPayment" (
    "id" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "statementId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "allocationDetail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestAccrual" (
    "id" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "statementId" TEXT,
    "type" "InterestType" NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "dayCount" INTEGER NOT NULL,
    "interest" DOUBLE PRECISION NOT NULL,
    "kkdf" DOUBLE PRECISION NOT NULL,
    "bsmv" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterestAccrual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCardInterestRecord" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "interestType" TEXT NOT NULL,
    "period" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditCardInterestRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivablePayable" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "RPType" NOT NULL,
    "title" TEXT,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "principalAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "status" "RPStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "internalNote" TEXT,
    "isInstallment" BOOLEAN NOT NULL DEFAULT false,
    "installmentCount" INTEGER,
    "paymentPlanType" "RPPaymentPlanType" NOT NULL DEFAULT 'ONE_TIME',
    "firstInstallmentDate" TIMESTAMP(3),
    "installmentPeriod" TEXT,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderOptions" JSONB,
    "overdueAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "riskLevel" "RPRiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "receiptFile" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivablePayable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RPTransaction" (
    "id" TEXT NOT NULL,
    "receivablePayableId" TEXT NOT NULL,
    "installmentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT,
    "cardId" TEXT,
    "transactionType" TEXT NOT NULL DEFAULT 'payment',
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "paymentMethod" TEXT,
    "isCash" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "receiptFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RPTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RPInstallment" (
    "id" TEXT NOT NULL,
    "receivablePayableId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "plannedAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL,
    "status" "RPInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RPInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RPRecordNote" (
    "id" TEXT NOT NULL,
    "receivablePayableId" TEXT NOT NULL,
    "personId" TEXT,
    "note" TEXT NOT NULL,
    "noteType" "RPNoteType" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RPRecordNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RPRecordEvent" (
    "id" TEXT NOT NULL,
    "receivablePayableId" TEXT NOT NULL,
    "eventType" "RPEventType" NOT NULL,
    "eventText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RPRecordEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "bankName" TEXT,
    "iban" TEXT,
    "hasKmh" BOOLEAN NOT NULL DEFAULT false,
    "kmhLimit" DOUBLE PRECISION,
    "kmhInterestRate" DOUBLE PRECISION,
    "kmhLateInterestRate" DOUBLE PRECISION,
    "kmhCutOffDay" INTEGER,
    "kmhPaymentDueDay" INTEGER,
    "kmhStatementDate" TIMESTAMP(3),
    "kmhStatementPrincipal" DOUBLE PRECISION,
    "kmhStatementInterest" DOUBLE PRECISION,
    "kmhMinimumPayment" DOUBLE PRECISION,
    "kmhNextCutOffDate" TIMESTAMP(3),
    "kmhNextPaymentDate" TIMESTAMP(3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "description" TEXT,
    "category" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT,
    "personId" TEXT,
    "creditCardId" TEXT,
    "debtId" TEXT,
    "subscriptionId" TEXT,
    "rpTransactionId" TEXT,
    "source" TEXT,
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OgzieIngestBatch" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OgzieIngestBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardFinanceSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contractualRate" DOUBLE PRECISION NOT NULL DEFAULT 4.42,
    "defaultRate" DOUBLE PRECISION NOT NULL DEFAULT 5.42,
    "cashAdvanceRate" DOUBLE PRECISION NOT NULL DEFAULT 5.92,
    "minPaymentRateBelow50k" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "minPaymentRateAbove50k" DOUBLE PRECISION NOT NULL DEFAULT 0.40,
    "kkdfRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "bsmvRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardFinanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalType" TEXT NOT NULL DEFAULT 'SAVINGS',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "monthlyRequiredAmount" DOUBLE PRECISION,
    "status" "GoalStatus" NOT NULL DEFAULT 'GOAL_ACTIVE',
    "category" TEXT,
    "relatedRecordId" TEXT,
    "relatedDebtId" TEXT,
    "relatedCardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketRate" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'COLLECTAPI_ECONOMY',
    "currencyCode" TEXT NOT NULL,
    "seriesCode" TEXT NOT NULL,
    "buyRate" DOUBLE PRECISION,
    "sellRate" DOUBLE PRECISION,
    "rateDate" TIMESTAMP(3) NOT NULL,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "totalAssets" DOUBLE PRECISION NOT NULL,
    "totalDebts" DOUBLE PRECISION NOT NULL,
    "netWorth" DOUBLE PRECISION NOT NULL,
    "liquidityRatio" DOUBLE PRECISION NOT NULL,
    "leverageRatio" DOUBLE PRECISION NOT NULL,
    "creditUtilization" DOUBLE PRECISION,
    "monthlyDebtService" DOUBLE PRECISION,
    "fixedExpenseRatio" DOUBLE PRECISION,
    "improvementTips" JSONB,
    "breakdown" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reasoning" TEXT,
    "risk" TEXT,
    "suggestedAction" TEXT,
    "relatedEntityId" TEXT,
    "relatedEntityType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isActedOn" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPaymentPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "strategy" TEXT NOT NULL,
    "totalAvailable" DOUBLE PRECISION NOT NULL,
    "planData" JSONB NOT NULL,
    "isApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "ExternalIdentity_userId_idx" ON "ExternalIdentity"("userId");

-- CreateIndex
CREATE INDEX "ExternalIdentity_provider_idx" ON "ExternalIdentity"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentity_issuer_subject_key" ON "ExternalIdentity"("issuer", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "OgzieCommand_commandId_key" ON "OgzieCommand"("commandId");

-- CreateIndex
CREATE INDEX "OgzieCommand_userId_createdAt_idx" ON "OgzieCommand"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OgzieCommand_status_idx" ON "OgzieCommand"("status");

-- CreateIndex
CREATE INDEX "AiUsage_period_idx" ON "AiUsage"("period");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_userId_period_key" ON "AiUsage"("userId", "period");

-- CreateIndex
CREATE INDEX "LoginHistory_userId_createdAt_idx" ON "LoginHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginHistory_createdAt_idx" ON "LoginHistory"("createdAt");

-- CreateIndex
CREATE INDEX "UserActionLog_actorId_createdAt_idx" ON "UserActionLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "UserActionLog_targetId_createdAt_idx" ON "UserActionLog"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "UserActionLog_action_createdAt_idx" ON "UserActionLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "DebtAccount_userId_idx" ON "DebtAccount"("userId");

-- CreateIndex
CREATE INDEX "DebtAccount_userId_status_idx" ON "DebtAccount"("userId", "status");

-- CreateIndex
CREATE INDEX "DebtAccount_sourceType_idx" ON "DebtAccount"("sourceType");

-- CreateIndex
CREATE INDEX "DebtAccount_status_idx" ON "DebtAccount"("status");

-- CreateIndex
CREATE INDEX "DebtAccount_nextDueDate_idx" ON "DebtAccount"("nextDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "DebtAccount_userId_sourceKey_key" ON "DebtAccount"("userId", "sourceKey");

-- CreateIndex
CREATE INDEX "DebtObligation_debtAccountId_idx" ON "DebtObligation"("debtAccountId");

-- CreateIndex
CREATE INDEX "DebtObligation_userId_idx" ON "DebtObligation"("userId");

-- CreateIndex
CREATE INDEX "DebtObligation_dueDate_idx" ON "DebtObligation"("dueDate");

-- CreateIndex
CREATE INDEX "DebtObligation_status_idx" ON "DebtObligation"("status");

-- CreateIndex
CREATE INDEX "DebtPayment_debtAccountId_idx" ON "DebtPayment"("debtAccountId");

-- CreateIndex
CREATE INDEX "DebtPayment_obligationId_idx" ON "DebtPayment"("obligationId");

-- CreateIndex
CREATE INDEX "DebtPayment_userId_idx" ON "DebtPayment"("userId");

-- CreateIndex
CREATE INDEX "DebtPayment_accountId_idx" ON "DebtPayment"("accountId");

-- CreateIndex
CREATE INDEX "DebtPayment_paymentDate_idx" ON "DebtPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Subscription_userId_providerDomain_idx" ON "Subscription"("userId", "providerDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_source_externalId_key" ON "Subscription"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetMonth_userId_month_key" ON "BudgetMonth"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAlert_dedupeKey_key" ON "BudgetAlert"("dedupeKey");

-- CreateIndex
CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");

-- CreateIndex
CREATE INDEX "Reminder_financialRecordId_idx" ON "Reminder"("financialRecordId");

-- CreateIndex
CREATE INDEX "Reminder_installmentId_idx" ON "Reminder"("installmentId");

-- CreateIndex
CREATE INDEX "Reminder_dueDate_idx" ON "Reminder"("dueDate");

-- CreateIndex
CREATE INDEX "CreditCardInterestRecord_cardId_idx" ON "CreditCardInterestRecord"("cardId");

-- CreateIndex
CREATE INDEX "CreditCardInterestRecord_interestType_idx" ON "CreditCardInterestRecord"("interestType");

-- CreateIndex
CREATE INDEX "CreditCardInterestRecord_createdAt_idx" ON "CreditCardInterestRecord"("createdAt");

-- CreateIndex
CREATE INDEX "Person_userId_idx" ON "Person"("userId");

-- CreateIndex
CREATE INDEX "ReceivablePayable_userId_idx" ON "ReceivablePayable"("userId");

-- CreateIndex
CREATE INDEX "ReceivablePayable_userId_status_idx" ON "ReceivablePayable"("userId", "status");

-- CreateIndex
CREATE INDEX "ReceivablePayable_personId_idx" ON "ReceivablePayable"("personId");

-- CreateIndex
CREATE INDEX "ReceivablePayable_status_idx" ON "ReceivablePayable"("status");

-- CreateIndex
CREATE INDEX "RPTransaction_receivablePayableId_idx" ON "RPTransaction"("receivablePayableId");

-- CreateIndex
CREATE INDEX "RPTransaction_installmentId_idx" ON "RPTransaction"("installmentId");

-- CreateIndex
CREATE INDEX "RPInstallment_receivablePayableId_idx" ON "RPInstallment"("receivablePayableId");

-- CreateIndex
CREATE INDEX "RPInstallment_dueDate_idx" ON "RPInstallment"("dueDate");

-- CreateIndex
CREATE INDEX "RPInstallment_status_idx" ON "RPInstallment"("status");

-- CreateIndex
CREATE INDEX "RPRecordNote_receivablePayableId_idx" ON "RPRecordNote"("receivablePayableId");

-- CreateIndex
CREATE INDEX "RPRecordNote_personId_idx" ON "RPRecordNote"("personId");

-- CreateIndex
CREATE INDEX "RPRecordEvent_receivablePayableId_idx" ON "RPRecordEvent"("receivablePayableId");

-- CreateIndex
CREATE INDEX "RPRecordEvent_eventType_idx" ON "RPRecordEvent"("eventType");

-- CreateIndex
CREATE INDEX "RPRecordEvent_createdAt_idx" ON "RPRecordEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_date_idx" ON "LedgerEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");

-- CreateIndex
CREATE INDEX "LedgerEntry_date_idx" ON "LedgerEntry"("date");

-- CreateIndex
CREATE INDEX "LedgerEntry_accountId_idx" ON "LedgerEntry"("accountId");

-- CreateIndex
CREATE INDEX "LedgerEntry_source_idx" ON "LedgerEntry"("source");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_source_externalId_key" ON "LedgerEntry"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "OgzieIngestBatch_batchId_key" ON "OgzieIngestBatch"("batchId");

-- CreateIndex
CREATE INDEX "OgzieIngestBatch_createdAt_idx" ON "OgzieIngestBatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CardFinanceSettings_userId_key" ON "CardFinanceSettings"("userId");

-- CreateIndex
CREATE INDEX "AppSettings_userId_idx" ON "AppSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_userId_key_key" ON "AppSettings"("userId", "key");

-- CreateIndex
CREATE INDEX "FinancialGoal_userId_idx" ON "FinancialGoal"("userId");

-- CreateIndex
CREATE INDEX "FinancialGoal_status_idx" ON "FinancialGoal"("status");

-- CreateIndex
CREATE INDEX "MarketRate_userId_idx" ON "MarketRate"("userId");

-- CreateIndex
CREATE INDEX "MarketRate_currencyCode_idx" ON "MarketRate"("currencyCode");

-- CreateIndex
CREATE INDEX "MarketRate_seriesCode_idx" ON "MarketRate"("seriesCode");

-- CreateIndex
CREATE INDEX "MarketRate_rateDate_idx" ON "MarketRate"("rateDate");

-- CreateIndex
CREATE UNIQUE INDEX "MarketRate_userId_source_currencyCode_seriesCode_rateDate_key" ON "MarketRate"("userId", "source", "currencyCode", "seriesCode", "rateDate");

-- CreateIndex
CREATE INDEX "HealthSnapshot_userId_idx" ON "HealthSnapshot"("userId");

-- CreateIndex
CREATE INDEX "HealthSnapshot_calculatedAt_idx" ON "HealthSnapshot"("calculatedAt");

-- CreateIndex
CREATE INDEX "AIRecommendation_userId_idx" ON "AIRecommendation"("userId");

-- CreateIndex
CREATE INDEX "AIRecommendation_type_idx" ON "AIRecommendation"("type");

-- CreateIndex
CREATE INDEX "AIRecommendation_priority_idx" ON "AIRecommendation"("priority");

-- CreateIndex
CREATE INDEX "SavedPaymentPlan_userId_idx" ON "SavedPaymentPlan"("userId");

-- AddForeignKey
ALTER TABLE "ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OgzieCommand" ADD CONSTRAINT "OgzieCommand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActionLog" ADD CONSTRAINT "UserActionLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtAccount" ADD CONSTRAINT "DebtAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtObligation" ADD CONSTRAINT "DebtObligation_debtAccountId_fkey" FOREIGN KEY ("debtAccountId") REFERENCES "DebtAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtObligation" ADD CONSTRAINT "DebtObligation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_debtAccountId_fkey" FOREIGN KEY ("debtAccountId") REFERENCES "DebtAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "DebtObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetMonth" ADD CONSTRAINT "BudgetMonth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_financialRecordId_fkey" FOREIGN KEY ("financialRecordId") REFERENCES "ReceivablePayable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "RPInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CardStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInstallment" ADD CONSTRAINT "CardInstallment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "CardTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInstallment" ADD CONSTRAINT "CardInstallment_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CardStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPayment" ADD CONSTRAINT "CardPayment_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPayment" ADD CONSTRAINT "CardPayment_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CardStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestAccrual" ADD CONSTRAINT "InterestAccrual_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestAccrual" ADD CONSTRAINT "InterestAccrual_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CardStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCardInterestRecord" ADD CONSTRAINT "CreditCardInterestRecord_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablePayable" ADD CONSTRAINT "ReceivablePayable_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablePayable" ADD CONSTRAINT "ReceivablePayable_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPTransaction" ADD CONSTRAINT "RPTransaction_receivablePayableId_fkey" FOREIGN KEY ("receivablePayableId") REFERENCES "ReceivablePayable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPTransaction" ADD CONSTRAINT "RPTransaction_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "RPInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPTransaction" ADD CONSTRAINT "RPTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPInstallment" ADD CONSTRAINT "RPInstallment_receivablePayableId_fkey" FOREIGN KEY ("receivablePayableId") REFERENCES "ReceivablePayable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPRecordNote" ADD CONSTRAINT "RPRecordNote_receivablePayableId_fkey" FOREIGN KEY ("receivablePayableId") REFERENCES "ReceivablePayable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPRecordEvent" ADD CONSTRAINT "RPRecordEvent_receivablePayableId_fkey" FOREIGN KEY ("receivablePayableId") REFERENCES "ReceivablePayable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_rpTransactionId_fkey" FOREIGN KEY ("rpTransactionId") REFERENCES "RPTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardFinanceSettings" ADD CONSTRAINT "CardFinanceSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthSnapshot" ADD CONSTRAINT "HealthSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPaymentPlan" ADD CONSTRAINT "SavedPaymentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

