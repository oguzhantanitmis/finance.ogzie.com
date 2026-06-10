-- Bileşik performans indeksleri — sık kullanılan userId + tarih/durum filtreleri
CREATE INDEX `DebtAccount_userId_status_idx` ON `DebtAccount`(`userId`, `status`);
CREATE INDEX `LedgerEntry_userId_date_idx` ON `LedgerEntry`(`userId`, `date`);
CREATE INDEX `ReceivablePayable_userId_status_idx` ON `ReceivablePayable`(`userId`, `status`);
CREATE INDEX `Transaction_userId_date_idx` ON `Transaction`(`userId`, `date`);
