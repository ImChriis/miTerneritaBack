import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global de excepciones.
 *
 * Objetivo: que el cliente reciba siempre la misma forma de error y que
 * nunca se filtren detalles internos (stack traces, errores del driver de
 * MySQL con nombres de tabla o de columna) en las respuestas 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Solo se devuelve el cuerpo de las HttpException (las que lanzamos
    // nosotros a propósito). Cualquier otra cosa es un fallo no controlado.
    const body = isHttpException
      ? exception.getResponse()
      : { statusCode: status, message: 'Error interno del servidor' };

    if (!isHttpException) {
      this.logger.error(
        `${request.method} ${request.url} -> 500`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${status}`);
    }

    response
      .status(status)
      .json(
        typeof body === 'string'
          ? { statusCode: status, message: body, path: request.url }
          : { ...(body as object), path: request.url },
      );
  }
}
