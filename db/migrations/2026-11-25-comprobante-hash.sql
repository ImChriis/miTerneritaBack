-- Huella SHA-256 del comprobante: la misma imagen no se puede usar en dos pagos.
-- Aplicar en TiDB (base `ternera`) antes o durante el deploy del backend.
ALTER TABLE payment ADD COLUMN IF NOT EXISTS comprobanteHash CHAR(64) NULL;
CREATE INDEX IF NOT EXISTS idx_payment_comprobanteHash ON payment (comprobanteHash);
-- Conciliacion y exportacion filtran por estado y fecha.
CREATE INDEX IF NOT EXISTS idx_payment_status_date ON payment (status, date);
