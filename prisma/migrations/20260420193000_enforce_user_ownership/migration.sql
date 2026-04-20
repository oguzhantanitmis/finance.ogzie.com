DELETE `Asset`
FROM `Asset`
LEFT JOIN `User` ON `Asset`.`userId` = `User`.`id`
WHERE `Asset`.`userId` IS NULL OR `User`.`id` IS NULL;

DELETE `Debt`
FROM `Debt`
LEFT JOIN `User` ON `Debt`.`userId` = `User`.`id`
WHERE `Debt`.`userId` IS NULL OR `User`.`id` IS NULL;

DELETE `Transaction`
FROM `Transaction`
LEFT JOIN `User` ON `Transaction`.`userId` = `User`.`id`
WHERE `Transaction`.`userId` IS NULL OR `User`.`id` IS NULL;

DELETE `Subscription`
FROM `Subscription`
LEFT JOIN `User` ON `Subscription`.`userId` = `User`.`id`
WHERE `Subscription`.`userId` IS NULL OR `User`.`id` IS NULL;

DELETE `AIInsight`
FROM `AIInsight`
LEFT JOIN `User` ON `AIInsight`.`userId` = `User`.`id`
WHERE `AIInsight`.`userId` IS NULL OR `User`.`id` IS NULL;

ALTER TABLE `Asset` DROP FOREIGN KEY `Asset_userId_fkey`;
ALTER TABLE `Debt` DROP FOREIGN KEY `Debt_userId_fkey`;
ALTER TABLE `Transaction` DROP FOREIGN KEY `Transaction_userId_fkey`;
ALTER TABLE `Subscription` DROP FOREIGN KEY `Subscription_userId_fkey`;
ALTER TABLE `AIInsight` DROP FOREIGN KEY `AIInsight_userId_fkey`;

ALTER TABLE `Asset`
    MODIFY `userId` VARCHAR(191) NOT NULL;

ALTER TABLE `Debt`
    MODIFY `userId` VARCHAR(191) NOT NULL;

ALTER TABLE `Transaction`
    MODIFY `userId` VARCHAR(191) NOT NULL;

ALTER TABLE `Subscription`
    MODIFY `userId` VARCHAR(191) NOT NULL;

ALTER TABLE `AIInsight`
    MODIFY `userId` VARCHAR(191) NOT NULL;

CREATE INDEX `Asset_userId_idx` ON `Asset`(`userId`);
CREATE INDEX `Debt_userId_idx` ON `Debt`(`userId`);
CREATE INDEX `Transaction_userId_idx` ON `Transaction`(`userId`);
CREATE INDEX `Subscription_userId_idx` ON `Subscription`(`userId`);
CREATE INDEX `AIInsight_userId_idx` ON `AIInsight`(`userId`);

ALTER TABLE `Asset`
    ADD CONSTRAINT `Asset_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Debt`
    ADD CONSTRAINT `Debt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Transaction`
    ADD CONSTRAINT `Transaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Subscription`
    ADD CONSTRAINT `Subscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AIInsight`
    ADD CONSTRAINT `AIInsight_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
