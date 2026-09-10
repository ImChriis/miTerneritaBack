-- paymentdetails.quantity es NOT NULL y no tiene DEFAULT, pero ninguna
-- entidad ni servicio la escribe: es un resto de un diseno anterior
-- (la entidad PaymentDetails duplicada que vivia en src/payments/entities).
--
-- El servidor actual corre sin STRICT_TRANS_TABLES, asi que MySQL rellena un 0
-- en silencio. En un servidor con modo estricto (el de por defecto desde
-- MySQL 5.7) cada INSERT en paymentdetails fallaria con
-- "Field 'quantity' doesn't have a default value".
--
-- Se le da un DEFAULT en vez de borrar la columna para que el cambio sea
-- reversible. Si se confirma que nadie la consume, se puede eliminar despues:
--   ALTER TABLE `paymentdetails` DROP COLUMN `quantity`;

ALTER TABLE `paymentdetails`
  MODIFY COLUMN `quantity` int(11) NOT NULL DEFAULT 1;
