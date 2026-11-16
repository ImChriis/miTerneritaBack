-- Mapa del salon: zona (tipo de entrada) de cada mesa por evento y puestos
-- apartados o vendidos. Aditiva y re-ejecutable: puede aplicarse antes del
-- codigo.

CREATE TABLE IF NOT EXISTS `mesa_zona` (
  `idEvents` int(11) NOT NULL,
  `mesa` int(11) NOT NULL,
  `idTicket` int(11) NOT NULL,
  PRIMARY KEY (`idEvents`, `mesa`),
  KEY `idx_mesa_zona_ticket` (`idTicket`),
  CONSTRAINT `mesa_zona_evento` FOREIGN KEY (`idEvents`) REFERENCES `events` (`idEvents`) ON DELETE CASCADE,
  CONSTRAINT `mesa_zona_ticket` FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Un puesto ("5A") por evento: apartado (idPayment NULL, con `vence`) o
-- vendido (con idPayment). El indice unico impide venderlo dos veces.
CREATE TABLE IF NOT EXISTS `asiento` (
  `idAsiento` int(11) NOT NULL AUTO_INCREMENT,
  `idEvents` int(11) NOT NULL,
  `asiento` varchar(5) NOT NULL,
  `idUser` int(11) NOT NULL,
  `idPayment` int(11) DEFAULT NULL,
  `vence` datetime DEFAULT NULL,
  PRIMARY KEY (`idAsiento`),
  UNIQUE KEY `uq_asiento_evento` (`idEvents`, `asiento`),
  KEY `idx_asiento_pago` (`idPayment`),
  CONSTRAINT `asiento_evento` FOREIGN KEY (`idEvents`) REFERENCES `events` (`idEvents`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Marcha atras:
-- DROP TABLE `asiento`;
-- DROP TABLE `mesa_zona`;
