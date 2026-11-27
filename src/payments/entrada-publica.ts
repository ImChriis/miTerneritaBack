import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Enlace público a la entrada de un pago: /entrada/<firma>. Lo comparte el personal
 * (WhatsApp, impreso) con clientes que no usan la web ni el correo.
 *
 * La firma es "<idPayment>-<HMAC>": sin el secreto del servidor no se puede fabricar
 * el enlace de otro pago. No caduca: la entrada vale hasta el día del evento.
 */
function secreto(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET no configurado');
  return s;
}

function hmac(idPayment: number): string {
  return createHmac('sha256', secreto())
    .update(`entrada:${idPayment}`)
    .digest('base64url')
    .slice(0, 24);
}

export function firmarEntrada(idPayment: number): string {
  return `${idPayment}-${hmac(idPayment)}`;
}

/** idPayment si la firma es válida; null si no. */
export function verificarEntrada(firma: string): number | null {
  const m = /^(\d{1,10})-([A-Za-z0-9_-]{24})$/.exec(firma ?? '');
  if (!m) return null;
  const id = Number(m[1]);
  const esperada = Buffer.from(hmac(id));
  const recibida = Buffer.from(m[2]);
  return esperada.length === recibida.length &&
    timingSafeEqual(esperada, recibida)
    ? id
    : null;
}
