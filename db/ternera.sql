-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 29-07-2026 a las 21:29:29
-- Versión del servidor: 10.4.28-MariaDB
-- Versión de PHP: 8.0.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `ternera`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `code`
--

CREATE TABLE `code` (
  `idCode` int(11) NOT NULL,
  `QR` text NOT NULL,
  `idPayment` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuration`
--

CREATE TABLE `configuration` (
  `idConfiguration` int(11) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `instagram` varchar(100) DEFAULT NULL,
  `tasaDolar` decimal(10,2) NOT NULL,
  `BCV` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `configuration`
--

INSERT INTO `configuration` (`idConfiguration`, `email`, `phone`, `instagram`, `tasaDolar`, `BCV`) VALUES
(1, 'miterneritahouse@gmail.com', '0424', 'IGmiterneritahouse', 0.00, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `consumedetails`
--

CREATE TABLE `consumedetails` (
  `idConsumeDetails` int(11) NOT NULL,
  `idFood` int(11) DEFAULT NULL,
  `foodAmount` int(11) DEFAULT 0,
  `idDrinks` int(11) DEFAULT NULL,
  `drinksAmount` int(11) DEFAULT 0,
  `idPayment` int(11) DEFAULT NULL,
  `totalConsume` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `drinks`
--

CREATE TABLE `drinks` (
  `idDrinks` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `status` tinyint(4) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `drinks`
--

INSERT INTO `drinks` (`idDrinks`, `description`, `price`, `status`, `image`, `activo`) VALUES
(2, 'Moscow Mule', 10.00, 1, 'moscow-mule.webp', 1),
(4, 'Cosmopolitan', 4.00, 1, 'cosmopolitan.webp', 1),
(5, 'Negroni', 20.00, 1, 'negroni.webp', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `events`
--

CREATE TABLE `events` (
  `idEvents` int(11) NOT NULL,
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
  `consumo` tinyint(4) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `events`
--

INSERT INTO `events` (`idEvents`, `name`, `description`, `date`, `time`, `room`, `capacity`, `status`, `flyer`, `image1`, `image2`, `image3`, `consumo`, `activo`) VALUES
(9, 'XXXXXXXXXDDDDDDDDDD', '<p>asdadsa</p>', '2026-05-28', '02:00:00', 'asdada', 1000, 1, 'p-asdadsa-p-flyer.webp', '1779982826484-862112513.webp', '1779982826644-912821521.webp', 'p-asdadsa-p-image3.webp', 0, 1),
(10, 'jgh 22zzzz', '<p>jhbjhgj22</p>', '2026-06-04', '15:15:00', 'lllll2', 52, 0, 'p-jhbjhgj-p-flyer.webp', 'p-jhbjhgj22-p-image1_1.webp', 'p-jhbjhgj22-p-image2.webp', 'p-jhbjhgj-p-image3.webp', 0, 1),
(11, 'vvvv', '<p>adadaaadasda</p>', '2026-06-16', '15:11:00', 'asasd', 1, 1, 'p-adadaaadasda-p-flyer_2.webp', 'p-adadaaadasda-p-image1_2.webp', 'p-adadaaadasda-p-image2_2.webp', 'p-adadaaadasda-p-image3_2.webp', 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `food`
--

CREATE TABLE `food` (
  `idFood` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `status` tinyint(4) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `food`
--

INSERT INTO `food` (`idFood`, `description`, `price`, `status`, `image`, `activo`) VALUES
(1, 'Chicken Fingers', 5.00, 1, NULL, 1),
(2, 'Mini burgers', 20.00, 1, NULL, 1),
(5, 'Mini Empanadas', 10.00, 1, NULL, 1),
(6, 'pene', 20.00, 1, 'pene.webp', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `payment`
--

CREATE TABLE `payment` (
  `idPayment` int(11) NOT NULL,
  `noDocumento` varchar(100) DEFAULT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `idUser` int(11) DEFAULT NULL,
  `idEvents` int(11) DEFAULT NULL,
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
  `status` enum('Aprobado','Pendiente','Rechazado') NOT NULL DEFAULT 'Pendiente',
  `isDeleted` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `paymentdetails`
--

CREATE TABLE `paymentdetails` (
  `idPaymentDetails` int(11) NOT NULL,
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
  `quantity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `paymentmethod`
--

CREATE TABLE `paymentmethod` (
  `idMethod` int(11) NOT NULL,
  `description` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `paymentmethod`
--

INSERT INTO `paymentmethod` (`idMethod`, `description`) VALUES
(1, 'Pago Móvil'),
(2, 'Transferencia'),
(3, 'Tarjeta de Crédito'),
(4, 'Zelle');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `idRol` int(11) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`idRol`, `name`) VALUES
(2, 'admin'),
(1, 'user');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ticket`
--

CREATE TABLE `ticket` (
  `idTicket` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 1,
  `idEvents` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `ticket`
--

INSERT INTO `ticket` (`idTicket`, `name`, `price`, `status`, `idEvents`) VALUES
(1, 'General', 5.00, 1, 11),
(2, 'VIP', 8.00, 1, 1),
(7, 'VVIP', 20.00, 1, 1),
(8, 'Horror Ticket', 20.00, 1, 8),
(12, 'ZZZ', 13.00, 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `idUser` int(11) NOT NULL,
  `name` varchar(25) NOT NULL,
  `lastName` varchar(25) NOT NULL,
  `cedula` varchar(13) NOT NULL,
  `email` varchar(80) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `status` tinyint(4) NOT NULL,
  `fechaRegistro` datetime NOT NULL DEFAULT current_timestamp(),
  `idRol` int(11) DEFAULT NULL,
  `resetPasswordToken` varchar(255) DEFAULT NULL,
  `resetPasswordExpires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`idUser`, `name`, `lastName`, `cedula`, `email`, `password`, `phone`, `status`, `fechaRegistro`, `idRol`, `resetPasswordToken`, `resetPasswordExpires`) VALUES
