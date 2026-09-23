-- Registro de escaneos en puerta: auditoria, idempotencia y deshacer.
--
-- Cada vez que se descuentan entradas de un QR (app de puerta, validate o la
-- marca manual del admin) queda una fila en scan_log y, en scan_log_detail,
-- exactamente que linea del pago se toco y cuanto. Nada se borra: deshacer
-- marca la fila (undoneAt/undoneBy) y devuelve las entradas.
--
-- Es aditiva: el codigo anterior no usa estas tablas, asi que puede aplicarse
-- antes de desplegar.
--
-- Fechas en DATETIME a proposito: en este servidor
-- explicit_defaults_for_timestamp = 0, y un TIMESTAMP sin default explicito
-- recibe ON UPDATE current_timestamp() (lo que sobrescribia payment.date).

CREATE TABLE IF NOT EXISTS `scan_log` (
  `idScan` int(11) NOT NULL AUTO_INCREMENT,
  -- Identificador que genera la app en cada escaneo. Si la app reintenta por
  -- mala cobertura con el mismo scanId, no se descuenta dos veces.
  `scanId` varchar(64) NOT NULL,
  -- Huella (sha256) de la peticion: detecta un scanId reutilizado con otros datos.
  `requestHash` char(64) NOT NULL,
  `origen` enum('app','validate','manual') NOT NULL,
  `idPayment` int(11) NOT NULL,
  `idUser` int(11) DEFAULT NULL,
  `idEvents` int(11) DEFAULT NULL,
  `puerta` varchar(50) DEFAULT NULL,
  -- Entradas descontadas en total. Negativo en correcciones manuales que liberan.
  `total` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `undoneAt` datetime DEFAULT NULL,
  `undoneBy` int(11) DEFAULT NULL,
  PRIMARY KEY (`idScan`),
  UNIQUE KEY `uq_scan_log_scanId` (`scanId`),
  KEY `ix_scan_log_payment` (`idPayment`, `fecha`),
  KEY `ix_scan_log_user` (`idUser`, `fecha`),
  KEY `ix_scan_log_event` (`idEvents`, `fecha`),
  CONSTRAINT `fk_scan_log_payment` FOREIGN KEY (`idPayment`) REFERENCES `payment` (`idPayment`) ON DELETE CASCADE,
  CONSTRAINT `fk_scan_log_user` FOREIGN KEY (`idUser`) REFERENCES `users` (`idUser`) ON DELETE SET NULL,
  CONSTRAINT `fk_scan_log_undone_by` FOREIGN KEY (`undoneBy`) REFERENCES `users` (`idUser`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `scan_log_detail` (
  `idScanDetail` int(11) NOT NULL AUTO_INCREMENT,
  `idScan` int(11) NOT NULL,
  `idPaymentDetails` int(11) NOT NULL,
  `idTicket` int(11) NOT NULL,
  -- Nombre del tipo en el momento del escaneo, por si el ticket cambia despues.
  `tipo` varchar(150) NOT NULL,
  `cantidad` int(11) NOT NULL,
  PRIMARY KEY (`idScanDetail`),
  KEY `ix_scan_log_detail_scan` (`idScan`),
  CONSTRAINT `fk_scan_log_detail_scan` FOREIGN KEY (`idScan`) REFERENCES `scan_log` (`idScan`) ON DELETE CASCADE,
  CONSTRAINT `fk_scan_log_detail_line` FOREIGN KEY (`idPaymentDetails`) REFERENCES `paymentdetails` (`idPaymentDetails`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
