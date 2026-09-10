/**
 * Estado de un pago.
 *
 * Los valores coinciden exactamente con el enum de la columna `payment.status`
 * en MySQL. No los cambies sin migrar la columna.
 */
export enum PaymentStatus {
  Aprobado = 'Aprobado',
  Pendiente = 'Pendiente',
  Rechazado = 'Rechazado',
}
