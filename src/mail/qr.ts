import * as QRCode from 'qrcode';

/**
 * Genera el PNG del QR en el propio servidor.
 *
 * Antes se construia una URL a api.qrserver.com y se incrustaba como <img>.
 * Eso enviaba los identificadores de pago, usuario y evento a un tercero en
 * la query string, y dejaba el correo dependiendo de que ese servicio siguiera
 * en pie cuando el destinatario lo abriera.
 */
export function generateQrPng(content: string): Promise<Buffer> {
  return QRCode.toBuffer(content, {
    type: 'png',
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}

/** Identificador del adjunto para referenciarlo desde la plantilla. */
export const QR_CONTENT_ID = 'codigo-qr';
