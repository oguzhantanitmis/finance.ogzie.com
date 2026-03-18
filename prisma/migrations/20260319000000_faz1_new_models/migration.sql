-- Faz-1 Migration: Yeni modeller ve enum'lar
-- Bu migration Faz-0'dan Faz-14'e kadar eklenen tüm yeni tabloları oluşturur.

-- Yeni Enum'lar (MySQL enum olarak direkt column tanımlarında kullanılır)

-- Person tablosu
CREATE TABLE IF NOT EXISTS `Person` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Person_userId_idx` (`userId`),
  CONSTRAINT `Person_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ReceivablePayable tablosu
CREATE TABLE IF NOT EXISTS `ReceivablePayable` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `personId` VARCHAR(191) NOT NULL,
  `type` ENUM('RECEIVABLE', 'PAYABLE') NOT NULL,
  `description` VARCHAR(191) NOT NULL,
  `originalAmount` DOUBLE NOT NULL,
  `remainingAmount` DOUBLE NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
  `dueDate` DATETIME(3) NULL,
  `status` ENUM('OPEN', 'PARTIAL', 'CLOSED', 'OVERDUE') NOT NULL DEFAULT 'OPEN',
  `notes` TEXT NULL,
  `isInstallment` BOOLEAN NOT NULL DEFAULT false,
  `installmentCount` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `ReceivablePayable_userId_idx` (`userId`),
  INDEX `ReceivablePayable_personId_idx` (`personId`),
  INDEX `ReceivablePayable_status_idx` (`status`),
  CONSTRAINT `ReceivablePayable_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ReceivablePayable_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- RPTransaction tablosu
CREATE TABLE IF NOT EXISTS `RPTransaction` (
  `id` VARCHAR(191) NOT NULL,
  `receivablePayableId` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `transactionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `accountId` VARCHAR(191) NULL,
  `description` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `RPTransaction_receivablePayableId_idx` (`receivablePayableId`),
  CONSTRAINT `RPTransaction_receivablePayableId_fkey` FOREIGN KEY (`receivablePayableId`) REFERENCES `ReceivablePayable`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Account tablosu
CREATE TABLE IF NOT EXISTS `Account` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` ENUM('BANK_ACCOUNT', 'CASH', 'WALLET', 'INVESTMENT', 'OTHER_ACCOUNT') NOT NULL,
  `balance` DOUBLE NOT NULL DEFAULT 0,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
  `bankName` VARCHAR(191) NULL,
  `iban` VARCHAR(191) NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Account_userId_idx` (`userId`),
  CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- RPTransaction → Account FK (Account oluştuktan sonra)
ALTER TABLE `RPTransaction` ADD CONSTRAINT `RPTransaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- LedgerEntry tablosu
CREATE TABLE IF NOT EXISTS `LedgerEntry` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` ENUM('INCOME', 'EXPENSE', 'COLLECTION', 'PAYMENT_TO_PERSON', 'CARD_PAYMENT', 'SUBSCRIPTION_PAYMENT', 'DEBT_PAYMENT', 'DEBT_ADDITION', 'RECEIVABLE_ADDITION', 'TRANSFER', 'BALANCE_ADJUSTMENT') NOT NULL,
  `amount` DOUBLE NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
  `description` VARCHAR(191) NULL,
  `category` VARCHAR(191) NULL,
  `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `accountId` VARCHAR(191) NULL,
  `personId` VARCHAR(191) NULL,
  `creditCardId` VARCHAR(191) NULL,
  `debtId` VARCHAR(191) NULL,
  `subscriptionId` VARCHAR(191) NULL,
  `rpTransactionId` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `LedgerEntry_userId_idx` (`userId`),
  INDEX `LedgerEntry_type_idx` (`type`),
  INDEX `LedgerEntry_date_idx` (`date`),
  INDEX `LedgerEntry_accountId_idx` (`accountId`),
  CONSTRAINT `LedgerEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `LedgerEntry_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `LedgerEntry_rpTransactionId_fkey` FOREIGN KEY (`rpTransactionId`) REFERENCES `RPTransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CardFinanceSettings tablosu