(1, 'Jose', 'Hernandez', '31419200', 'jhernandezdev05@gmail.com', '$2b$10$nECaP6L45qx9naBUk19xwu6QjgPk7zBMzJRFp1WIRKHoXxSyw1FO2', '04246150916', 1, '2025-10-02 11:04:38', 2, 'ad988454678565d60fe90becdfcaa2e7bb2d68837cdf1a66e7e6147c0debe85e', '2026-07-29 15:40:40'),
(5, 'Christopher', 'Medina', 'V-31262324', 'christophermedinabarroso@gmail.com', '$2b$10$mWbQ4K4CQzjDCksx5ZoHj.8LbW80hBr.zLIlcHfrMsqwjlDzOGHeS', '4146416366', 1, '2025-10-30 11:22:33', 2, 'ed123921378196f8ef848934b9bcc208d177cc74c6f9afea055b4d03a4d1104f', '2026-07-29 15:54:20'),
(6, 'User', 'Test', 'V-31262325', 'test@gmail.com', '$2b$10$b8yLWffliX0BOlVcOmGuXOgNCVGhTdpHLMAHJR319M.bzGUQvVYme', '4146416366', 1, '2026-05-27 10:20:58', 2, NULL, '2026-07-29 09:09:49'),
(8, 'Christopher', 'Medina', 'V-31262326', 'christophermedinab@hotmail.com', '$2b$10$AQUPgWziydYuKZLDcnftlej2.XkxizvUjjM0sJiAqYjObDVOH8ChO', '04146416366', 1, '2026-07-29 11:07:49', 1, NULL, NULL);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `code`
--
ALTER TABLE `code`
  ADD PRIMARY KEY (`idCode`),
  ADD KEY `idPayment` (`idPayment`);

--
-- Indices de la tabla `configuration`
--
ALTER TABLE `configuration`
  ADD PRIMARY KEY (`idConfiguration`);

--
-- Indices de la tabla `consumedetails`
--
ALTER TABLE `consumedetails`
  ADD PRIMARY KEY (`idConsumeDetails`),
  ADD KEY `idFood` (`idFood`),
  ADD KEY `idDrinks` (`idDrinks`),
  ADD KEY `idPayment` (`idPayment`);

--
-- Indices de la tabla `drinks`
--
ALTER TABLE `drinks`
  ADD PRIMARY KEY (`idDrinks`);

