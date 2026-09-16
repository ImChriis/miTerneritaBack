/**
 * Normaliza la hora de un evento al formato de la columna TIME (HH:MM:SS).
 *
 * Acepta "20:00", "20:00:00" o una fecha ISO completa como
 * "2026-12-20T20:00:00", de la que se toma la hora tal cual, sin convertir
 * zona horaria. Antes el DTO exigia siempre una fecha ISO completa para una
 * columna que solo guarda la hora, y "20:00" daba 400.
 */
export function normalizeTime(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const texto = value.trim();
  const hora = /^(?:\d{4}-\d{2}-\d{2}T)?(\d{2}:\d{2})(:\d{2})?/.exec(texto);
  return hora ? `${hora[1]}${hora[2] ?? ':00'}` : texto;
}

export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
export const TIME_MESSAGE = 'time debe tener formato HH:MM o HH:MM:SS';
