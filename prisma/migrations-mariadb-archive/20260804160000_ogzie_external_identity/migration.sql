-- app.ogzie.com hesaplarını Finance kullanıcılarına e-postadan bağımsız,
-- kalıcı bir issuer + subject kimliğiyle bağla.
CREATE TABLE `ExternalIdentity` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'ogzie',
    `issuer` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `emailSnapshot` VARCHAR(191) NULL,
    `linkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ExternalIdentity_issuer_subject_key`(`issuer`, `subject`),
    INDEX `ExternalIdentity_userId_idx`(`userId`),
    INDEX `ExternalIdentity_provider_idx`(`provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ExternalIdentity`
  ADD CONSTRAINT `ExternalIdentity_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
