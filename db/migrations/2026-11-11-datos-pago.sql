-- Datos de las cuentas que reciben los pagos (Pago Movil y Zelle). Los edita
-- el admin en Configuracion y la pantalla de pago los lee de GET /configuration.
-- Aditiva y re-ejecutable. Los valores por defecto son los que estaban fijos
-- en el front: cambialos desde el panel.
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `pmBanco` VARCHAR(100) NULL DEFAULT 'Banplus';
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `pmCedula` VARCHAR(100) NULL DEFAULT 'V-12345678';
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `pmTelefono` VARCHAR(100) NULL DEFAULT '04241234567';
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `zelleTitular` VARCHAR(100) NULL DEFAULT 'Juan Perez';
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `zelleTelefono` VARCHAR(100) NULL DEFAULT '042412345674';
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `zelleCorreo` VARCHAR(100) NULL DEFAULT 'juanperez@gmail.com';
