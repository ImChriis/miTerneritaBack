import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Redirect,
} from '@nestjs/common';
import { R2_ACTIVO, urlR2 } from './r2';

/**
 * Con R2 activo, una imagen que no esta en el disco (las subidas nuevas) se
 * redirige al bucket publico. Las URLs del front no cambian: /assets/img/<archivo>.
 */
@Controller('assets/img')
export class ImagenesController {
  @Get('*ruta')
  @Redirect()
  ver(@Param('ruta') ruta: string | string[]) {
    const clave = Array.isArray(ruta) ? ruta.join('/') : ruta;
    if (!R2_ACTIVO || !clave || clave.split('/').includes('..')) {
      throw new NotFoundException();
    }
    return { url: urlR2(clave), statusCode: 302 };
  }
}
