import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Reserva } from './entities/reserva.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus } from './enums/payment-status.enum';
import { CodeService } from '../code/code.service';
import { MailService } from '../mail/mail.service';
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
import { DocumentSequence } from './entities/document-sequence.entity';
import { Configuration } from '../configuration/entities/configuration.entity';
import { formatDocumentNumber } from './document-number';
import { ACCESO_POR_BOTELLA, personasConAcceso } from '../consumeDetails/menu';
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
    private readonly mailService: MailService,

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
    comprobante?: string,
    comprobanteData?: Buffer,
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
    const items = sumQuantitiesBy(
      itemsRecibidos ?? [],
      (item) => item.idTicket,
    );
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
        assertVentaAbierta(event, requester.role === 'admin');

        // Una referencia no se repite en el mismo banco (si en bancos distintos).
        // Los pagos rechazados o borrados no cuentan: el cliente puede reenviarla.
        // shortcut: sin indice unico (MySQL no filtra por estado); dos compras
        // simultaneas con la misma referencia podrian colarse.
        const referencia = paymentData.referencia?.trim();
        if (
          paymentData.banco &&
          referencia &&
          paymentData.banco !== 'Efectivo'
        ) {
          const repetida = await manager.getRepository(Payment).exists({
            where: {
              banco: paymentData.banco,
              referencia,
              isDeleted: false,
              status: Not(PaymentStatus.Rechazado),
            },
          });
          if (repetida) {
            throw new ConflictException(
              `La referencia ${referencia} de ${paymentData.banco} ya fue registrada en otro pago`,
            );
          }
        }

        const tickets = ticketIds.length
          ? await manager
              .getRepository(Ticket)
              .findBy({ idTicket: In(ticketIds) })
          : [];
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

        // Comida y bebida: mismas reglas que el endpoint de admin (evento con
        // consumo, productos activos, precio desde la BD).
        const consumoLines = await this.consumeDetailsService.resolveLines(
          manager,
          event,
          consumos ?? [],
        );

        // Las botellas con acceso (Old Parr Silver = 6 personas) traen esas
        // entradas General sin costo: cuentan para el aforo y entran con el QR.
        // Si van mas personas, el resto compra entrada.
        const accesos = consumoLines.reduce(
          (suma, line) => suma + personasConAcceso(line.drink) * line.cantidad,
          0,
        );
        if (accesos > 0) {
          lines.push({
            ticket: await this.entradaGeneral(manager, event),
            cantidad: accesos,
            precio: 0,
            total: 0,
          });
        }
        if (lines.length === 0) {
          throw new BadRequestException(
            ACCESO_POR_BOTELLA
              ? 'Debes comprar al menos una entrada o una botella que incluya acceso'
              : 'Debes comprar al menos una entrada',
          );
        }

        await this.assertCapacity(manager, event, lines, idUser);
        await manager.getRepository(Reserva).delete({
          idEvents: event.idEvents,
          idUser,
        });

        // Se reserva al final, con todo ya validado: el contador queda
        // bloqueado hasta el fin de la transaccion, asi que conviene tenerlo
        // el menor tiempo posible. Orden de bloqueo fijo (evento -> contador)
        // en todas las compras: no hay interbloqueos.
        const noDocumento = await this.nextDocumentNumber(manager);
        // Tasa BCV del dia: con ella se valida el monto pagado en Bs.
        const [config] = await manager
          .getRepository(Configuration)
          .find({ order: { idConfiguration: 'ASC' }, take: 1 });

        const payment = await manager.getRepository(Payment).save(
          manager.getRepository(Payment).create({
            ...paymentData,
            noDocumento,
            tasaDolar: config?.BCV ?? undefined,
            // Nombre del archivo en la carpeta privada de comprobantes, o
            // vacio en los pagos en efectivo.
            comprobante,
            comprobanteData: comprobanteData ?? null,
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
   * La entrada que dan las botellas con acceso: la General del evento.
   * shortcut: se reconoce por el nombre ("General", o la primera que empiece por
   * "General"); si un evento necesita otra, marcar el ticket en la BD.
   */
  private async entradaGeneral(
    manager: EntityManager,
    event: Event,
  ): Promise<Ticket> {
    const tickets = await manager.getRepository(Ticket).find({
      where: { idEvents: event.idEvents },
      order: { idTicket: 'ASC' },
    });
    const nombre = (t: Ticket) =>
      (t.name ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
    const general =
      tickets.find((t) => nombre(t) === 'general') ??
      tickets.find((t) => nombre(t).startsWith('general'));
    if (!general) {
      throw new ConflictException(
        'Este evento no tiene entrada General: las botellas con acceso no estan disponibles',
      );
    }
    return general;
  }

  /**
   * Reserva el siguiente numero de documento de pago.
   *
   * El UPDATE incrementa y bloquea la fila del contador en un solo paso (no hay
   * lectura previa que otra compra pueda adelantar). Con READ COMMITTED, la
   * lectura siguiente ve el valor que acaba de escribir esta transaccion.
   */
  private async nextDocumentNumber(manager: EntityManager): Promise<string> {
    const contador = manager.getRepository(DocumentSequence);
    const { affected } = await contador.increment(
      { name: 'payment' },
      'lastValue',
      1,
    );
    if (!affected) {
      throw new InternalServerErrorException(
        'No existe el contador de documentos: falta ejecutar la migracion 2026-09-17-payment-numero-documento.sql',
      );
    }
    const { lastValue } = await contador.findOneByOrFail({ name: 'payment' });
    return formatDocumentNumber(Number(lastValue));
  }

  /**
   * Cuenta las entradas ya vendidas del evento (pagos Pendiente y Aprobado;
   * los Rechazado y los borrados liberan cupo) y rechaza la compra si con
   * ella se supera el aforo.
   */
  private async assertCapacity(
    manager: EntityManager,
    event: Event,
    lines: Pick<PaymentLine, 'cantidad'>[],
    /** Su propio apartado no le quita cupo a quien compra o reaparta. */
    idUserPropio?: number,
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

    const apartadas = await manager.getRepository(Reserva).sum('cantidad', {
      idEvents: event.idEvents,
      vence: MoreThan(new Date()),
      ...(idUserPropio ? { idUser: Not(idUserPropio) } : {}),
    });

    const vendidas = Number(row?.vendidas ?? 0) + Number(apartadas ?? 0);
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

  /**
   * Aparta `cantidad` entradas del evento durante RESERVA_MINUTOS, como en el
   * cine: mientras el cliente paga nadie mas puede quedarse con ese cupo. Con
   * el evento bloqueado, igual que la compra, dos apartados no se pisan.
   */
  async reservar(
    idEvents: number,
    idUser: number,
    cantidad: number,
  ): Promise<{ vence: Date }> {
    return this.dataSource.transaction('READ COMMITTED', async (manager) => {
      const event = await manager.getRepository(Event).findOne({
        where: { idEvents },
        lock: { mode: 'pessimistic_write' },
      });
      if (!event) throw new NotFoundException('Evento no encontrado');
      assertVentaAbierta(event, false);
      await this.assertCapacity(manager, event, [{ cantidad }], idUser);

      const repo = manager.getRepository(Reserva);
      await repo.delete({ idEvents, idUser });
      const vence = new Date(Date.now() + RESERVA_MINUTOS * 60_000);
      await repo.save(repo.create({ idEvents, idUser, cantidad, vence }));
      return { vence };
    });
  }

  /** Personas con un apartado vigente, por evento: { [idEvents]: n }. */
  async comprando(): Promise<Record<number, number>> {
    const filas = await this.dataSource
      .getRepository(Reserva)
      .createQueryBuilder('r')
      .select('r.idEvents', 'idEvents')
      .addSelect('COUNT(*)', 'personas')
      .where('r.vence > :ahora', { ahora: new Date() })
      .groupBy('r.idEvents')
      .getRawMany<{ idEvents: number; personas: string }>();
    return Object.fromEntries(
      filas.map((f) => [f.idEvents, Number(f.personas)]),
    );
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
  ): Promise<{
    data?: Buffer;
    path?: string;
    mimeType: string;
    extension: string;
  }> {
    const payment = await this.findOneForRequester(
      id,
      requester.userId,
      requester.role,
    );

    const extension = payment.comprobante
      ? extname(payment.comprobante).toLowerCase()
      : '';
    const mimeType = MIME_POR_EXTENSION[extension];
    // Nuevo: el contenido esta en la BD. Antiguo: el archivo en disco (local).
    const { comprobanteData } =
      (await this.paymentsRepository.findOne({
        where: { idPayment: id },
        select: { idPayment: true, comprobanteData: true },
      })) ?? {};
    if (mimeType && comprobanteData?.length) {
      return { data: comprobanteData, mimeType, extension };
    }
    const path = comprobantePath(payment.comprobante);
    if (!mimeType || !path || !existsSync(path)) {
      throw new NotFoundException('Este pago no tiene comprobante adjunto');
    }
    return { path, mimeType, extension };
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    const payment = await this.findOne(id);
    const wasApproved = payment.status === PaymentStatus.Aprobado;
    const wasRejected = payment.status === PaymentStatus.Rechazado;

    const updated = await this.dataSource.transaction(
      'READ COMMITTED',
      async (manager) => {
        // Un pago Rechazado libero su cupo. Si se reactiva (Pendiente o
        // Aprobado) vuelve a ocupar aforo: antes no se revisaba y se podia
        // vender por encima de la capacidad del evento.
        if (
          payment.status === PaymentStatus.Rechazado &&
          updateStatusDto.status !== PaymentStatus.Rechazado
        ) {
          const event = await manager.getRepository(Event).findOneOrFail({
            where: { idEvents: payment.idEvents.idEvents },
            lock: { mode: 'pessimistic_write' },
          });
          await this.assertCapacity(
            manager,
            event,
            (payment.paymentDetails ?? [])
              .filter((d) => !d.isDeleted)
              .map((d) => ({ cantidad: d.ticketNum ?? 1 })),
          );
        }
        payment.status = updateStatusDto.status;
        return manager.getRepository(Payment).save(payment);
      },
    );

    // Al aprobar se emite la entrada y se envia por correo. issueForPayment es
    // idempotente, asi que reaprobar no invalida el QR ya enviado.
    if (!wasApproved && updated.status === PaymentStatus.Aprobado) {
      await this.codeService.issueForPayment(updated.idPayment);
    }

    // Al rechazar se avisa al comprador (una vez: solo si antes no lo estaba).
    const email = updated.idUser?.email;
    if (!wasRejected && updated.status === PaymentStatus.Rechazado && email) {
      const [config] = await this.dataSource
        .getRepository(Configuration)
        .find({ order: { idConfiguration: 'ASC' }, take: 1 });
      await this.mailService.sendPaymentRejected({
        soporteEmail: config?.email || null,
        soporteTelefono: config?.phone || null,
        userEmail: email,
        userName: updated.idUser?.name,
        eventName: updated.idEvents?.name,
        noDocumento: updated.noDocumento,
        total: updated.totalGeneral,
        referencia: updated.banco === 'Efectivo' ? null : updated.referencia,
        teniaEntrada: wasApproved,
      });
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

/** Lo que dura un apartado; igual que el temporizador del front (20 min). */
export const RESERVA_MINUTOS = 20;

/** Evento activo y, salvo para el admin, antes de su cierre de venta. */
function assertVentaAbierta(event: Event, esAdmin: boolean): void {
  if (event.status !== 1) {
    throw new BadRequestException('El evento no esta disponible para la venta');
  }
  if (!esAdmin && event.cierreVenta && new Date() >= event.cierreVenta) {
    throw new BadRequestException('La venta de este evento ya cerro');
  }
}