--
-- Indices de la tabla `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`idEvents`);

--
-- Indices de la tabla `food`
--
ALTER TABLE `food`
  ADD PRIMARY KEY (`idFood`);

--
-- Indices de la tabla `payment`
--
ALTER TABLE `payment`
  ADD PRIMARY KEY (`idPayment`),
  ADD KEY `idEvents` (`idEvents`),
  ADD KEY `payment_ibfk_1` (`idUser`);

--
-- Indices de la tabla `paymentdetails`
--
ALTER TABLE `paymentdetails`
  ADD PRIMARY KEY (`idPaymentDetails`),
  ADD KEY `idPayment` (`idPayment`),
  ADD KEY `idEvents` (`idEvents`),
  ADD KEY `idUser` (`idUser`),
  ADD KEY `idTicket` (`idTicket`),
  ADD KEY `idConsumeDetails` (`idConsumeDetails`);

--
-- Indices de la tabla `paymentmethod`
--
ALTER TABLE `paymentmethod`
  ADD PRIMARY KEY (`idMethod`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`idRol`),
  ADD UNIQUE KEY `IDX_8eadedb8470c92966389ecc216` (`name`);

--
-- Indices de la tabla `ticket`
--
ALTER TABLE `ticket`
  ADD PRIMARY KEY (`idTicket`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`idUser`),
  ADD UNIQUE KEY `cedula` (`cedula`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idRol` (`idRol`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `code`
--
ALTER TABLE `code`
  MODIFY `idCode` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `configuration`
--
ALTER TABLE `configuration`
  MODIFY `idConfiguration` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `consumedetails`
--
ALTER TABLE `consumedetails`
  MODIFY `idConsumeDetails` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `drinks`
--
ALTER TABLE `drinks`
  MODIFY `idDrinks` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `events`
--
ALTER TABLE `events`
  MODIFY `idEvents` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `food`
--
ALTER TABLE `food`
  MODIFY `idFood` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `payment`
--
ALTER TABLE `payment`
  MODIFY `idPayment` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `paymentdetails`
--
ALTER TABLE `paymentdetails`
  MODIFY `idPaymentDetails` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `paymentmethod`
--
ALTER TABLE `paymentmethod`
  MODIFY `idMethod` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `idRol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `ticket`
--
ALTER TABLE `ticket`
  MODIFY `idTicket` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `idUser` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `code`
--
ALTER TABLE `code`
  ADD CONSTRAINT `code_ibfk_1` FOREIGN KEY (`idPayment`) REFERENCES `payment` (`idPayment`);

--
-- Filtros para la tabla `consumedetails`
--
ALTER TABLE `consumedetails`
  ADD CONSTRAINT `consumedetails_ibfk_1` FOREIGN KEY (`idFood`) REFERENCES `food` (`idFood`),
  ADD CONSTRAINT `consumedetails_ibfk_2` FOREIGN KEY (`idDrinks`) REFERENCES `drinks` (`idDrinks`),
  ADD CONSTRAINT `consumedetails_ibfk_3` FOREIGN KEY (`idPayment`) REFERENCES `payment` (`idPayment`);

--
-- Filtros para la tabla `payment`
--
ALTER TABLE `payment`
  ADD CONSTRAINT `payment_ibfk_1` FOREIGN KEY (`idUser`) REFERENCES `users` (`idUser`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_ibfk_2` FOREIGN KEY (`idEvents`) REFERENCES `events` (`idEvents`);

--
-- Filtros para la tabla `paymentdetails`
--
ALTER TABLE `paymentdetails`
  ADD CONSTRAINT `paymentdetails_ibfk_1` FOREIGN KEY (`idPayment`) REFERENCES `payment` (`idPayment`),
  ADD CONSTRAINT `paymentdetails_ibfk_2` FOREIGN KEY (`idEvents`) REFERENCES `events` (`idEvents`),
  ADD CONSTRAINT `paymentdetails_ibfk_3` FOREIGN KEY (`idUser`) REFERENCES `users` (`idUser`),
  ADD CONSTRAINT `paymentdetails_ibfk_4` FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`),
  ADD CONSTRAINT `paymentdetails_ibfk_5` FOREIGN KEY (`idConsumeDetails`) REFERENCES `consumedetails` (`idConsumeDetails`);

--
-- Filtros para la tabla `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`idRol`) REFERENCES `roles` (`idRol`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
