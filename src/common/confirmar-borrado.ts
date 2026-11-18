import { ConflictException } from '@nestjs/common';

/**
 * Borrar algo con datos que dependen de el (ventas, facturas) lo oculta en vez
 * de borrarlo. La primera peticion responde 409 con el aviso; el front lo
 * muestra y repite con ?confirmar=true.
 */
export function exigirConfirmacion(confirmar: boolean, aviso: string): void {
  if (!confirmar) {
    throw new ConflictException({ message: aviso, requiereConfirmacion: true });
  }
}
