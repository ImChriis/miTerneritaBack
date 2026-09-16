import { Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { UPLOADS_DIR } from './webp-upload';
import { Food } from '../../food/entities/food.entity';
import { Drink } from '../../drinks/entities/drink.entity';
import { Event } from '../../events/entities/event.entity';

const logger = new Logger('Uploads');

type RequestWithFiles = {
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
};

/** Todos los ficheros que multer dejo en la peticion, sea cual sea su forma. */
export function uploadedFiles(req: RequestWithFiles): Express.Multer.File[] {
  const files: Express.Multer.File[] = [];
  if (req.file) {
    files.push(req.file);
  }
  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files) {
    files.push(...Object.values(req.files).flat());
  }
  return files;
}

/**
 * Borra del disco los ficheros subidos en esta peticion.
 *
 * Multer escribe el fichero antes de que se valide nada, asi que si despues
 * falla la validacion o el servicio, el fichero se quedaba huerfano. Lo llama
 * el filtro global de excepciones.
 */
export async function discardUploadedFiles(
  files: Express.Multer.File[],
): Promise<void> {
  await Promise.all(
    files
      .filter((file) => file?.path)
      .map((file) =>
        fs.unlink(file.path).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') {
            logger.warn(`No se pudo borrar ${file.path}: ${error.message}`);
          }
        }),
      ),
  );
}

/**
 * Borra una imagen de src/assets/img si ya no la usa ningun evento, comida o
 * bebida. Se llama al reemplazar la imagen de un registro o al borrarlo.
 *
 * La comprobacion es necesaria porque una misma imagen se puede reutilizar:
 * los formularios aceptan el nombre de un archivo existente en vez de subirlo.
 */
export async function removeImageIfUnused(
  manager: EntityManager,
  filename?: string | null,
): Promise<void> {
  // Solo nombres simples: nada de rutas, por si en la BD hubiera algo raro.
  if (!filename || basename(filename) !== filename) {
    return;
  }

  const [comidas, bebidas, eventos] = await Promise.all([
    manager.getRepository(Food).count({ where: { image: filename } }),
    manager.getRepository(Drink).count({ where: { image: filename } }),
    manager.getRepository(Event).count({
      where: [
        { flyer: filename },
        { image1: filename },
        { image2: filename },
        { image3: filename },
      ],
    }),
  ]);
  if (comidas + bebidas + eventos > 0) {
    return;
  }

  await fs
    .unlink(join(UPLOADS_DIR, filename))
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        logger.warn(`No se pudo borrar ${filename}: ${error.message}`);
      }
    });
}
