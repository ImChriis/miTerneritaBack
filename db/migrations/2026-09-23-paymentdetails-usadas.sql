-- Entradas usadas por linea de pago, para escanear un QR en varias veces:
-- una compra de 15 entradas puede entrar 10 ahora y 5 despues.
--
-- Antes solo existia `checked` (si/no): el primer escaneo gastaba todas las
-- entradas del pago y quien llegaba tarde era rechazado. `checked` se mantiene
-- y el backend lo sigue actualizando (checked = usadas >= ticketNum), porque
-- el panel de admin lo lee.
--
-- Es aditiva: el codigo anterior sigue funcionando con la columna ya creada,
-- asi que puede aplicarse antes de desplegar.

ALTER TABLE `paymentdetails`
  ADD COLUMN `usadas` int(11) NOT NULL DEFAULT 0 AFTER `ticketNum`;

-- Lo ya escaneado con el sistema anterior cuenta como usado entero.
UPDATE `paymentdetails`
  SET `usadas` = COALESCE(`ticketNum`, 1)
  WHERE `checked` = 1;
