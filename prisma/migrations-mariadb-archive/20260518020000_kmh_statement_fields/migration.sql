ALTER TABLE `Account`
  ADD COLUMN `kmhStatementDate` DATETIME(3) NULL,
  ADD COLUMN `kmhStatementPrincipal` DOUBLE NULL,
  ADD COLUMN `kmhStatementInterest` DOUBLE NULL,
  ADD COLUMN `kmhMinimumPayment` DOUBLE NULL,
  ADD COLUMN `kmhNextCutOffDate` DATETIME(3) NULL,
  ADD COLUMN `kmhNextPaymentDate` DATETIME(3) NULL;
