import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { basename, join } from 'path';

/**
 * Comprobantes de pago: capturas o PDF de transferencias bancarias, con nombre,
 * cuenta, banco e importe del comprador.
 *
 * Por eso NO van en src/assets/img, que se sirve publicamente: se guardan en
 * una carpeta que no expone ServeStaticModule, con un nombre aleatorio, y solo
 * se leen con GET /payment/:id/comprobante (admin o dueno del pago).
 */
export const COMPROBANTES_DIR = join(process.cwd(), 'uploads', 'comprobantes');

const MAX_FILE_SIZE_BYTES =
  Number(process.env.MAX_UPLOAD_SIZE_MB ?? 15) * 1024 * 1024;

/** Formatos admitidos: tipo MIME -> extension con la que se guarda. */
const FORMATOS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export const MIME_POR_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(FORMATOS).map(([mime, ext]) => [ext, mime]),
);

const MENSAJE_FORMATO =
  'El comprobante debe ser una imagen jpg, png o webp, o un pdf';

export function comprobanteUploadOptions(): MulterOptions {
  return {
    storage: diskStorage({
      // Multer crea la carpeta si no existe.
      destination: COMPROBANTES_DIR,
      // Nombre aleatorio: no se puede adivinar ni revela nada del comprador.
      filename: (_req, file, callback) =>
        callback(null, `${randomUUID()}${FORMATOS[file.mimetype]}`),
    }),
    fileFilter: (_req, file, callback) => {
      if (!FORMATOS[file.mimetype]) {
        return callback(new BadRequestException(MENSAJE_FORMATO), false);
      }
      return callback(null, true);
    },
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  };
}

/**
 * Comprueba que el contenido del archivo es realmente del formato que dice.
 *
 * El tipo MIME y la extension los pone el cliente y se pueden falsear; los
 * primeros bytes del archivo no. Si no cuadran, el archivo se rechaza (y el
 * filtro global lo borra del disco).
 */
export async function assertComprobanteReal(
  file: Express.Multer.File,
): Promise<void> {
  const handle = await fs.open(file.path, 'r');
  const cabecera = Buffer.alloc(12);
  try {
    await handle.read(cabecera, 0, 12, 0);
  } finally {
    await handle.close();
  }

  const esperado = FORMATOS[file.mimetype];
  const coincide =
    (esperado === '.jpg' &&
      cabecera.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (esperado === '.png' &&
      cabecera
        .subarray(0, 8)
        .equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        )) ||
    (esperado === '.webp' &&
      cabecera.toString('ascii', 0, 4) === 'RIFF' &&
      cabecera.toString('ascii', 8, 12) === 'WEBP') ||
    (esperado === '.pdf' && cabecera.toString('ascii', 0, 5) === '%PDF-');

  if (!coincide) {
    throw new BadRequestException(
      'El contenido del comprobante no corresponde a su formato',
    );
  }
}

/** Ruta en disco de un comprobante, o null si el valor guardado no es un archivo. */
export function comprobantePath(filename?: string | null): string | null {
  if (!filename || basename(filename) !== filename) {
    return null;
  }
  return join(COMPROBANTES_DIR, filename);
}
