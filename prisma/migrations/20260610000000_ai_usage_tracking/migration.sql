-- AlterTable
ALTER TABLE `User` ADD COLUMN `aiMonthlyTokenLimit` INTEGER NOT NULL DEFAULT 30000;

-- CreateTable
CREATE TABLE `AiUsage` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `promptTokens` INTEGER NOT NULL DEFAULT 0,
    `completionTokens` INTEGER NOT NULL DEFAULT 0,
    `totalTokens` INTEGER NOT NULL DEFAULT 0,
    `requests` INTEGER NOT NULL DEFAULT 0,
    `costUsd` DOUBLE NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiUsage_period_idx`(`period`),
    UNIQUE INDEX `AiUsage_userId_period_key`(`userId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiUsage` ADD CONSTRAINT `AiUsage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
