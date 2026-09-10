/**
 * Formatea una fecha sin hora (columna DATE) como DD/MM/AAAA.
 *
 * TypeORM entrega las columnas DATE como string 'AAAA-MM-DD'. Pasarlas por
 * new Date() las interpreta como medianoche UTC, y al formatearlas en hora
 * local (Caracas es UTC-4) el resultado retrocede un dia: 2026-10-12 salia
 * como 11/10/2026 en los correos.
 *
 * Aqui no se convierte nada de zona horaria: una fecha sin hora no tiene
 * instante, solo dia.
 */
export function formatDateOnly(value?: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const [year, month, day] = value.slice(0, 10).split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  }

  // Por si alguna ruta entrega un Date: se usan sus componentes locales, que
  // es como TypeORM construye el valor al leerlo de MySQL.
  const day = `${value.getDate()}`.padStart(2, '0');
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  return `${day}/${month}/${value.getFullYear()}`;
}
