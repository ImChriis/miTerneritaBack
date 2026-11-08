-- Galeria de fotos de los eventos: la sube el admin despues del evento y la
-- ven todos en la pagina del evento ("revive tu noche").
--
-- Aditiva: el codigo anterior no usa esta tabla, asi que puede aplicarse antes
-- de desplegar. Se puede ejecutar mas de una vez.
--
-- Los archivos van a src/assets/img/galeria/ y `image` guarda la ruta relativa
-- a src/assets/img (galeria/<uuid>.webp), igual que el resto de imagenes.

CREATE TABLE IF NOT EXISTS `event_photo` (
  `idPhoto` int(11) NOT NULL AUTO_INCREMENT,
  `idEvents` int(11) NOT NULL,
  `image` varchar(255) NOT NULL,
  `fechaSubida` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`idPhoto`),
  KEY `idx_event_photo_evento` (`idEvents`),
  CONSTRAINT `event_photo_ibfk_1` FOREIGN KEY (`idEvents`) REFERENCES `events` (`idEvents`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Marcha atras (solo si se revierte el codigo):
-- DROP TABLE `event_photo`;
