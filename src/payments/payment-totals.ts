import { EntityManager } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import { ConsumeDetails } from '../consumeDetails/entities/consumeDetail.entity';
import { fromCents, toCents } from '../common/money';

/**
 * Recalcula el total del pago a partir de lo que tiene guardado:
 * entradas (paymentdetails) + consumo (consumedetails).
 *
 * Es la unica formula del total. La usan tanto la compra como las
 * correcciones del admin sobre el consumo, para que no se descuadren.
 * Sin impuestos por ahora, asi que subtotal y total coinciden.
 */
export async function recalculatePaymentTotals(
  manager: EntityManager,
  idPayment: number,
): Promise<number> {
  const entradas = await manager
    .getRepository(PaymentDetails)
    .createQueryBuilder('pd')
    .innerJoin('pd.payment', 'p')
    .select('COALESCE(SUM(pd.total), 0)', 'suma')
    .where('p.idPayment = :idPayment', { idPayment })
    .andWhere('pd.isDeleted = 0')
    .getRawOne<{ suma: string }>();

  // En ConsumeDetails la relacion se llama igual que la columna (idPayment).
  // Filtrar con find({ where: { idPayment: { idPayment } } }) confunde a
  // TypeORM y manda el objeto como parametro; con el join no hay ambiguedad.
  const consumo = await manager
    .getRepository(ConsumeDetails)
    .createQueryBuilder('cd')
    .innerJoin('cd.idPayment', 'p')
    .select('COALESCE(SUM(cd.totalConsume), 0)', 'suma')
    .where('p.idPayment = :idPayment', { idPayment })
    .getRawOne<{ suma: string }>();

  const total = fromCents(toCents(entradas?.suma) + toCents(consumo?.suma));

  await manager
    .getRepository(Payment)
    .update(idPayment, { subtotalGeneral: total, totalGeneral: total });

  return total;
}
