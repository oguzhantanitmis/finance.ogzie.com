ALTER TABLE `Subscription`
  ADD COLUMN `source` VARCHAR(191) NULL,
  ADD COLUMN `externalId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `Subscription_source_externalId_key`
  ON `Subscription`(`source`, `externalId`);

CREATE INDEX `Subscription_userId_providerDomain_idx`
  ON `Subscription`(`userId`, `providerDomain`);
