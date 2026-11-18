-- Borrado logico de eventos y entradas con ventas: activo = 0 los oculta del
-- admin y del publico, pero los pagos y facturas siguen apuntando a la fila.
-- Aditiva y re-ejecutable; aplicarla antes de desplegar el codigo.
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `activo` TINYINT NOT NULL DEFAULT 1;
ALTER TABLE `ticket` ADD COLUMN IF NOT EXISTS `activo` TINYINT NOT NULL DEFAULT 1;
