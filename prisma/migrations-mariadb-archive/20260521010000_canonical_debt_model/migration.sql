-- Canonical debt model: source records stay intact; authoritative debt state moves here.

CREATE TABLE `DebtAccount` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `sourceType` ENUM('LOAN', 'CREDIT_CARD', 'KMH', 'PERSONAL_PAYABLE', 'MANUAL') NOT NULL,
  `sourceEntityId` VARCHAR(191) NULL,
  `sourceKey` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `counterpartyName` VARCHAR(191) NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
  `status` ENUM('ACTIVE', 'OVERDUE', 'PAID', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
  `limit` DOUBLE NULL,
  `principalBalance` DOUBLE NOT NULL DEFAULT 0,
  `statementBalance` DOUBLE NOT NULL DEFAULT 0,
  `currentBalance` DOUBLE NOT NULL DEFAULT 0,
  `interestRate` DOUBLE NOT NULL DEFAULT 0,
  `lateInterestRate` DOUBLE NULL,
  `kkdfRate` DOUBLE NOT NULL DEFAULT 0.15,
  `bsmvRate` DOUBLE NOT NULL DEFAULT 0.15,
  `cutOffDay` INTEGER NULL,
  `paymentDueDay` INTEGER NULL,
  `statementDate` DATETIME(3) NULL,
  `nextDueDate` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DebtObligation` (
  `id` VARCHAR(191) NOT NULL,
  `debtAccountId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` ENUM('INSTALLMENT', 'MINIMUM_PAYMENT', 'STATEMENT_PAYMENT', 'FULL_PAYMENT', 'MANUAL_PAYMENT') NOT NULL,
  `installmentNo` INTEGER NULL,
  `periodStart` DATETIME(3) NULL,
  `periodEnd` DATETIME(3) NULL,
  `dueDate` DATETIME(3) NOT NULL,
  `principalAmount` DOUBLE NOT NULL DEFAULT 0,
  `interestAmount` DOUBLE NOT NULL DEFAULT 0,
  `taxAmount` DOUBLE NOT NULL DEFAULT 0,
  `lateFeeAmount` DOUBLE NOT NULL DEFAULT 0,
  `totalAmount` DOUBLE NOT NULL DEFAULT 0,
  `paidAmount` DOUBLE NOT NULL DEFAULT 0,
  `remainingAmount` DOUBLE NOT NULL DEFAULT 0,
  `status` ENUM('PENDING', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELED') NOT NULL DEFAULT 'PENDING',
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DebtPayment` (
  `id` VARCHAR(191) NOT NULL,
  `debtAccountId` VARCHAR(191) NOT NULL,
  `obligationId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NULL,
  `amount` DOUBLE NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
  `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `allocation` JSON NULL,
  `description` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `DebtAccount_userId_sourceKey_key` ON `DebtAccount`(`userId`, `sourceKey`);
CREATE INDEX `DebtAccount_userId_idx` ON `DebtAccount`(`userId`);
CREATE INDEX `DebtAccount_sourceType_idx` ON `DebtAccount`(`sourceType`);
CREATE INDEX `DebtAccount_status_idx` ON `DebtAccount`(`status`);
CREATE INDEX `DebtAccount_nextDueDate_idx` ON `DebtAccount`(`nextDueDate`);

CREATE INDEX `DebtObligation_debtAccountId_idx` ON `DebtObligation`(`debtAccountId`);
CREATE INDEX `DebtObligation_userId_idx` ON `DebtObligation`(`userId`);
CREATE INDEX `DebtObligation_dueDate_idx` ON `DebtObligation`(`dueDate`);
CREATE INDEX `DebtObligation_status_idx` ON `DebtObligation`(`status`);

CREATE INDEX `DebtPayment_debtAccountId_idx` ON `DebtPayment`(`debtAccountId`);
CREATE INDEX `DebtPayment_obligationId_idx` ON `DebtPayment`(`obligationId`);
CREATE INDEX `DebtPayment_userId_idx` ON `DebtPayment`(`userId`);
CREATE INDEX `DebtPayment_accountId_idx` ON `DebtPayment`(`accountId`);
CREATE INDEX `DebtPayment_paymentDate_idx` ON `DebtPayment`(`paymentDate`);

ALTER TABLE `DebtAccount`
  ADD CONSTRAINT `DebtAccount_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DebtObligation`
  ADD CONSTRAINT `DebtObligation_debtAccountId_fkey`
  FOREIGN KEY (`debtAccountId`) REFERENCES `DebtAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DebtObligation`
  ADD CONSTRAINT `DebtObligation_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DebtPayment`
  ADD CONSTRAINT `DebtPayment_debtAccountId_fkey`
  FOREIGN KEY (`debtAccountId`) REFERENCES `DebtAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DebtPayment`
  ADD CONSTRAINT `DebtPayment_obligationId_fkey`
  FOREIGN KEY (`obligationId`) REFERENCES `DebtObligation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `DebtPayment`
  ADD CONSTRAINT `DebtPayment_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DebtPayment`
  ADD CONSTRAINT `DebtPayment_accountId_fkey`
  FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
