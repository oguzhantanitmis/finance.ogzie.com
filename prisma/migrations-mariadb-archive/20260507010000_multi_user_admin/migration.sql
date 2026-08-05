-- Multi-user admin support.
-- Existing single-user data is preserved and assigned to the primary superuser when possible.

ALTER TABLE `User`
  ADD COLUMN `role` ENUM('USER', 'SUPERUSER') NOT NULL DEFAULT 'USER',
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `lastLoginAt` DATETIME(3) NULL;

CREATE INDEX `User_role_idx` ON `User`(`role`);
CREATE INDEX `User_isActive_idx` ON `User`(`isActive`);

SET @primary_superuser_email = 'oguzhan@tanitmis.com';
SET @legacy_admin_email = 'admin@ogzie.com';
SET @primary_superuser_id = (
  SELECT `id`
  FROM `User`
  WHERE LOWER(`email`) COLLATE utf8mb4_unicode_ci = @primary_superuser_email COLLATE utf8mb4_unicode_ci
  LIMIT 1
);
SET @legacy_admin_id = (
  SELECT `id`
  FROM `User`
  WHERE LOWER(`email`) COLLATE utf8mb4_unicode_ci = @legacy_admin_email COLLATE utf8mb4_unicode_ci
  LIMIT 1
);

UPDATE `User`
SET
  `email` = @primary_superuser_email,
  `role` = 'SUPERUSER',
  `isActive` = true
WHERE `id` = @legacy_admin_id
  AND @primary_superuser_id IS NULL;

UPDATE `User`
SET
  `role` = 'SUPERUSER',
  `isActive` = true
WHERE LOWER(`email`) COLLATE utf8mb4_unicode_ci = @primary_superuser_email COLLATE utf8mb4_unicode_ci;

SET @owner_user_id = (
  SELECT `id`
  FROM `User`
  WHERE LOWER(`email`) COLLATE utf8mb4_unicode_ci = @primary_superuser_email COLLATE utf8mb4_unicode_ci
  LIMIT 1
);

UPDATE `Asset` SET `userId` = @owner_user_id WHERE `userId` IS NULL AND @owner_user_id IS NOT NULL;
UPDATE `Debt` SET `userId` = @owner_user_id WHERE `userId` IS NULL AND @owner_user_id IS NOT NULL;
UPDATE `Transaction` SET `userId` = @owner_user_id WHERE `userId` IS NULL AND @owner_user_id IS NOT NULL;
UPDATE `Subscription` SET `userId` = @owner_user_id WHERE `userId` IS NULL AND @owner_user_id IS NOT NULL;
UPDATE `AIInsight` SET `userId` = @owner_user_id WHERE `userId` IS NULL AND @owner_user_id IS NOT NULL;
UPDATE `Reminder` SET `userId` = @owner_user_id WHERE `userId` IS NULL AND @owner_user_id IS NOT NULL;
UPDATE `MarketRate` SET `userId` = @owner_user_id WHERE `userId` IS NULL AND @owner_user_id IS NOT NULL;
