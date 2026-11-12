-- Transferencia bancaria como tercer metodo de pago, y datos reales de las
-- cuentas receptoras (Pago Movil, Zelle y transferencia). Re-ejecutable.
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `trBanco` VARCHAR(100) NULL;
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `trCuenta` VARCHAR(100) NULL;
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `trRif` VARCHAR(100) NULL;

UPDATE `configuration` SET
  `pmBanco` = '0174 - Banplus',
  `pmTelefono` = '04146363939',
  `pmCedula` = 'J315747960',
  `zelleTitular` = 'EQUIPA LLC',
  `zelleTelefono` = NULL,
  `zelleCorreo` = 'terneramusic@gmail.com',
  `trBanco` = '0134 - Banesco',
  `trCuenta` = '0134-0086-54-0863164865',
  `trRif` = 'J315747960';
