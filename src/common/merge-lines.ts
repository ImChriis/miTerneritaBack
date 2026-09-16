/**
 * Junta las lineas que se refieren a lo mismo sumando sus cantidades.
 *
 * El carrito del front permite anadir la misma zona o el mismo producto dos
 * veces (General x1 y luego General x2). Antes eso se rechazaba con un 400;
 * como el precio y el aforo se calculan en el backend sobre la cantidad total,
 * agrupar es seguro y la factura sale con una sola linea (General x3).
 *
 * Conserva el orden en que aparece cada linea por primera vez.
 */
export function sumQuantitiesBy<T extends { cantidad: number }>(
  lines: T[],
  keyOf: (line: T) => string | number,
): T[] {
  const merged = new Map<string | number, T>();

  for (const line of lines) {
    const key = keyOf(line);
    const previous = merged.get(key);
    merged.set(
      key,
      previous
        ? { ...previous, cantidad: previous.cantidad + line.cantidad }
        : { ...line },
    );
  }

  return [...merged.values()];
}
