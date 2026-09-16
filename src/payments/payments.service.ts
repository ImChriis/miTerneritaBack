import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus } from './enums/payment-status.enum';
import { CodeService } from '../code/code.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import {
  PaymentDetailsService,
  PaymentLine,
} from '../payment-details/payment-details.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request';
import { ConsumeDetailsService } from '../consumeDetails/consumeDetails.service';
import { recalculatePaymentTotals } from './payment-totals';
import { fromCents, toCents } from '../common/money';
import { sumQuantitiesBy } from '../common/merge-lines';
import {
  comprobantePath,
  MIME_POR_EXTENSION,
} from '../common/uploads/comprobante-upload';
import { existsSync } from 'fs';
import { extname } from 'path';

// Lo que devuelve GET /payment/:id: es la factura que ve el cliente, con el
// nombre de cada entrada y de cada producto consumido.
const PAYMENT_RELATIONS = [
  'idUser',
  'idEvents',
  'consumeDetails',
  'consumeDetails.idFood',
  'consumeDetails.idDrinks',
  'paymentDetails',
  'paymentDetails.ticket',
];

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,

    private readonly codeService: CodeService,

    private readonly paymentDetailsService: PaymentDetailsService,

    private readonly consumeDetailsService: ConsumeDetailsService,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Crea el pago con sus entradas (paymentdetails) y su consumo
   * (consumedetails) en una sola transaccion: si una linea falla (ticket de
   * otro evento, aforo agotado, evento sin consumo...) no se crea nada. El
   * pago nace Pendiente y queda a la espera de aprobacion.
   */
  async create(
    createPaymentDto: CreatePaymentDto,
    requester: AuthenticatedUser,
    comprobante: string,
  ): Promise<Payment> {
    const {
      idUser: requestedUserId,
      idEvents,
      items: itemsRecibidos,
      consumos,
      ...paymentData
    } = createPaymentDto;

    // Un usuario solo puede comprar para si mismo. Antes idUser venia en el
    // body y cualquiera podia crear pagos a nombre de otro.
    const idUser =
      requester.role === 'admin'
        ? (requestedUserId ?? requester.userId)
        : requester.userId;

    // El carrito del front permite anadir la misma zona dos veces (General x1
    // y luego General x2). Antes eso daba 400; se juntan sumando cantidades,
    // porque precio y aforo se calculan igual sobre el total.
    const items = sumQuantitiesBy(itemsRecibidos, (item) => item.idTicket);
    const ticketIds = items.map((item) => item.idTicket);

    // READ COMMITTED es imprescindible para el control de aforo. Con el nivel
    // por defecto de MariaDB (REPEATABLE READ) la transaccion lee de una foto
    // tomada en su primera lectura, anterior al bloqueo del evento: una compra
    // que esperaba el bloqueo contaba las vendidas sin ver las que se habian
    // confirmado mientras tanto. Probado: 12 compras simultaneas con 5 plazas
    // libres pasaban todas.
    const idPayment = await this.dataSource.transaction(
      'READ COMMITTED',
      async (manager) => {
        const user = await manager
          .getRepository(User)
          .findOne({ where: { id: idUser } });
        if (!user) {
          throw new NotFoundException('Usuario no encontrado');
        }

        // Bloqueo de la fila del evento hasta el final de la transaccion: dos
        // compras simultaneas para el mismo evento se atienden de una en una,
        // asi ninguna puede colarse por encima del aforo.
        const event = await manager.getRepository(Event).findOne({
          where: { idEvents },
          lock: { mode: 'pessimistic_write' },
        });
        if (!event) {
          throw new NotFoundException('Evento no encontrado');
        }
        if (event.status !== 1) {
          throw new BadRequestException(
            'El evento no esta disponible para la venta',
          );
        }

        const tickets = await manager
          .getRepository(Ticket)
          .findBy({ idTicket: In(ticketIds) });
        const ticketsById = new Map(tickets.map((t) => [t.idTicket, t]));

        const lines: PaymentLine[] = items.map((item) => {
          const ticket = ticketsById.get(item.idTicket);
          if (!ticket) {
            throw new NotFoundException(
              `La entrada ${item.idTicket} no existe`,
            );
          }
          if (ticket.idEvents !== event.idEvents) {
            throw new BadRequestException(
              `La entrada "${ticket.name}" no pertenece a este evento`,
            );
          }
          if (ticket.status !== 1) {
            throw new BadRequestException(
              `La entrada "${ticket.name}" no esta a la venta`,
            );
          }

          const precioCents = toCents(ticket.price);
          return {
            ticket,
            cantidad: item.cantidad,
            precio: fromCents(precioCents),
            total: fromCents(precioCents * item.cantidad),
          };
        });

        await this.assertCapacity(manager, event, lines);

        // Comida y bebida: mismas reglas que el endpoint de admin (evento con
        // consumo, productos activos, precio desde la BD).
        const consumoLines = await this.consumeDetailsService.resolveLines(
          manager,
          event,
          consumos ?? [],
        );

        const payment = await manager.getRepository(Payment).save(
          manager.getRepository(Payment).create({
            ...paymentData,
            // Nombre del archivo en la carpeta privada de comprobantes.
            comprobante,
            idUser: user,
            idEvents: event,
            // `date` la rellena MySQL con su DEFAULT current_timestamp().
            status: PaymentStatus.Pendiente,
            isDeleted: false,
          }),
        );

        await this.paymentDetailsService.createForPayment(
          manager,
          payment,
          lines,
        );
        await this.consumeDetailsService.createForPayment(
          manager,
          payment,
          consumoLines,
        );

        // total = entradas + consumo, con la misma formula que usa el admin
        // al corregir el consumo.
        await recalculatePaymentTotals(manager, payment.idPayment);

        return payment.idPayment;
      },
    );

    return this.findOne(idPayment);
  }

  /**
   * Cuenta las entradas ya vendidas del evento (pagos Pendiente y Aprobado;
   * los Rechazado y los borrados liberan cupo) y rechaza la compra si con
   * ella se supera el aforo.
   */
  private async assertCapacity(
    manager: EntityManager,
    event: Event,
    lines: PaymentLine[],
  ): Promise<void> {
    const row = await manager
      .getRepository(PaymentDetails)
      .createQueryBuilder('pd')
      .innerJoin('pd.payment', 'p')
      .select('COALESCE(SUM(COALESCE(pd.ticketNum, 1)), 0)', 'vendidas')
      .where('p.idEvents = :idEvents', { idEvents: event.idEvents })
      .andWhere('p.status IN (:...estados)', {
        estados: [PaymentStatus.Pendiente, PaymentStatus.Aprobado],
      })
      .andWhere('p.isDeleted = 0')
      .andWhere('pd.isDeleted = 0')
      .getRawOne<{ vendidas: string | number }>();

    const vendidas = Number(row?.vendidas ?? 0);
    const solicitadas = lines.reduce((sum, line) => sum + line.cantidad, 0);
    const disponibles = Math.max(event.capacity - vendidas, 0);

    if (solicitadas > disponibles) {
      throw new ConflictException(
        disponibles === 0
          ? 'No quedan entradas para este evento'
          : `Solo quedan ${disponibles} entradas para este evento`,
      );
    }
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment: id, isDeleted: false },
      relations: PAYMENT_RELATIONS,
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { isDeleted: false },
      relations: PAYMENT_RELATIONS,
      order: { idPayment: 'DESC' },
    });
  }

  /**
   * Un usuario con rol 'user' solo puede ver sus propios pagos. Antes
   * GET /payment/:id devolvia cualquier pago a cualquier usuario autenticado,
   * incluidos los datos personales del comprador.
   */
  async findOneForRequester(
    id: number,
    requesterId: number,
    requesterRole: string | null,
  ): Promise<Payment> {
    const payment = await this.findOne(id);

    if (requesterRole !== 'admin' && payment.idUser?.id !== requesterId) {
      // Se responde 404 y no 403 para no confirmar que el pago existe.
      throw new NotFoundException('Pago no encontrado');
    }

    return payment;
  }

  /**
   * Ubicacion del archivo del comprobante, comprobando antes que quien lo pide
   * es admin o el dueno del pago. Los pagos anteriores a la subida de archivos
   * guardan en `comprobante` un texto (una referencia), no un archivo: para
   * esos se responde 404.
   */
  async getComprobante(
    id: number,
    requester: AuthenticatedUser,
  ): Promise<{ path: string; mimeType: string; extension: string }> {
    const payment = await this.findOneForRequester(
      id,
      requester.userId,
      requester.role,
    );

    const path = comprobantePath(payment.comprobante);
    const extension = path ? extname(path).toLowerCase() : '';
    if (!path || !MIME_POR_EXTENSION[extension] || !existsSync(path)) {
      throw new NotFoundException('Este pago no tiene comprobante adjunto');
    }

    return { path, mimeType: MIME_POR_EXTENSION[extension], extension };
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    const payment = await this.findOne(id);
    const wasApproved = payment.status === PaymentStatus.Aprobado;

    payment.status = updateStatusDto.status;
    const updated = await this.paymentsRepository.save(payment);

    // Al aprobar se emite la entrada y se envia por correo. issueForPayment es
    // idempotente, asi que reaprobar no invalida el QR ya enviado.
    if (!wasApproved && updated.status === PaymentStatus.Aprobado) {
      await this.codeService.issueForPayment(updated.idPayment);
    }

    return updated;
  }

  /**
   * Borrado logico. Antes se llamaba a softDelete(), que necesita una columna
   * @DeleteDateColumn que esta entidad no tiene; la tabla marca el borrado con
   * la columna `isDeleted`.
   */
  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id);
    payment.isDeleted = true;
    await this.paymentsRepository.save(payment);
  }
}
