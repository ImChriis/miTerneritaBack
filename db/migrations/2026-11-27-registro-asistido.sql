-- Registro asistido de pagos: el personal compra en nombre de clientes sin cuenta
-- (p. ej. personas mayores sin correo) y queda constancia de quién lo registró.
-- Aplicar en TiDB (base `ternera`) antes o durante el deploy del backend.

-- Clientes dados de alta por el admin pueden no tener correo (la entrada se comparte
-- por WhatsApp o impresa). El índice UNIQUE admite varios NULL.
ALTER TABLE users MODIFY email VARCHAR(150) NULL;

-- Quién registró el pago desde el admin (NULL: lo hizo el propio cliente en la web).
ALTER TABLE payment ADD COLUMN IF NOT EXISTS idRegistradoPor INT NULL;
