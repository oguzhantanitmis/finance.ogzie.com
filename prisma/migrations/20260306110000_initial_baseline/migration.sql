-- Initial baseline for existing production schema

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `riskScore` INTEGER NOT NULL DEFAULT 100,
    `netWorth` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Asset` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('CASH', 'BANK', 'GOLD', 'FX', 'CRYPTO', 'STOCK', 'ESTATE', 'OTHER', 'RECEIVABLE') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `unitPrice` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
    `lastValue` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Debt` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('CREDIT_CARD', 'LOAN', 'KMH', 'PERSONAL', 'MANUAL') NOT NULL,
    `limit` DOUBLE NULL,
    `cutOffDay` INTEGER NULL,
    `paymentDueDay` INTEGER NULL,
    `totalPrincipal` DOUBLE NULL,
    `installments` INTEGER NULL,
    `remainingInstallments` INTEGER NULL,
    `totalBalance` DOUBLE NOT NULL,
    `remainingBalance` DOUBLE NOT NULL,
    `interestRate` DOUBLE NOT NULL DEFAULT 0,
    `minPaymentRate` DOUBLE NOT NULL DEFAULT 0.20,
    `kkdfRate` DOUBLE NOT NULL DEFAULT 0.15,
    `bsmvRate` DOUBLE NOT NULL DEFAULT 0.15,
    `dueDate` DATETIME(3) NULL,
    `lastPaymentDate` DATETIME(3) NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentPlan` (
    `id` VARCHAR(191) NOT NULL,
    `debtId` VARCHAR(191) NOT NULL,
    `installmentNo` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `principalAmount` DOUBLE NOT NULL,
    `interestAmount` DOUBLE NOT NULL,
    `taxAmount` DOUBLE NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `paidDate` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `assetId` VARCHAR(191) NULL,
    `debtId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
    `billingCycle` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'Genel',
    `nextPayment` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AIInsight` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'INFO',
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinanceJournal` (
    `id` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isParsed` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reminder` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Snapshot` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `netWorth` DOUBLE NOT NULL,
    `totalAssets` DOUBLE NOT NULL,
    `totalDebts` DOUBLE NOT NULL,
    `assets` JSON NOT NULL,
    `debts` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditCard` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `cardName` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `last4Digits` VARCHAR(191) NOT NULL,
    `cardNetwork` ENUM('VISA', 'MASTERCARD', 'TROY') NOT NULL DEFAULT 'VISA',
    `status` ENUM('ACTIVE', 'FROZEN', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `color` VARCHAR(191) NOT NULL DEFAULT '#6366F1',
    `totalLimit` DOUBLE NOT NULL,
    `cashAdvanceLimit` DOUBLE NOT NULL DEFAULT 0,
    `cutOffDay` INTEGER NOT NULL,
    `paymentDueDay` INTEGER NOT NULL,
    `contractualRate` DOUBLE NOT NULL DEFAULT 4.42,
    `defaultRate` DOUBLE NOT NULL DEFAULT 5.42,
    `cashAdvanceRate` DOUBLE NOT NULL DEFAULT 5.92,
    `kkdfRate` DOUBLE NOT NULL DEFAULT 0.15,
    `bsmvRate` DOUBLE NOT NULL DEFAULT 0.15,
    `minPaymentRate` DOUBLE NOT NULL DEFAULT 0.20,
    `rewardsPoints` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CardStatement` (
    `id` VARCHAR(191) NOT NULL,
    `creditCardId` VARCHAR(191) NOT NULL,
    `statementDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `previousBalance` DOUBLE NOT NULL DEFAULT 0,
    `newCharges` DOUBLE NOT NULL DEFAULT 0,
    `interestCharged` DOUBLE NOT NULL DEFAULT 0,
    `taxCharged` DOUBLE NOT NULL DEFAULT 0,
    `paymentsReceived` DOUBLE NOT NULL DEFAULT 0,
    `statementBalance` DOUBLE NOT NULL DEFAULT 0,
    `minimumPayment` DOUBLE NOT NULL DEFAULT 0,
    `status` ENUM('OPEN', 'PAID', 'CLOSED', 'OVERDUE') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CardTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `creditCardId` VARCHAR(191) NOT NULL,
    `statementId` VARCHAR(191) NULL,
    `type` ENUM('PURCHASE', 'INSTALLMENT_PURCHASE', 'CASH_ADVANCE', 'FEE', 'REFUND', 'ADJUSTMENT', 'INTEREST_CHARGE', 'TAX_CHARGE') NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `merchant` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `remainingAmount` DOUBLE NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalInstallments` INTEGER NOT NULL DEFAULT 1,
    `currentInstallment` INTEGER NOT NULL DEFAULT 1,
    `isCashAdvance` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CardInstallment` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `statementId` VARCHAR(191) NULL,
    `installmentNo` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `paidDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CardPayment` (
    `id` VARCHAR(191) NOT NULL,
    `creditCardId` VARCHAR(191) NOT NULL,
    `statementId` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(191) NULL,
    `allocationDetail` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InterestAccrual` (
    `id` VARCHAR(191) NOT NULL,
    `creditCardId` VARCHAR(191) NOT NULL,
    `statementId` VARCHAR(191) NULL,
    `type` ENUM('CONTRACTUAL', 'DEFAULT_INTEREST', 'CASH_ADVANCE_INTEREST') NOT NULL,
    `baseAmount` DOUBLE NOT NULL,
    `rate` DOUBLE NOT NULL,
    `dayCount` INTEGER NOT NULL,
    `interest` DOUBLE NOT NULL,
    `kkdf` DOUBLE NOT NULL,
    `bsmv` DOUBLE NOT NULL,
    `totalCost` DOUBLE NOT NULL,
    `calculatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Asset` ADD CONSTRAINT `Asset_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Debt` ADD CONSTRAINT `Debt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentPlan` ADD CONSTRAINT `PaymentPlan_debtId_fkey` FOREIGN KEY (`debtId`) REFERENCES `Debt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AIInsight` ADD CONSTRAINT `AIInsight_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Snapshot` ADD CONSTRAINT `Snapshot_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditCard` ADD CONSTRAINT `CreditCard_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardStatement` ADD CONSTRAINT `CardStatement_creditCardId_fkey` FOREIGN KEY (`creditCardId`) REFERENCES `CreditCard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardTransaction` ADD CONSTRAINT `CardTransaction_creditCardId_fkey` FOREIGN KEY (`creditCardId`) REFERENCES `CreditCard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardTransaction` ADD CONSTRAINT `CardTransaction_statementId_fkey` FOREIGN KEY (`statementId`) REFERENCES `CardStatement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardInstallment` ADD CONSTRAINT `CardInstallment_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `CardTransaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardInstallment` ADD CONSTRAINT `CardInstallment_statementId_fkey` FOREIGN KEY (`statementId`) REFERENCES `CardStatement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardPayment` ADD CONSTRAINT `CardPayment_creditCardId_fkey` FOREIGN KEY (`creditCardId`) REFERENCES `CreditCard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardPayment` ADD CONSTRAINT `CardPayment_statementId_fkey` FOREIGN KEY (`statementId`) REFERENCES `CardStatement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterestAccrual` ADD CONSTRAINT `InterestAccrual_creditCardId_fkey` FOREIGN KEY (`creditCardId`) REFERENCES `CreditCard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterestAccrual` ADD CONSTRAINT `InterestAccrual_statementId_fkey` FOREIGN KEY (`statementId`) REFERENCES `CardStatement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
