CREATE TABLE `OgzieCommand` (
    `id` VARCHAR(191) NOT NULL,
    `commandId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `resultId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OgzieCommand_commandId_key`(`commandId`),
    INDEX `OgzieCommand_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
