-- Tabularis Dump
-- Database: ternera
-- Date: 2026-05-27T15:00:16.712583600-04:00

-- Structure for table `code`
DROP TABLE IF EXISTS `code`;
CREATE TABLE `code` (
  `idCode` int(11) NOT NULL AUTO_INCREMENT,
  `QR` text NOT NULL,
  `idPayment` int(11) DEFAULT NULL,
  PRIMARY KEY (`idCode`),
  KEY `idPayment` (`idPayment`),
  CONSTRAINT `code_ibfk_1` FOREIGN KEY (`idPayment`) REFERENCES `payment` (`idPayment`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table `code`


-- Structure for table `configuration`
DROP TABLE IF EXISTS `configuration`;
CREATE TABLE `configuration` (
  `idConfiguration` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `instagram` varchar(100) DEFAULT NULL,
  `BCV` decimal(10,2) DEFAULT NULL,
  `Dolar` decimal(15,4) DEFAULT NULL,
  PRIMARY KEY (`idConfiguration`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table `configuration`
INSERT INTO `configuration` VALUES (1, 'miterneritahouse@gmail.com', '0424', 'IG', '200.00', '300.0000');


-- Structure for table `consumedetails`
DROP TABLE IF EXISTS `consumedetails`;
CREATE TABLE `consumedetails` (
  `idConsumeDetails` int(11) NOT NULL AUTO_INCREMENT,
  `idFood` int(11) DEFAULT NULL,
  `foodAmount` int(11) DEFAULT 0,
  `idDrinks` int(11) DEFAULT NULL,
  `drinksAmount` int(11) DEFAULT 0,
  `idPayment` int(11) DEFAULT NULL,
  `totalConsume` decimal(10,2) NOT NULL,
  PRIMARY KEY (`idConsumeDetails`),
  KEY `idFood` (`idFood`),
  KEY `idDrinks` (`idDrinks`),
  KEY `idPayment` (`idPayment`),
  CONSTRAINT `consumedetails_ibfk_1` FOREIGN KEY (`idFood`) REFERENCES `food` (`idFood`),
  CONSTRAINT `consumedetails_ibfk_2` FOREIGN KEY (`idDrinks`) REFERENCES `drinks` (`idDrinks`),
  CONSTRAINT `consumedetails_ibfk_3` FOREIGN KEY (`idPayment`) REFERENCES `payment` (`idPayment`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table `consumedetails`


-- Structure for table `drinks`
DROP TABLE IF EXISTS `drinks`;
CREATE TABLE `drinks` (
  `idDrinks` int(11) NOT NULL AUTO_INCREMENT,
  `description` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `status` tinyint(4) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idDrinks`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table `drinks`
INSERT INTO `drinks` VALUES (1, 'Pina Colada', '5.00', 1, 'NEGRONI.JPG'), (2, 'Pina Colada', '5.00', 1, 'Met-Gala-2025-memes-45-20250506.webp');


-- Structure for table `events`
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `idEvents` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL,
  `room` varchar(100) DEFAULT NULL,
  `capacity` int(11) DEFAULT NULL,
  `status` tinyint(4) NOT NULL,
  `flyer` text DEFAULT NULL,
  `image1` text DEFAULT NULL,
  `image2` text DEFAULT NULL,
  `image3` text DEFAULT NULL,
  `imageS` varchar(255) DEFAULT NULL,
  `imageL` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idEvents`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table `events`


-- Structure for table `food`
DROP TABLE IF EXISTS `food`;
CREATE TABLE `food` (
  `idFood` int(11) NOT NULL AUTO_INCREMENT,
  `description` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `status` tinyint(4) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idFood`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table `food`
INSERT INTO `food` VALUES (1, 'Chicken Fingers', '5.00', 1, NULL), (2, 'Mini burgers', '20.00', 1, NULL);


-- Structure for table `payment`
DROP TABLE IF EXISTS `payment`;
CREATE TABLE `payment` (
  `idPayment` int(11) NOT NULL AUTO_INCREMENT,
  `noDocumento` varchar(100) DEFAULT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `idUser` int(11) DEFAULT NULL,
  `idEvents` int(11) DEFAULT NULL,
  `idConsumeDetails` int(11) DEFAULT NULL,
  `totalBaseImponible` decimal(15,2) DEFAULT NULL,
  `impuestoBaseImponible` decimal(15,2) DEFAULT NULL,
  `totalExento` decimal(15,2) DEFAULT NULL,
  `descuento` decimal(15,2) DEFAULT NULL,
  `subtotalGeneral` decimal(15,2) DEFAULT NULL,
  `porcentajeIgtf` decimal(5,2) DEFAULT NULL,
  `totalIgtf` decimal(15,2) DEFAULT NULL,
  `impuesto` decimal(15,2) DEFAULT NULL,
  `porcentajeIva` decimal(5,2) DEFAULT NULL,
  `totalGeneral` decimal(15,2) DEFAULT NULL,
  `tasaDolar` decimal(15,4) DEFAULT NULL,
  `montoDolar` decimal(15,2) DEFAULT NULL,
  `comprobante` varchar(255) DEFAULT NULL,
  `banco` varchar(100) DEFAULT NULL,
  `referencia` varchar(100) DEFAULT NULL,
  `fechaTransferencia` date DEFAULT NULL,
  `status` enum('Aprovado','Pendiente','Rechazado') NOT NULL DEFAULT 'Pendiente',
  `isDeleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`idPayment`),
  KEY `idEvents` (`idEvents`),
  KEY `payment_ibfk_1` (`idUser`),
  CONSTRAINT `payment_ibfk_1` FOREIGN KEY (`idUser`) REFERENCES `users` (`idUser`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payment_ibfk_2` FOREIGN KEY (`idEvents`) REFERENCES `events` (`idEvents`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table `payment`


-- Structure for table `paymentdetails`
DROP TABLE IF EXISTS `paymentdetails`;
CREATE TABLE `paymentdetails` (
  `idPaymentDetails` int(11) NOT NULL AUTO_INCREMENT,
  `idPayment` int(11) DEFAULT NULL,
  `idEvents` int(11) DEFAULT NULL,
  `idUser` int(11) DEFAULT NULL,
  `ticketNum` int(11) DEFAULT NULL,
  `precio` decimal(10,2) DEFAULT NULL,
  `totalBase` decimal(15,2) DEFAULT NULL,
  `impuestoCalculado` decimal(15,2) DEFAULT NULL,
  `total` decimal(15,2) DEFAULT NULL,
  `tasaDolarEvento` decimal(15,4) DEFAULT NULL,
  `totalDolarEvento` decimal(15,2) DEFAULT NULL,
  `idTicket` int(11) DEFAULT NULL,
  `idConsumeDetails` int(11) DEFAULT NULL,
  `status` tinyint(4) DEFAULT NULL,
  `checked` tinyint(4) DEFAULT NULL,
  `isDeleted` tinyint(1) DEFAULT 0,
  `quantity` int(11) NOT NULL,
  PRIMARY KEY (`idPaymentDetails`),
  KEY `idPayment` (`idPayment`),
  KEY `idEvents` (`idEvents`),
  KEY `idUser` (`idUser`),
  KEY `idTicket` (`idTicket`),
  KEY `idConsumeDetails` (`idConsumeDetails`),
  CONSTRAINT `paymentdetails_ibfk_1` FOREIGN KEY (`idPayment`) REFERENCES `payment` (`idPayment`),
  CONSTRAINT `paymentdetails_ibfk_2` FOREIGN KEY (`idEvents`) REFERENCES `events` (`idEvents`),
  CONSTRAINT `paymentdetails_ibfk_3` FOREIGN KEY (`idUser`) REFERENCES `users` (`idUser`),
  CONSTRAINT `paymentdetails_ibfk_4` FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`),
  CONSTRAINT `paymentdetails_ibfk_5` FOREIGN KEY (`idConsumeDetails`) REFERENCES `consumedetails` (`idConsumeDetails`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table `paymentdetails`


-- Structure for table `paymentmethod`
DROP TABLE IF EXISTS `paymentmethod`;
CREATE TABLE `paymentmethod` (
  `idMethod` int(11) NOT NULL AUTO_INCREMENT,
  `description` varchar(100) NOT NULL,
  PRIMARY KEY (`idMethod`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table `paymentmethod`
INSERT INTO `paymentmethod` VALUES (1, 'Pago Móvil'), (2, 'Transferencia'), (3, 'Tarjeta de Crédito'), (4, 'Zelle');


-- Structure for table `roles`
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `idRol` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`idRol`),
  UNIQUE KEY `IDX_8eadedb8470c92966389ecc216` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Data for table `roles`
INSERT INTO `roles` VALUES (2, 'admin'), (1, 'user');


-- Structure for table `ticket`
DROP TABLE IF EXISTS `ticket`;
CREATE TABLE `ticket` (
  `idTicket` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idTicket`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table `ticket`
INSERT INTO `ticket` VALUES (1, 'General', '5.00', 1), (2, 'VIP', '8.00', 1);


-- Structure for table `users`
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `idUser` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(25) NOT NULL,
  `lastName` varchar(25) NOT NULL,
  `cedula` varchar(13) NOT NULL,
  `email` varchar(80) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `status` tinyint(4) NOT NULL,
  `fechaRegistro` datetime NOT NULL DEFAULT current_timestamp(),
  `idRol` int(11) DEFAULT NULL,
  PRIMARY KEY (`idUser`),
  UNIQUE KEY `cedula` (`cedula`),
  UNIQUE KEY `email` (`email`),
  KEY `idRol` (`idRol`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`idRol`) REFERENCES `roles` (`idRol`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table `users`
INSERT INTO `users` VALUES (1, 'Jose', 'Hernandez', '31419200', 'josecaherofficial@gmail.com', '$2b$10$tlEttYkmgzMAutUw9fBouOafQH4DqTQpOFNZGTFyaycfMUB.ky4hO', '04246150916', 1, '2025-10-02 11:04:38', 2), (5, 'Christopher', 'Medina', 'V-31262324', 'christophermedinabarroso@gmail.com', '$2b$10$mWbQ4K4CQzjDCksx5ZoHj.8LbW80hBr.zLIlcHfrMsqwjlDzOGHeS', '4146416366', 1, '2025-10-30 11:22:33', 2), (6, 'User', 'Test', 'V-31262325', 'test@gmail.com', '$2b$10$b8yLWffliX0BOlVcOmGuXOgNCVGhTdpHLMAHJR319M.bzGUQvVYme', '4146416366', 1, '2026-05-27 10:20:58', 2);


