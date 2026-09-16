import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { existsSync } from 'fs';
import { basename, extname, join } from 'path';

/**
 * Configuracion compartida para las subidas de imagenes .webp.
 *
 * Este bloque estaba copiado literalmente en events, food y drinks: los mismos
 * helpers, el mismo filtro y la misma carpeta destino, tres veces.
 */

export const UPLOADS_DIR = join(process.cwd(), 'src', 'assets', 'img');

/**
 * Las imagenes que ya hay en src/assets/img llegan a 9,5 MB, asi que el
 * limite tiene que dejar margen por encima de eso. Ajustable con
 * MAX_UPLOAD_SIZE_MB por si hace falta subirlo o bajarlo sin tocar codigo.
 */
const MAX_FILE_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 15);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Convierte un texto libre en un nombre de fichero seguro. */
const getSafeBaseName = (value: string, fallback: string) => {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  return normalized || fallback;
};

/**
 * Multer lee el nombre del archivo como latin1, pero los navegadores lo envian
 * en UTF-8: "Móvil.webp" llegaba como "MÃ³vil.webp". Se recodifica, salvo que
 * el resultado no sea UTF-8 valido (entonces el nombre ya venia bien).
 */
const decodeFilename = (name: string) => {
  const utf8 = Buffer.from(name, 'latin1').toString('utf8');
  // U+FFFD es el caracter que sustituye a los bytes que no son UTF-8.
  return utf8.includes(String.fromCharCode(0xfffd)) ? name : utf8;
};

/** Anade un sufijo numerico hasta encontrar un nombre libre. */
const getUniqueFilename = (base: string, ext: string) => {
  let candidate = `${base}${ext}`;
  let index = 1;

  while (existsSync(join(UPLOADS_DIR, candidate))) {
    candidate = `${base}_${index}${ext}`;
    index += 1;
  }

  return candidate;
};

const webpFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const isWebp =
    file.mimetype === 'image/webp' &&
    file.originalname.toLowerCase().endsWith('.webp');

  if (!isWebp) {
    return callback(
      new BadRequestException('El archivo debe ser formato .webp'),
      false,
    );
  }

  return callback(null, true);
};

interface WebpUploadConfig {
  /** Numero maximo de ficheros que acepta la peticion. */
  maxFiles: number;
  /**
   * Anade el nombre del campo al fichero (`descripcion-flyer.webp`). Necesario
   * cuando un mismo formulario sube varias imagenes, para que no colisionen.
   */
  suffixWithFieldName?: boolean;
}

export function webpUploadOptions({
  maxFiles,
  suffixWithFieldName = false,
}: WebpUploadConfig): MulterOptions {
  return {
    storage: diskStorage({
      destination: UPLOADS_DIR,
      filename: (req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        // Si no hay description (o llega despues del archivo en el form-data)
        // se usa el nombre original, pero saneado igual: sin espacios,
        // tildes ni simbolos.
        const fallbackBase = getSafeBaseName(
          basename(decodeFilename(file.originalname), ext),
          'imagen',
        );
        const description = (req as { body?: { description?: unknown } }).body
          ?.description;
        const base = getSafeBaseName(
          typeof description === 'string' ? description : '',
          fallbackBase,
        );
        const finalBase = suffixWithFieldName
          ? `${base}-${file.fieldname}`
          : base;

        callback(null, getUniqueFilename(finalBase, ext));
      },
    }),
    fileFilter: webpFileFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: maxFiles },
  };
}
