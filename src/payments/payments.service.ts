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
import { SalonService } from '../salon/salon.service';
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
import { createHash } from 'crypto';
import { Workbook } from 'exceljs';
import { conciliar, leerEstadoDeCuenta } from './conciliacion';
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

    private readonly salonService: SalonService,
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
      asientos,
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

        // La misma captura no sirve para dos compras (salvo si la otra fue rechazada).
        const comprobanteHash = comprobanteData
          ? createHash('sha256').update(comprobanteData).digest('hex')
          : null;
        if (comprobanteHash) {
          const usado = await manager.getRepository(Payment).findOne({
            where: {
              comprobanteHash,
              isDeleted: false,
              status: Not(PaymentStatus.Rechazado),
            },
            select: { idPayment: true, noDocumento: true },
          });
          if (usado) {
            throw new ConflictException(
              `Este comprobante ya se usó en el pago N° ${usado.noDocumento ?? usado.idPayment}`,
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

        if (requester.role !== 'admin') {
          await this.assertTopeCliente(manager, event, idUser, lines);
        }
        await this.assertCapacity(manager, event, lines, idUser);
        // El admin vende en taquilla sin mapa: se le asignan puestos libres.
        const puestos =
          requester.role === 'admin' && !asientos?.length
            ? await this.salonService.asignarLibres(
                manager,
                event.idEvents,
                idUser,
                lines,
              )
            : (asientos ?? []);
        await this.salonService.validarCompra(
          manager,
          event.idEvents,
          idUser,
          puestos,
          lines,
        );
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
            comprobanteHash,
            idUser: user,
            idEvents: event,
            // `date` la rellena MySQL con su DEFAULT current_timestamp().
            status: PaymentStatus.Pendiente,
            isDeleted: false,
          }),
        );

        await this.salonService.marcarVendidos(
          manager,
          event.idEvents,
          idUser,
          puestos,
          payment.idPayment,
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
   * Un cliente no puede tener mas de MAX_ENTRADAS_CLIENTE entradas en un
   * evento sumando sus pagos Pendiente y Aprobado. Sin esto, un pago Pendiente
   * de 300 entradas con un comprobante cualquiera dejaba el evento en SOLD OUT
   * hasta que un admin lo rechazara. El admin (ventas en efectivo) no tiene tope.
   */
  private async assertTopeCliente(
    manager: EntityManager,
    event: Event,
    idUser: number,
    lines: Pick<PaymentLine, 'cantidad'>[],
  ): Promise<void> {
    const row = await manager
      .getRepository(PaymentDetails)
      .createQueryBuilder('pd')
      .innerJoin('pd.payment', 'p')
      .select('COALESCE(SUM(COALESCE(pd.ticketNum, 1)), 0)', 'suyas')
      .where('p.idEvents = :idEvents', { idEvents: event.idEvents })
      .andWhere('p.idUser = :idUser', { idUser })
      .andWhere('p.status IN (:...estados)', {
        estados: [PaymentStatus.Pendiente, PaymentStatus.Aprobado],
      })
      .andWhere('p.isDeleted = 0')
      .andWhere('pd.isDeleted = 0')
      .getRawOne<{ suyas: string | number }>();
    const suyas = Number(row?.suyas ?? 0);
    const solicitadas = lines.reduce((s, l) => s + l.cantidad, 0);
    if (suyas + solicitadas > MAX_ENTRADAS_CLIENTE) {
      throw new ConflictException(
        suyas > 0
          ? `Maximo ${MAX_ENTRADAS_CLIENTE} entradas por persona en este evento (ya tienes ${suyas})`
          : `Maximo ${MAX_ENTRADAS_CLIENTE} entradas por compra`,
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
    asientos: string[] = [],
  ): Promise<{ vence: Date }> {
    if (asientos.length > cantidad) {
      throw new BadRequestException('Hay mas puestos elegidos que entradas');
    }
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
      // Los puestos del mapa quedan apartados lo mismo que el cupo.
      await this.salonService.apartar(
        manager,
        idEvents,
        idUser,
        asientos,
        vence,
      );
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

  /**
   * Cupo de cada evento: { [idEvents]: { capacidad, vendidas, apartadas } }.
   * vendidas = pagos Pendiente y Aprobado (mismo criterio que assertCapacity);
   * apartadas = apartados vigentes de quien esta pagando.
   */
  async disponibilidad(): Promise<
    Record<number, { capacidad: number; vendidas: number; apartadas: number }>
  > {
    const filas = await this.dataSource.query<
      {
        idEvents: number;
        capacity: number;
        vendidas: string;
        apartadas: string;
      }[]
    >(
      `SELECT e.idEvents, e.capacity,
        COALESCE((SELECT SUM(COALESCE(pd.ticketNum, 1)) FROM paymentdetails pd
          INNER JOIN payment p ON p.idPayment = pd.idPayment
          WHERE p.idEvents = e.idEvents AND p.status IN (?, ?)
            AND p.isDeleted = 0 AND pd.isDeleted = 0), 0) AS vendidas,
        COALESCE((SELECT SUM(r.cantidad) FROM reserva r
          WHERE r.idEvents = e.idEvents AND r.vence > ?), 0) AS apartadas
      FROM events e`,
      [PaymentStatus.Pendiente, PaymentStatus.Aprobado, new Date()],
    );
    return Object.fromEntries(
      filas.map((f) => [
        f.idEvents,
        {
          capacidad: Number(f.capacity ?? 0),
          vendidas: Number(f.vendidas),
          apartadas: Number(f.apartadas),
        },
      ]),
    );
  }

  /** Eventos sin cupo (lo vendido ya llena el aforo): para mostrar SOLD OUT. */
  async agotados(): Promise<number[]> {
    const cupos = await this.disponibilidad();
    return Object.entries(cupos)
      .filter(([, c]) => c.capacidad > 0 && c.vendidas >= c.capacidad)
      .map(([id]) => Number(id));
  }

  /**
   * Reporte de ventas de un evento: lo cobrado (pagos Aprobados) en entradas
   * por tipo y en consumo por producto, mas el conteo de pagos por estado.
   */
  async reporte(idEvents: number) {
    const evento = await this.dataSource
      .getRepository(Event)
      .findOne({ where: { idEvents } });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    const aprobado = PaymentStatus.Aprobado;
    // Las entradas que regala una botella con acceso van en su propia linea.
    const entradas = await this.dataSource.query<
      { nombre: string; cantidad: string; total: string }[]
    >(
      `SELECT IF(pd.precio = 0, CONCAT(t.name, ' (incluida con botella)'), t.name) AS nombre,
        SUM(COALESCE(pd.ticketNum, 1)) AS cantidad, SUM(pd.total) AS total
      FROM paymentdetails pd
      INNER JOIN payment p ON p.idPayment = pd.idPayment
      INNER JOIN ticket t ON t.idTicket = pd.idTicket
      WHERE p.idEvents = ? AND p.status = ? AND p.isDeleted = 0 AND pd.isDeleted = 0
      GROUP BY nombre
      ORDER BY total DESC`,
      [idEvents, aprobado],
    );
    const consumo = await this.dataSource.query<
      {
        nombre: string;
        tipo: string;
        botella: number;
        cantidad: string;
        total: string;
      }[]
    >(
      `SELECT f.description AS nombre, 'Comida' AS tipo, 0 AS botella, SUM(cd.foodAmount) AS cantidad, SUM(cd.totalConsume) AS total
      FROM consumedetails cd
      INNER JOIN payment p ON p.idPayment = cd.idPayment
      INNER JOIN food f ON f.idFood = cd.idFood
      WHERE p.idEvents = ? AND p.status = ? AND p.isDeleted = 0
      GROUP BY f.idFood, f.description
      UNION ALL
      SELECT d.description, 'Bebida', MAX(d.detalle LIKE '%0,75%'), SUM(cd.drinksAmount), SUM(cd.totalConsume)
      FROM consumedetails cd
      INNER JOIN payment p ON p.idPayment = cd.idPayment
      INNER JOIN drinks d ON d.idDrinks = cd.idDrinks
      WHERE p.idEvents = ? AND p.status = ? AND p.isDeleted = 0
      GROUP BY d.idDrinks, d.description
      ORDER BY total DESC`,
      [idEvents, aprobado, idEvents, aprobado],
    );
    const pagos = await this.dataSource.query<
      { status: string; cantidad: string; total: string }[]
    >(
      `SELECT status, COUNT(*) AS cantidad, COALESCE(SUM(totalGeneral), 0) AS total
      FROM payment WHERE idEvents = ? AND isDeleted = 0 GROUP BY status`,
      [idEvents],
    );

    const num = (v: unknown) => Number(v ?? 0);
    const lineasEntradas = entradas.map((e) => ({
      nombre: e.nombre,
      cantidad: num(e.cantidad),
      total: num(e.total),
    }));
    const lineasConsumo = consumo.map((c) => ({
      nombre: c.nombre,
      tipo: c.tipo,
      // Bebidas de 0,75 L: el reporte las cuenta en botellas.
      botella: Number(c.botella) === 1,
      cantidad: num(c.cantidad),
      total: num(c.total),
    }));
    const suma = (l: { total: number }[]) =>
      fromCents(l.reduce((s, x) => s + toCents(x.total), 0));
    const cupo = (await this.disponibilidad())[idEvents];

    return {
      evento: {
        idEvents: evento.idEvents,
        nombre: evento.name,
        fecha: evento.date,
        hora: evento.time,
        salon: evento.room,
        categoria: evento.category,
        capacidad: evento.capacity,
        vendidas: cupo?.vendidas ?? 0,
      },
      entradas: lineasEntradas,
      consumo: lineasConsumo,
      pagos: pagos.map((p) => ({
        estado: p.status,
        cantidad: num(p.cantidad),
        total: num(p.total),
      })),
      totales: {
        entradas: suma(lineasEntradas),
        consumo: suma(lineasConsumo),
        general: suma([...lineasEntradas, ...lineasConsumo]),
      },
    };
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

    // El estado anterior se lee con la fila del pago bloqueada: si dos admins
    // aprueban a la vez, el segundo ve "Aprobado" y no emite otro QR ni otro
    // correo. Se actualiza solo `status` (no save del pago entero) para no
    // pisar el total que recalcula una correccion de consumo concurrente.
    const antes = await this.dataSource.transaction(
      'READ COMMITTED',
      async (manager) => {
        const actual = await manager.getRepository(Payment).findOne({
          where: { idPayment: id, isDeleted: false },
          select: { idPayment: true, status: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!actual) throw new NotFoundException('Pago no encontrado');

        // Un pago Rechazado libero su cupo. Si se reactiva (Pendiente o
        // Aprobado) vuelve a ocupar aforo: antes no se revisaba y se podia
        // vender por encima de la capacidad del evento.
        if (
          actual.status === PaymentStatus.Rechazado &&
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
        // La primera revision (sale de Pendiente) cierra la espera del cliente.
        const revisa =
          actual.status === PaymentStatus.Pendiente &&
          updateStatusDto.status !== PaymentStatus.Pendiente;
        await manager.getRepository(Payment).update(id, {
          status: updateStatusDto.status,
          ...(revisa ? { revisado: new Date() } : {}),
        });
        if (updateStatusDto.status === PaymentStatus.Rechazado) {
          await this.salonService.liberar(manager, id);
        }
        return actual.status;
      },
    );
    const wasApproved = antes === PaymentStatus.Aprobado;
    const wasRejected = antes === PaymentStatus.Rechazado;
    payment.status = updateStatusDto.status;
    const updated = payment;

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
   * Conciliacion bancaria: cruza el estado de cuenta con los pagos pendientes
   * (no efectivo). No cambia nada: devuelve la propuesta y el admin decide.
   */
  async conciliar(data: Buffer, nombre: string) {
    const filas = await leerEstadoDeCuenta(data, nombre);
    const pendientes = await this.paymentsRepository.find({
      where: {
        status: PaymentStatus.Pendiente,
        isDeleted: false,
        banco: Not('Efectivo'),
      },
      relations: ['idUser', 'idEvents'],
      order: { idPayment: 'ASC' },
    });
    const porId = new Map(pendientes.map((p) => [p.idPayment, p]));
    return {
      filas: filas.length,
      pendientes: pendientes.length,
      resultados: conciliar(pendientes, filas).map((r) => {
        const p = porId.get(r.idPayment)!;
        const usd = Number(p.totalGeneral ?? 0);
        const tasa = Number(p.tasaDolar ?? 0);
        return {
          ...r,
          noDocumento: p.noDocumento,
          cliente: [p.idUser?.name, p.idUser?.lastName]
            .filter(Boolean)
            .join(' '),
          cedula: p.idUser?.cedula ?? null,
          evento: p.idEvents?.name ?? null,
          banco: p.banco,
          referencia: p.referencia,
          totalUsd: usd,
          totalBs: tasa ? Math.round(usd * tasa * 100) / 100 : null,
        };
      }),
    };
  }

  /**
   * Aprueba varios pagos (los que el admin confirmo de la conciliacion). Uno a
   * uno por updateStatus: cada uno emite su QR y su correo; si uno falla (aforo)
   * los demas siguen.
   */
  async aprobarLote(ids: number[]) {
    const aprobados: number[] = [];
    const errores: { idPayment: number; mensaje: string }[] = [];
    for (const id of [...new Set(ids)]) {
      try {
        await this.updateStatus(id, { status: PaymentStatus.Aprobado });
        aprobados.push(id);
      } catch (e) {
        errores.push({ idPayment: id, mensaje: (e as Error).message });
      }
    }
    return { aprobados, errores };
  }

  /** Excel de pagos para el contador: una fila por pago, con tasa y montos en USD y Bs. */
  async exportar(filtro: {
    desde?: string;
    hasta?: string;
    idEvents?: number;
    status?: PaymentStatus;
  }): Promise<Buffer> {
    const qb = this.paymentsRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.idUser', 'u')
      .leftJoinAndSelect('p.idEvents', 'e')
      .where('p.isDeleted = 0')
      .orderBy('p.date', 'ASC');
    if (filtro.desde) qb.andWhere('p.date >= :desde', { desde: filtro.desde });
    if (filtro.hasta) {
      qb.andWhere('p.date < DATE_ADD(:hasta, INTERVAL 1 DAY)', {
        hasta: filtro.hasta,
      });
    }
    if (filtro.idEvents) {
      qb.andWhere('p.idEvents = :idEvents', { idEvents: filtro.idEvents });
    }
    if (filtro.status) {
      qb.andWhere('p.status = :status', { status: filtro.status });
    }
    const pagos = await qb.getMany();

    // Excel no tiene zona horaria: se escribe la hora de Caracas (UTC-4, sin horario de verano).
    const caracas = (d: Date | string) =>
      new Date(new Date(d).getTime() - 4 * 3600 * 1000);
    const libro = new Workbook();
    libro.creator = 'Mi Ternerita';
    const hoja = libro.addWorksheet('Pagos', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const fecha = { numFmt: 'dd/mm/yyyy hh:mm' };
    const dinero = { numFmt: '#,##0.00' };
    hoja.columns = [
      { header: 'N° documento', key: 'doc', width: 14 },
      { header: 'Fecha', key: 'fecha', width: 18, style: fecha },
      { header: 'Evento', key: 'evento', width: 28 },
      { header: 'Fecha evento', key: 'fechaEvento', width: 13 },
      { header: 'Cliente', key: 'cliente', width: 26 },
      { header: 'Cédula', key: 'cedula', width: 14 },
      { header: 'Correo', key: 'correo', width: 28 },
      { header: 'Método / banco', key: 'banco', width: 18 },
      { header: 'Referencia', key: 'referencia', width: 18 },
      { header: 'Fecha transferencia', key: 'fechaTr', width: 14 },
      { header: 'Estado', key: 'estado', width: 11 },
      { header: 'Revisado', key: 'revisado', width: 18, style: fecha },
      {
        header: 'Tasa BCV',
        key: 'tasa',
        width: 11,
        style: { numFmt: '#,##0.0000' },
      },
      { header: 'Total USD', key: 'usd', width: 12, style: dinero },
      { header: 'Total Bs', key: 'bs', width: 15, style: dinero },
    ];
    hoja.getRow(1).font = { bold: true };
    hoja.autoFilter = { from: 'A1', to: 'O1' };

    for (const p of pagos) {
      const usd = Number(p.totalGeneral ?? 0);
      const tasa = p.tasaDolar ? Number(p.tasaDolar) : null;
      hoja.addRow({
        doc: p.noDocumento,
        fecha: p.date ? caracas(p.date) : null,
        evento: p.idEvents?.name ?? '',
        fechaEvento: p.idEvents?.date ?? '',
        cliente: [p.idUser?.name, p.idUser?.lastName].filter(Boolean).join(' '),
        cedula: p.idUser?.cedula ?? '',
        correo: p.idUser?.email ?? '',
        banco: p.banco ?? '',
        referencia: p.banco === 'Efectivo' ? '' : (p.referencia ?? ''),
        fechaTr: p.fechaTransferencia ?? '',
        estado: p.status,
        revisado: p.revisado ? caracas(p.revisado) : null,
        tasa,
        usd,
        bs: tasa ? Math.round(usd * tasa * 100) / 100 : null,
      });
    }

    // Total cobrado (solo aprobados) con formula: sigue valiendo si el contador filtra o edita.
    const ultima = pagos.length + 1;
    hoja.addRow([]);
    const total = hoja.addRow({ evento: 'Total aprobado' });
    total.font = { bold: true };
    for (const col of ['N', 'O']) {
      total.getCell(col).value = {
        formula: `SUMIFS(${col}2:${col}${ultima},K2:K${ultima},"Aprobado")`,
      };
    }

    return Buffer.from(await libro.xlsx.writeBuffer());
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
    await this.salonService.liberar(this.dataSource.manager, id);
  }
}

/** Lo que dura un apartado; igual que el temporizador del front (20 min). */
export const RESERVA_MINUTOS = 20;
/** Entradas por cliente y evento (mismo maximo que el apartado del front). */
export const MAX_ENTRADAS_CLIENTE = 10;

/** Evento activo y, salvo para el admin, antes de su cierre de venta. */
function assertVentaAbierta(event: Event, esAdmin: boolean): void {
  if (event.status !== 1) {
    throw new BadRequestException('El evento no esta disponible para la venta');
  }
  if (!esAdmin && event.cierreVenta && new Date() >= event.cierreVenta) {
    throw new BadRequestException('La venta de este evento ya cerro');
  }
}
