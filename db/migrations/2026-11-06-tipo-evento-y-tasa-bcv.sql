-- Tipo de evento y tasa BCV automatica.
--
-- Aditiva: el codigo anterior ignora las columnas nuevas, asi que puede
-- aplicarse antes de desplegar. Se puede ejecutar mas de una vez.

-- 1) events.category: 'evento' | 'concierto' | 'fiesta'. Solo los conciertos
--    muestran el mapa del salon. Los existentes quedan como 'evento'; el admin
--    marca los conciertos desde el panel.
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `category` VARCHAR(20) NOT NULL DEFAULT 'evento';

-- 2) Tasa BCV: la actualiza el servidor cada 3 horas desde ve.dolarapi.com.
--    4 decimales como la publica el BCV (896,1225) y la fecha de esa tasa.
ALTER TABLE `configuration` MODIFY COLUMN `BCV` DECIMAL(12,4) NULL;
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `fechaBCV` DATETIME NULL;

-- Marcha atras (solo si se revierte el codigo):
-- ALTER TABLE `events` DROP COLUMN `category`;
-- ALTER TABLE `configuration` DROP COLUMN `fechaBCV`;
