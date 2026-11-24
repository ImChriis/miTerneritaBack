import { BadRequestException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { Readable } from 'stream';

/**
 * Conciliacion bancaria: el admin sube el estado de cuenta del banco (xlsx o
 * csv) y se cruza con los pagos pendientes por referencia y monto.
 *
 * Cada banco exporta con columnas distintas, asi que no se buscan columnas por
 * nombre: de cada fila se sacan los numeros largos (posibles referencias) y los
 * importes, y se comparan con los del pago.
 */

/** Una fila del estado de cuenta: el texto original y lo que se extrae de ella. */
export interface FilaBanco {
  numero: number;
  texto: string;
  referencias: string[];
  montos: number[];
}

export interface PagoPendiente {
  idPayment: number;
  referencia: string | null;
  totalGeneral: number | string | null;
  tasaDolar: number | string | null;
}

export type Resultado = 'coincide' | 'monto_distinto';

export interface Coincidencia {
  idPayment: number;
  resultado: Resultado;
  fila: number;
  texto: string;
}

/** Digitos minimos que deben coincidir: algunos bancos muestran la referencia recortada. */
const MIN_DIGITOS = 6;
/** El cliente puede pagar con la tasa de otro dia: 2 % de margen en Bs. */
const MARGEN = 0.02;

/**
 * "1.234,56" (formato venezolano), "1,234.56", "1234.56" o "1234,56" -> numero.
 * null si el texto no es un importe.
 */
export function aNumero(valor: string): number | null {
  let s = valor.replace(/[^\d.,-]/g, '');
  if (!/\d/.test(s)) return null;
  const coma = s.lastIndexOf(',');
  const punto = s.lastIndexOf('.');
  if (coma > punto) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? Math.abs(n) : null;
}

function celdaATexto(valor: unknown): string {
  if (valor == null) return '';
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === 'object') {
    const v = valor as {
      text?: string;
      result?: unknown;
      richText?: { text: string }[];
    };
    if (v.richText) return v.richText.map((r) => r.text).join('');
    if (v.result != null) return celdaATexto(v.result);
    if (v.text != null) return v.text;
    return '';
  }
  return typeof valor === 'string' ? valor : JSON.stringify(valor);
}

/** Extrae referencias e importes de las celdas de una fila. */
export function analizarFila(
  numero: number,
  celdas: unknown[],
): FilaBanco | null {
  const textos = celdas
    .map(celdaATexto)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!textos.length) return null;
  const referencias = new Set<string>();
  const montos: number[] = [];
  for (const [i, valor] of celdas.entries()) {
    if (typeof valor === 'number') {
      if (Number.isInteger(valor) && String(valor).length >= MIN_DIGITOS + 2) {
        referencias.add(String(valor));
      }
      montos.push(Math.abs(valor));
      continue;
    }
    const texto = celdaATexto(celdas[i]);
    // Referencias: secuencias de digitos sin separadores, dentro de cualquier texto.
    for (const m of texto.match(/\d{6,}/g) ?? []) referencias.add(m);
    // Importes: numeros con decimales ("1.234,56", "150.00").
    for (const m of texto.match(/-?\d[\d.,]*[.,]\d{2}(?!\d)/g) ?? []) {
      const n = aNumero(m);
      if (n !== null) montos.push(n);
    }
  }
  return {
    numero,
    texto: textos.join(' | '),
    referencias: [...referencias],
    montos,
  };
}

/** Lee el estado de cuenta (xlsx o csv) a filas. */
export async function leerEstadoDeCuenta(
  data: Buffer,
  nombre: string,
): Promise<FilaBanco[]> {
  const libro = new Workbook();
  const ext = nombre.toLowerCase().split('.').pop();
  try {
    if (ext === 'csv' || ext === 'txt') {
      // Algunos bancos separan con ";": se detecta por la primera linea.
      const primera = data.toString('utf8').split(/\r?\n/, 1)[0] ?? '';
      const delimiter =
        primera.split(';').length > primera.split(',').length ? ';' : ',';
      await libro.csv.read(Readable.from(data), {
        parserOptions: { delimiter },
        // Sin conversion automatica: "1.234,56" se interpreta aqui, no en el parser.
        map: (v: string) => v,
      });
    } else if (ext === 'xlsx') {
      await libro.xlsx.load(data as unknown as ArrayBuffer);
    } else {
      throw new Error('formato');
    }
  } catch {
    throw new BadRequestException(
      'Sube el estado de cuenta en .xlsx o .csv (si el banco da .xls, ábrelo en Excel y guárdalo como .xlsx)',
    );
  }

  const filas: FilaBanco[] = [];
  libro.eachSheet((hoja) => {
    hoja.eachRow((row, numero) => {
      const valores = (row.values as unknown[]).slice(1);
      const fila = analizarFila(numero, valores);
      if (fila && (fila.referencias.length || fila.montos.length))
        filas.push(fila);
    });
  });
  if (!filas.length) {
    throw new BadRequestException('El archivo no tiene movimientos legibles');
  }
  return filas;
}

const soloDigitos = (s: string | null) => (s ?? '').replace(/\D/g, '');

/** La referencia del pago y la del banco coinciden si una termina en la otra. */
export function mismaReferencia(delPago: string, delBanco: string): boolean {
  const corta = delPago.length <= delBanco.length ? delPago : delBanco;
  const larga = corta === delPago ? delBanco : delPago;
  return corta.length >= MIN_DIGITOS && larga.endsWith(corta);
}

function cuadraMonto(pago: PagoPendiente, montos: number[]): boolean {
  const usd = Number(pago.totalGeneral ?? 0);
  if (!usd) return false;
  const tasa = Number(pago.tasaDolar ?? 0);
  const esperados = [usd, ...(tasa ? [usd * tasa] : [])];
  return montos.some((m) =>
    esperados.some((e) => Math.abs(m - e) <= Math.max(0.01, e * MARGEN)),
  );
}

/**
 * Cruza los pagos pendientes con las filas del banco. Un movimiento solo se
 * asigna a un pago: si dos pagos apuntan a la misma fila, ninguno se da por
 * coincidente (lo revisa el admin a mano).
 */
export function conciliar(
  pagos: PagoPendiente[],
  filas: FilaBanco[],
): Coincidencia[] {
  const resultados: Coincidencia[] = [];
  for (const pago of pagos) {
    const ref = soloDigitos(pago.referencia);
    if (ref.length < MIN_DIGITOS) continue;
    const candidatas = filas.filter((f) =>
      f.referencias.some((r) => mismaReferencia(ref, r)),
    );
    if (!candidatas.length) continue;
    const buena = candidatas.find((f) => cuadraMonto(pago, f.montos));
    const fila = buena ?? candidatas[0];
    resultados.push({
      idPayment: pago.idPayment,
      resultado: buena ? 'coincide' : 'monto_distinto',
      fila: fila.numero,
      texto: fila.texto.slice(0, 300),
    });
  }
  // Una fila del banco no puede pagar dos compras.
  const usos = new Map<number, number>();
  for (const r of resultados) usos.set(r.fila, (usos.get(r.fila) ?? 0) + 1);
  return resultados.map((r) =>
    r.resultado === 'coincide' && (usos.get(r.fila) ?? 0) > 1
      ? { ...r, resultado: 'monto_distinto' as const }
      : r,
  );
}
