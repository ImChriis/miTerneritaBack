-- Postulaciones de trabajo: formulario público "Trabaja con nosotros"; el
-- admin las revisa en el panel (GET /postulaciones).
--
-- Aditiva: el código anterior no usa esta tabla, así que puede aplicarse antes
-- de desplegar. Se puede ejecutar más de una vez.

CREATE TABLE IF NOT EXISTS `postulacion` (
  `idPostulacion` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `cedula` varchar(13) NOT NULL,
  `email` varchar(80) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `puesto` varchar(30) NOT NULL,
  `mensaje` text DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'Nueva',
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`idPostulacion`),
  KEY `idx_postulacion_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Marcha atrás (solo si se revierte el código):
-- DROP TABLE `postulacion`;
