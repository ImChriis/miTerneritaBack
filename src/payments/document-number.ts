/**
 * Numero de documento de un pago a partir de su posicion en la secuencia.
 *
 * Bloques de 9.999.999 numeros de 7 cifras; al agotarse un bloque se antepone
 * una letra y se vuelve a empezar en 0000001:
 *
 *   1          -> 0000001
 *   9999999    -> 9999999
 *   10000000   -> A0000001
 *   19999998   -> A9999999
 *   19999999   -> B0000001
 *   ...        -> Z9999999, AA0000001, AB0000001...
 *
 * Las letras siguen el orden de las columnas de una hoja de calculo (A..Z, AA,
 * AB...), asi que la secuencia no se agota nunca. El 0000000 no existe: cada
 * bloque empieza en 1.
 */
export const DIGITOS_DOCUMENTO = 7;
const POR_BLOQUE = 10 ** DIGITOS_DOCUMENTO - 1; // 9.999.999

export function formatDocumentNumber(secuencia: number): string {
  if (!Number.isSafeInteger(secuencia) || secuencia < 1) {
    throw new RangeError(
      `La secuencia de documentos debe ser un entero positivo (recibido: ${secuencia})`,
    );
  }

  const bloque = Math.floor((secuencia - 1) / POR_BLOQUE);
  const numero = ((secuencia - 1) % POR_BLOQUE) + 1;

  return `${prefijo(bloque)}${String(numero).padStart(DIGITOS_DOCUMENTO, '0')}`;
}

/** 0 -> '', 1 -> 'A', 26 -> 'Z', 27 -> 'AA', 28 -> 'AB'... */
function prefijo(bloque: number): string {
  let letras = '';
  let resto = bloque;
  while (resto > 0) {
    resto -= 1;
    letras = String.fromCharCode(65 + (resto % 26)) + letras;
    resto = Math.floor(resto / 26);
  }
  return letras;
}
