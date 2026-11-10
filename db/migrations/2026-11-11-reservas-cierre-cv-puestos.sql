-- Apartado temporal de entradas, cierre de venta, CV en postulaciones y
-- puestos abiertos. Aditiva y re-ejecutable: puede aplicarse antes del código.

-- Entradas apartadas mientras el cliente paga (como en el cine). Cuentan para
-- el aforo hasta `vence`; al pagar se borran. Una por usuario y evento.
CREATE TABLE IF NOT EXISTS `reserva` (
  `idReserva` int(11) NOT NULL AUTO_INCREMENT,
  `idEvents` int(11) NOT NULL,
  `idUser` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `vence` datetime NOT NULL,
  PRIMARY KEY (`idReserva`),
  UNIQUE KEY `uq_reserva_evento_usuario` (`idEvents`, `idUser`),
  KEY `idx_reserva_vence` (`vence`),
  CONSTRAINT `reserva_ibfk_evento` FOREIGN KEY (`idEvents`) REFERENCES `events` (`idEvents`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Fecha y hora en que se deja de vender. NULL = sin cierre.
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `cierreVenta` DATETIME NULL;

-- Nombre del PDF del CV en uploads/cv (privado). NULL = sin CV.
ALTER TABLE `postulacion` ADD COLUMN IF NOT EXISTS `cv` VARCHAR(64) NULL;

-- Puestos que acepta el formulario de empleo, separados por coma.
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `puestosAbiertos` VARCHAR(255) NOT NULL DEFAULT 'Cocina,Bartender';

-- Marcha atrás:
-- DROP TABLE `reserva`;
-- ALTER TABLE `events` DROP COLUMN `cierreVenta`;
-- ALTER TABLE `postulacion` DROP COLUMN `cv`;
-- ALTER TABLE `configuration` DROP COLUMN `puestosAbiertos`;
