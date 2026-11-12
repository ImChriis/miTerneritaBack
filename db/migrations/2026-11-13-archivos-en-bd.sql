-- Comprobantes de pago y CVs guardados en la BD: el disco de Render gratis se
-- borra en cada deploy o reinicio. `comprobante` y `cv` siguen guardando el
-- nombre (de el sale la extension y el tipo); el contenido va en *Data.
-- Aditiva y re-ejecutable.
ALTER TABLE `payment` ADD COLUMN IF NOT EXISTS `comprobanteData` MEDIUMBLOB NULL;
ALTER TABLE `postulacion` ADD COLUMN IF NOT EXISTS `cvData` MEDIUMBLOB NULL;
