-- Horario del local (solo informativo: la web vende las 24 h). JSON con 7 dias,
-- de lunes a domingo: [{"cerrado":bool,"abre":"HH:MM","cierra":"HH:MM"}, ...].
-- Lo edita el admin en Configuracion. Aditiva y re-ejecutable.
ALTER TABLE `configuration` ADD COLUMN IF NOT EXISTS `horario` TEXT NULL;
UPDATE `configuration` SET `horario` = '[{"cerrado":true,"abre":"12:00","cierra":"23:00"},{"cerrado":false,"abre":"12:00","cierra":"23:00"},{"cerrado":false,"abre":"12:00","cierra":"23:00"},{"cerrado":false,"abre":"12:00","cierra":"23:00"},{"cerrado":false,"abre":"12:00","cierra":"03:00"},{"cerrado":false,"abre":"12:00","cierra":"03:00"},{"cerrado":false,"abre":"12:00","cierra":"23:00"}]'
WHERE `horario` IS NULL;
