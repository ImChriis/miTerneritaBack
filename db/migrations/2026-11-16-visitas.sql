-- Analitica de visitas del sitio publico (sin IP ni datos personales) y hora
-- en que el admin revisa cada pago. Aditiva y re-ejecutable: puede aplicarse
-- antes del codigo, pero el codigo la necesita (registro de visitas y cambio
-- de estado del pago).

-- Una visita = una sesion del navegador (se renueva tras 30 min sin actividad).
-- `visitante` es un id anonimo que el navegador guarda: distingue visitantes
-- nuevos de recurrentes. `ultimo` lo actualiza un latido cada minuto.
CREATE TABLE IF NOT EXISTS `visita` (
  `sesion` char(36) NOT NULL,
  `visitante` char(36) NOT NULL,
  `dispositivo` varchar(10) NOT NULL,
  `inicio` datetime NOT NULL,
  `ultimo` datetime NOT NULL,
  `paginas` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`sesion`),
  KEY `idx_visita_inicio` (`inicio`),
  KEY `idx_visita_ultimo` (`ultimo`),
  KEY `idx_visita_visitante` (`visitante`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Pasos del embudo de compra por visita (evento, entradas, consumo, datos,
-- pago, pagado). Una fila por sesion, paso y evento (0 = sin evento).
CREATE TABLE IF NOT EXISTS `visita_paso` (
  `sesion` char(36) NOT NULL,
  `paso` varchar(10) NOT NULL,
  `idEvents` int(11) NOT NULL DEFAULT 0,
  `creado` datetime NOT NULL,
  PRIMARY KEY (`sesion`, `paso`, `idEvents`),
  KEY `idx_visita_paso_creado` (`creado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Cuando el admin aprueba o rechaza un pago pendiente: mide la espera del cliente.
ALTER TABLE `payment` ADD COLUMN IF NOT EXISTS `revisado` datetime DEFAULT NULL;
