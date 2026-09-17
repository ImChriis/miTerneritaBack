-- Numero de documento secuencial para los pagos (0000001, 0000002...,
-- 9999999, A0000001...). El formato lo calcula src/payments/document-number.ts
-- a partir del contador; aqui solo se guarda la posicion en la secuencia.
--
-- Se ejecuta UNA vez. El orden de los pasos importa: ver el paso 2.

-- 1) Contador de documentos. Una fila por secuencia; la de pagos es 'payment'.
--    Se incrementa dentro de la transaccion de cada compra: si la compra falla,
--    el incremento se deshace y no quedan huecos en la numeracion.
CREATE TABLE IF NOT EXISTS `document_sequence` (
  `name` varchar(50) NOT NULL,
  `last_value` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2) La fecha de compra se sobrescribia en cada actualizacion del pago
--    (aprobar, rechazar, borrar, corregir consumo) por el ON UPDATE.
--    Tiene que ir ANTES del paso 3: el UPDATE que numera los pagos existentes
--    pondria la fecha de hoy a todos si el ON UPDATE siguiera activo.
--    Las fechas que ya se alteraron no se pueden recuperar.
ALTER TABLE `payment`
  MODIFY COLUMN `date` timestamp NOT NULL DEFAULT current_timestamp();

-- 3) Numerar los pagos existentes por orden de creacion real (idPayment; la
--    columna date no sirve porque estaba alterada). Sobrescribe cualquier valor
--    previo de noDocumento. Formato sin letra: basta mientras haya menos de
--    9.999.999 pagos existentes.
SET @n := 0;
UPDATE `payment`
  SET `noDocumento` = LPAD((@n := @n + 1), 7, '0')
  ORDER BY `idPayment`;

-- 4) El contador arranca detras del ultimo numero asignado.
INSERT INTO `document_sequence` (`name`, `last_value`)
  SELECT 'payment', COUNT(*) FROM `payment`
  ON DUPLICATE KEY UPDATE `last_value` = GREATEST(`last_value`, VALUES(`last_value`));

-- 5) Garantia de integridad: dos pagos nunca pueden compartir numero.
ALTER TABLE `payment`
  ADD UNIQUE KEY `uq_payment_noDocumento` (`noDocumento`);
