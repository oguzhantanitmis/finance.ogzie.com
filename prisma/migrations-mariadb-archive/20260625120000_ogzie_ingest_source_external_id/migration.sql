-- ogzie → finance push ingest: LedgerEntry idempotency anahtarı + batch replay tablosu.
-- Additive (yeni nullable kolon + yeni tablo + index) → veri kaybı YOK.

-- AlterTable
ALTER TABLE `LedgerEntry` ADD COLUMN `externalId` VARCHAR(191) NULL,
    ADD COLUMN `source` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `OgzieIngestBatch` (
    `id` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OgzieIngestBatch_batchId_key`(`batchId`),
    INDEX `OgzieIngestBatch_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `LedgerEntry_source_idx` ON `LedgerEntry`(`source`);

-- CreateIndex
CREATE UNIQUE INDEX `LedgerEntry_source_externalId_key` ON `LedgerEntry`(`source`, `externalId`);
