-- Personal finance cockpit upgrade
-- Existing ReceivablePayable, CreditCard, BudgetMonth and FinancialGoal data is preserved.

ALTER TABLE `CreditCard`
  MODIFY `cardNetwork` ENUM('VISA', 'MASTERCARD', 'TROY', 'AMERICAN_EXPRESS') NOT NULL DEFAULT 'VISA',
  ADD COLUMN `cardProgram` VARCHAR(191) NULL,
  ADD COLUMN `logoPath` VARCHAR(191) NULL,
  ADD COLUMN `cardImagePath` VARCHAR(191) NULL,
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `availableLimit` DOUBLE NULL,
  ADD COLUMN `currentDebt` DOUBLE NULL,
  ADD COLUMN `statementDate` DATETIME(3) NULL,
  ADD COLUMN `dueDate` DATETIME(3) NULL;

CREATE TABLE `CreditCardInterestRecord` (
  `id` VARCHAR(191) NOT NULL,
  `cardId` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `interestType` VARCHAR(191) NOT NULL,
  `period` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `CreditCardInterestRecord_cardId_idx` (`cardId`),
  INDEX `CreditCardInterestRecord_interestType_idx` (`interestType`),
  INDEX `CreditCardInterestRecord_createdAt_idx` (`createdAt`),
  CONSTRAINT `CreditCardInterestRecord_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `CreditCard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ReceivablePayable`
  ADD COLUMN `title` VARCHAR(191) NULL,
  ADD COLUMN `category` VARCHAR(191) NULL,
  ADD COLUMN `principalAmount` DOUBLE NULL,
  ADD COLUMN `totalAmount` DOUBLE NULL,
  ADD COLUMN `paidAmount` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `startDate` DATETIME(3) NULL,
  ADD COLUMN `internalNote` TEXT NULL,
  ADD COLUMN `paymentPlanType` ENUM('ONE_TIME', 'INSTALLMENT', 'FLEXIBLE', 'CUSTOM_DATES') NOT NULL DEFAULT 'ONE_TIME',
  ADD COLUMN `firstInstallmentDate` DATETIME(3) NULL,
  ADD COLUMN `installmentPeriod` VARCHAR(191) NULL,
  ADD COLUMN `reminderEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `reminderOptions` JSON NULL,
  ADD COLUMN `overdueAlertEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN `receiptFile` VARCHAR(191) NULL,
  ADD COLUMN `closedAt` DATETIME(3) NULL;

UPDATE `ReceivablePayable`
SET
  `title` = COALESCE(`title`, `description`),
  `principalAmount` = COALESCE(`principalAmount`, `originalAmount`),
  `totalAmount` = COALESCE(`totalAmount`, `originalAmount`),
  `paidAmount` = GREATEST(COALESCE(`originalAmount`, 0) - COALESCE(`remainingAmount`, 0), 0),
  `startDate` = COALESCE(`startDate`, `createdAt`),
  `paymentPlanType` = CASE WHEN `isInstallment` = true THEN 'INSTALLMENT' ELSE 'ONE_TIME' END,
  `closedAt` = CASE WHEN `status` = 'CLOSED' THEN COALESCE(`closedAt`, `updatedAt`) ELSE `closedAt` END;

ALTER TABLE `RPTransaction`
  ADD COLUMN `installmentId` VARCHAR(191) NULL,
  ADD COLUMN `cardId` VARCHAR(191) NULL,
  ADD COLUMN `transactionType` VARCHAR(191) NOT NULL DEFAULT 'payment',
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
  ADD COLUMN `paymentMethod` VARCHAR(191) NULL,
  ADD COLUMN `isCash` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `receiptFile` VARCHAR(191) NULL;

CREATE TABLE `RPInstallment` (
  `id` VARCHAR(191) NOT NULL,
  `receivablePayableId` VARCHAR(191) NOT NULL,
  `installmentNo` INTEGER NOT NULL,
  `dueDate` DATETIME(3) NOT NULL,
  `plannedAmount` DOUBLE NOT NULL,
  `paidAmount` DOUBLE NOT NULL DEFAULT 0,
  `remainingAmount` DOUBLE NOT NULL,
  `status` ENUM('PENDING', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'POSTPONED', 'CANCELED', 'RESCHEDULED') NOT NULL DEFAULT 'PENDING',
  `paidDate` DATETIME(3) NULL,
  `delayDays` INTEGER NOT NULL DEFAULT 0,
  `description` VARCHAR(191) NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `RPInstallment_receivablePayableId_idx` (`receivablePayableId`),
  INDEX `RPInstallment_dueDate_idx` (`dueDate`),
  INDEX `RPInstallment_status_idx` (`status`),
  CONSTRAINT `RPInstallment_receivablePayableId_fkey` FOREIGN KEY (`receivablePayableId`) REFERENCES `ReceivablePayable`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RPTransaction`
  ADD INDEX `RPTransaction_installmentId_idx` (`installmentId`),
  ADD CONSTRAINT `RPTransaction_installmentId_fkey` FOREIGN KEY (`installmentId`) REFERENCES `RPInstallment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `RPRecordNote` (
  `id` VARCHAR(191) NOT NULL,
  `receivablePayableId` VARCHAR(191) NOT NULL,
  `personId` VARCHAR(191) NULL,
  `note` TEXT NOT NULL,
  `noteType` ENUM('GENERAL', 'PAYMENT', 'DELAY', 'RESCHEDULE', 'PERSON_INTERNAL') NOT NULL DEFAULT 'GENERAL',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `RPRecordNote_receivablePayableId_idx` (`receivablePayableId`),
  INDEX `RPRecordNote_personId_idx` (`personId`),
  CONSTRAINT `RPRecordNote_receivablePayableId_fkey` FOREIGN KEY (`receivablePayableId`) REFERENCES `ReceivablePayable`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RPRecordEvent` (
  `id` VARCHAR(191) NOT NULL,
  `receivablePayableId` VARCHAR(191) NOT NULL,
  `eventType` ENUM('CREATED', 'PLAN_CREATED', 'PAYMENT_RECEIVED', 'PARTIAL_PAYMENT_RECEIVED', 'PAYMENT_MADE', 'PARTIAL_PAYMENT_MADE', 'INSTALLMENT_OVERDUE', 'NOTE_ADDED', 'RESCHEDULED', 'CLOSED', 'CANCELED', 'UPDATED') NOT NULL,
  `eventText` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `RPRecordEvent_receivablePayableId_idx` (`receivablePayableId`),
  INDEX `RPRecordEvent_eventType_idx` (`eventType`),
  INDEX `RPRecordEvent_createdAt_idx` (`createdAt`),
  CONSTRAINT `RPRecordEvent_receivablePayableId_fkey` FOREIGN KEY (`receivablePayableId`) REFERENCES `ReceivablePayable`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Reminder`
  ADD COLUMN `userId` VARCHAR(191) NULL,
  ADD COLUMN `financialRecordId` VARCHAR(191) NULL,
  ADD COLUMN `installmentId` VARCHAR(191) NULL,
  ADD COLUMN `reminderType` VARCHAR(191) NULL,
  ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD INDEX `Reminder_userId_idx` (`userId`),
  ADD INDEX `Reminder_financialRecordId_idx` (`financialRecordId`),
  ADD INDEX `Reminder_installmentId_idx` (`installmentId`),
  ADD INDEX `Reminder_dueDate_idx` (`dueDate`),
  ADD CONSTRAINT `Reminder_financialRecordId_fkey` FOREIGN KEY (`financialRecordId`) REFERENCES `ReceivablePayable`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Reminder_installmentId_fkey` FOREIGN KEY (`installmentId`) REFERENCES `RPInstallment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BudgetMonth`
  ADD COLUMN `openingCash` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `plannedReceivableCollection` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `savingGoal` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `debtPaymentBudget` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `manualAdjustment` DOUBLE NOT NULL DEFAULT 0;

ALTER TABLE `FinancialGoal`
  ADD COLUMN `goalType` VARCHAR(191) NOT NULL DEFAULT 'SAVINGS',
  ADD COLUMN `priority` INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN `monthlyRequiredAmount` DOUBLE NULL,
  ADD COLUMN `relatedRecordId` VARCHAR(191) NULL;

CREATE TABLE `MarketRate` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `source` VARCHAR(191) NOT NULL DEFAULT 'TCMB_EVDS',
  `currencyCode` VARCHAR(191) NOT NULL,
  `seriesCode` VARCHAR(191) NOT NULL,
  `buyRate` DOUBLE NULL,
  `sellRate` DOUBLE NULL,
  `rateDate` DATETIME(3) NOT NULL,
  `rawResponse` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MarketRate_userId_source_currencyCode_seriesCode_rateDate_key` (`userId`, `source`, `currencyCode`, `seriesCode`, `rateDate`),
  INDEX `MarketRate_userId_idx` (`userId`),
  INDEX `MarketRate_currencyCode_idx` (`currencyCode`),
  INDEX `MarketRate_seriesCode_idx` (`seriesCode`),
  INDEX `MarketRate_rateDate_idx` (`rateDate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
