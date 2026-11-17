import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { StorageEngine } from 'multer';
import sharp from 'sharp';
import { existsSync, mkdirSync, promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { basename, extname, join, relative, resolve, sep } from 'path';
import { borrarR2, R2_ACTIVO, subirR2 } from './r2';

/**
 * Configuracion compartida para las subidas de imagenes publicas (eventos,
 * comidas, bebidas y galeria). Se acepta cualquier formato comun y se guarda
 * siempre convertido a .webp.
 */

/** Imagenes versionadas en git. Se siguen sirviendo aunque IMAGES_DIR apunte a otro sitio. */
export const REPO_IMAGES_DIR = join(process.cwd(), 'src', 'assets', 'img');

/**
 * Carpeta donde van las subidas nuevas. En Railway el disco es efimero:
 * IMAGES_DIR apunta al volumen. Se lee de process.env al cargar el modulo,
 * antes que ConfigModule, asi que tiene que ser una variable de entorno real.
 */
export const UPLOADS_DIR = process.env.IMAGES_DIR
  ? resolve(process.env.IMAGES_DIR)
  : REPO_IMAGES_DIR;

/** Galeria de los eventos: pueden ser cientos de fotos, van en su carpeta. */
export const GALERIA_DIR = join(UPLOADS_DIR, 'galeria');

// Crea UPLOADS_DIR y galeria/ al arrancar (un volumen nuevo llega vacio).
mkdirSync(GALERIA_DIR, { recursive: true });

/**
 * Las imagenes que ya hay en src/assets/img llegan a 9,5 MB, asi que el
 * limite tiene que dejar margen por encima de eso. Ajustable con
 * MAX_UPLOAD_SIZE_MB por si hace falta subirlo o bajarlo sin tocar codigo.
 */
const MAX_FILE_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 15);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Formatos que devuelve sharp().metadata(); 'heif' incluye AVIF (HEIC no se decodifica y falla). */
const FORMATOS_ENTRADA = new Set([
  'jpeg',
  'png',
  'webp',
  'gif',
  'tiff',
  'heif',
]);

/**
 * Convierte una imagen a WebP (max. 1920px, orientacion EXIF aplicada). El
 * contenido lo decide sharp, no el MIME ni la extension que manda el cliente.
 */
export async function imagenAWebp(data: Buffer): Promise<Buffer> {
  try {
    const { format } = await sharp(data).metadata();
    if (!format || !FORMATOS_ENTRADA.has(format)) {
      throw new Error(`formato ${format}`);
    }
    return await sharp(data)
      .rotate()
      .resize({
        width: 1920,
        height: 1920,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new BadRequestException(
      'Formato no soportado: sube JPG, PNG, WebP o AVIF',
    );
  }
}

/** Clave en R2 de una ruta dentro de UPLOADS_DIR; null si esta fuera. */
const claveR2 = (path: string) => {
  const rel = relative(UPLOADS_DIR, path);
  return rel && !rel.startsWith('..') ? rel.split(sep).join('/') : null;
};

/**
 * Borra una imagen subida: de R2 si esta activo y la ruta es de UPLOADS_DIR,
 * si no del disco (comprobantes temporales, imagenes locales). Como unlink:
 * rechaza con ENOENT si el archivo local no existe.
 */
export async function borrarImagen(path: string): Promise<void> {
  const clave = R2_ACTIVO ? claveR2(path) : null;
  if (clave) await borrarR2(clave);
  else await fs.unlink(path);
}

/** Convierte un texto libre en un nombre de fichero seguro. */
const getSafeBaseName = (value: string, fallback: string) => {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

/**
 * Anade un sufijo numerico hasta encontrar un nombre libre. Mira tambien la
 * carpeta del repo: un archivo nuevo con el mismo nombre la taparia al servirse.
 */
const getUniqueFilename = (base: string, ext: string) => {
  // En R2 no se puede mirar el disco: un sufijo aleatorio evita pisar otra imagen.
  if (R2_ACTIVO) return `${base}-${randomUUID().slice(0, 8)}${ext}`;
  let candidate = `${base}${ext}`;
  let index = 1;

  while (
    existsSync(join(UPLOADS_DIR, candidate)) ||
    existsSync(join(REPO_IMAGES_DIR, candidate))
  ) {
    candidate = `${base}_${index}${ext}`;
    index += 1;
  }

  return candidate;
};

/**
 * Storage de multer que lee el archivo en memoria, lo convierte a WebP y solo
 * escribe el .webp. `nombre` recibe la peticion y el archivo al empezar (como
 * el filename de diskStorage) y devuelve el nombre sin extension.
 */
function webpStorage(
  dir: string,
  nombre: (req: Express.Request, file: Express.Multer.File) => string,
): StorageEngine {
  return {
    _handleFile(req, file, callback) {
      const base = nombre(req, file);
      const chunks: Buffer[] = [];
      file.stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      file.stream.on('error', callback);
      file.stream.on('end', () => {
        imagenAWebp(Buffer.concat(chunks))
          .then(async (webp) => {
            const filename = getUniqueFilename(base, '.webp');
            const path = join(dir, filename);
            if (R2_ACTIVO) {
              await subirR2(claveR2(path)!, webp);
            } else {
              // 'wx': nunca sobrescribe una imagen existente.
              await fs.writeFile(path, webp, { flag: 'wx' });
            }
            callback(null, {
              destination: dir,
              filename,
              path,
              size: webp.length,
            });
          })
          .catch(callback);
      });
    },
    // Multer lo llama si la peticion falla despues de guardar el archivo.
    _removeFile(_req, file, callback) {
      borrarImagen(file.path).then(() => callback(null), callback);
    },
  };
}

interface WebpUploadConfig {
  /** Numero maximo de ficheros que acepta la peticion. */
  maxFiles: number;
  /**
   * Anade el nombre del campo al fichero (`descripcion-flyer.webp`). Necesario
   * cuando un mismo formulario sube varias imagenes, para que no colisionen.
   */
  suffixWithFieldName?: boolean;
}

/**
 * Subida de fotos de la galeria. Nombre aleatorio: los nombres originales
 * (IMG_0001.jpg) se repiten entre eventos y no aportan nada.
 */
export function galeriaUploadOptions(maxFiles: number): MulterOptions {
  return {
    storage: webpStorage(GALERIA_DIR, () => randomUUID()),
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: maxFiles },
  };
}

export function webpUploadOptions({
  maxFiles,
  suffixWithFieldName = false,
}: WebpUploadConfig): MulterOptions {
  return {
    storage: webpStorage(UPLOADS_DIR, (req, file) => {
      const ext = extname(file.originalname);
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
      return suffixWithFieldName ? `${base}-${file.fieldname}` : base;
    }),
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: maxFiles },
  };
}