CREATE TABLE IF NOT EXISTS `CardFinanceSettings` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `contractualRate` DOUBLE NOT NULL DEFAULT 4.42,
  `defaultRate` DOUBLE NOT NULL DEFAULT 5.42,
  `cashAdvanceRate` DOUBLE NOT NULL DEFAULT 5.92,
  `minPaymentRateBelow50k` DOUBLE NOT NULL DEFAULT 0.20,
  `minPaymentRateAbove50k` DOUBLE NOT NULL DEFAULT 0.40,
  `kkdfRate` DOUBLE NOT NULL DEFAULT 0.15,
  `bsmvRate` DOUBLE NOT NULL DEFAULT 0.15,
  `lastUpdated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CardFinanceSettings_userId_key` (`userId`),
  CONSTRAINT `CardFinanceSettings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AppSettings tablosu
CREATE TABLE IF NOT EXISTS `AppSettings` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `value` TEXT NOT NULL,
  `isEncrypted` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AppSettings_userId_key_key` (`userId`, `key`),
  INDEX `AppSettings_userId_idx` (`userId`),
  CONSTRAINT `AppSettings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- FinancialGoal tablosu
CREATE TABLE IF NOT EXISTS `FinancialGoal` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `targetAmount` DOUBLE NOT NULL,
  `currentAmount` DOUBLE NOT NULL DEFAULT 0,
  `targetDate` DATETIME(3) NOT NULL,
  `status` ENUM('GOAL_ACTIVE', 'COMPLETED', 'ABANDONED') NOT NULL DEFAULT 'GOAL_ACTIVE',
  `category` VARCHAR(191) NULL,
  `relatedDebtId` VARCHAR(191) NULL,
  `relatedCardId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `FinancialGoal_userId_idx` (`userId`),
  INDEX `FinancialGoal_status_idx` (`status`),
  CONSTRAINT `FinancialGoal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- HealthSnapshot tablosu
CREATE TABLE IF NOT EXISTS `HealthSnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `score` INTEGER NOT NULL,
  `level` VARCHAR(191) NOT NULL,
  `totalAssets` DOUBLE NOT NULL,
  `totalDebts` DOUBLE NOT NULL,
  `netWorth` DOUBLE NOT NULL,
  `liquidityRatio` DOUBLE NOT NULL,
  `leverageRatio` DOUBLE NOT NULL,
  `creditUtilization` DOUBLE NULL,
  `monthlyDebtService` DOUBLE NULL,
  `fixedExpenseRatio` DOUBLE NULL,
  `improvementTips` JSON NULL,
  `breakdown` JSON NULL,
  `calculatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `HealthSnapshot_userId_idx` (`userId`),
  INDEX `HealthSnapshot_calculatedAt_idx` (`calculatedAt`),
  CONSTRAINT `HealthSnapshot_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AIRecommendation tablosu
CREATE TABLE IF NOT EXISTS `AIRecommendation` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `reasoning` TEXT NULL,
  `risk` VARCHAR(191) NULL,
  `suggestedAction` TEXT NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT false,
  `isActedOn` BOOLEAN NOT NULL DEFAULT false,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AIRecommendation_userId_idx` (`userId`),
  INDEX `AIRecommendation_type_idx` (`type`),
  CONSTRAINT `AIRecommendation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- SavedPaymentPlan tablosu
CREATE TABLE IF NOT EXISTS `SavedPaymentPlan` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `month` DATETIME(3) NOT NULL,
  `strategy` VARCHAR(191) NOT NULL,
  `totalAvailable` DOUBLE NOT NULL,
  `planData` JSON NOT NULL,
  `isApplied` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `SavedPaymentPlan_userId_idx` (`userId`),
  CONSTRAINT `SavedPaymentPlan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
