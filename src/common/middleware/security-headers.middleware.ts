import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Cabeceras de seguridad para una API JSON.
 *
 * Equivale al subconjunto de helmet que aplica aquí, sin añadir dependencia.
 * Si más adelante se instala helmet, este middleware se puede reemplazar.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    // La API no devuelve HTML; las imágenes de /assets/img sí las consume
    // el frontend desde otro origen, de ahí el cross-origin explícito.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");

    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=15552000; includeSubDomains',
      );
    }

    next();
  }
}
