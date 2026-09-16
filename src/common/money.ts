/**
 * Importes en centimos. MySQL devuelve los DECIMAL como string ('20.00') y
 * operar con floats acumula errores de redondeo (0.1 + 0.2 !== 0.3), asi que
 * los calculos se hacen con enteros y se convierten al final.
 */
export const toCents = (value: string | number | null | undefined): number =>
  Math.round(Number(value ?? 0) * 100);

export const fromCents = (cents: number): number => cents / 100;
