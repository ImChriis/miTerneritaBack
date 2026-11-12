import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Code } from './entities/code.entity';
import { ScanLog, ScanOrigen } from './entities/scan-log.entity';
import { ScanLogDetail } from './entities/scan-log-detail.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import { ConsumeDetails } from '../consumeDetails/entities/consumeDetail.entity';
import { MailService } from '../mail/mail.service';
import { sumQuantitiesBy } from '../common/merge-lines';
import { formatDateOnly } from '../common/format-date';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request';

/** Un tipo de entrada dentro del QR: cuantas se compraron y cuantas quedan. */
export interface EstadoEntradaTipo {
  idTicket: number;
  tipo: string;
  /** Entradas compradas de este tipo. */
  cantidad: number;
  usadas: number;
  restantes: number;
}

/** Lo que ve el personal de puerta al escanear un QR. */
export interface EstadoEntrada {
  idPayment: number;
  noDocumento: string | null;
  buyerName: string;
  buyerEmail: string;
  eventName: string;
  eventDate: string;
  /** Total comprado, sumando todos los tipos. */
  ticketCount: number;
  usadas: number;
  restantes: number;
  /** Ya no queda ninguna entrada por usar: el QR esta agotado. */
  agotada: boolean;
  /** Desglose por tipo: "General 7/10, VIP 5/5". */
  entradas: EstadoEntradaTipo[];
}

type LineaResumen = { idTicket: number; tipo: string; cantidad: number };

/** Un escaneo del registro, tal como se devuelve a la app o al admin. */
export interface EscaneoResumen {
  idScan: number;
  scanId: string;
  origen: ScanOrigen;
  fecha: Date;
  total: number;
  puerta: string | null;
  idEvents: number | null;
  idPayment: number;
  usuario: { id: number; nombre: string } | null;
  deshecho: boolean;
  deshechoEn: Date | null;
  entradas: LineaResumen[];
}

export interface LookupResult extends EstadoEntrada {
  /** Ultimos escaneos de este QR: "15/15, la ultima a las 22:41 en puerta 2". */
  historial: EscaneoResumen[];
  /** Para identificar al comprador en puerta. */
  buyerCedula: string | null;
  buyerPhone: string | null;
  /** Total del pago (entradas + consumo), en USD. */
  montoPagado: number;
  /** Comida y bebida pre-ordenadas, para entregarlas en barra. */
  consumo: Array<{ nombre: string; cantidad: number; total: number }>;
}

export interface RedeemResult extends EstadoEntrada {
  /** Lo aprobado en este escaneo (en un reintento, lo del escaneo original). */
  aprobadas: LineaResumen[];
  totalAprobadas: number;
  /** Para deshacer este escaneo: POST /code/scans/:idScan/undo. */
  idScan: number;
  scanId: string;
  /** true si es un reintento de un escaneo ya aplicado: no se desconto nada. */
  repetido: boolean;
  /** Solo en reintentos: el escaneo original ya se deshizo. */
  deshecho?: boolean;
}

export interface UndoResult extends EstadoEntrada {
  idScan: number;
  devueltas: LineaResumen[];
  totalDevueltas: number;
  /** true si el escaneo ya estaba deshecho: no se devolvio nada otra vez. */
  repetido: boolean;
}

/** Quien escanea y desde donde, para el registro y los logs. */
export interface ScanContext {
  idUser: number;
  origen: Exclude<ScanOrigen, 'manual'>;
  /** Evento activo en la app: un QR de otro evento se rechaza. */
  idEvents: number;
  puerta?: string;
}

/**
 * Un escaneo que descuenta. scanId es opcional: si la app lo manda, un
 * reintento con el mismo no descuenta dos veces; si no, el servidor genera uno
 * solo para el registro.
 */
export interface SpendContext extends ScanContext {
  scanId?: string;
}

type Pedido = { idTicket: number; cantidad: number };

const HISTORIAL_LIMITE = 10;

/** Minutos durante los que el personal puede deshacer sus propios escaneos. */
function plazoDeshacerMinutos(): number {
  const valor = Number(process.env.SCAN_UNDO_MINUTES);
  return Number.isFinite(valor) && valor > 0 ? valor : 5;
}

/** Entradas compradas en una linea; ticketNum nulo cuenta como 1. */
const compradas = (detail: PaymentDetails) => detail.ticketNum ?? 1;

const huella = (valor: unknown) =>
  crypto.createHash('sha256').update(JSON.stringify(valor)).digest('hex');

/** Suma cantidades por tipo de entrada. */
function agruparLineas(
  lineas: Array<{ idTicket: number; tipo: string; cantidad: number }>,
): LineaResumen[] {
  const porTipo = new Map<number, LineaResumen>();
  for (const linea of lineas) {
    const previo = porTipo.get(linea.idTicket);
    if (previo) {
      previo.cantidad += linea.cantidad;
    } else {
      porTipo.set(linea.idTicket, {
        idTicket: linea.idTicket,
        tipo: linea.tipo,
        cantidad: linea.cantidad,
      });
    }
  }
  return [...porTipo.values()];
}

/**
 * Estado del QR por tipo de entrada. Normalmente hay una linea por tipo, pero
 * se suman por si un admin anadio otra a mano.
 */
function construirEstado(
  payment: Payment,
  details: PaymentDetails[],
): EstadoEntrada {
  const porTipo = new Map<number, EstadoEntradaTipo>();

  for (const detail of details) {
    const cantidad = compradas(detail);
    const usadas = Math.min(Math.max(detail.usadas ?? 0, 0), cantidad);
    const tipo = porTipo.get(detail.idTicket) ?? {
      idTicket: detail.idTicket,
      tipo: detail.ticket?.name ?? 'Entrada',
      cantidad: 0,
      usadas: 0,
      restantes: 0,
    };
    tipo.cantidad += cantidad;
    tipo.usadas += usadas;
    tipo.restantes = tipo.cantidad - tipo.usadas;
    porTipo.set(detail.idTicket, tipo);
  }

  const entradas = [...porTipo.values()];
  const ticketCount = entradas.reduce((s, e) => s + e.cantidad, 0);
  const usadas = entradas.reduce((s, e) => s + e.usadas, 0);

  return {
    idPayment: payment.idPayment,
    noDocumento: payment.noDocumento ?? null,
    buyerName:
      `${payment.idUser?.name ?? ''} ${payment.idUser?.lastName ?? ''}`.trim(),
    buyerEmail: payment.idUser?.email ?? '',
    eventName: payment.idEvents?.name ?? '',
    eventDate: payment.idEvents?.date,
    ticketCount,
    usadas,
    restantes: ticketCount - usadas,
    agotada: ticketCount - usadas === 0,
    entradas,
  };
}

function resumirEscaneo(log: ScanLog): EscaneoResumen {
  return {
    idScan: log.idScan,
    scanId: log.scanId,
    origen: log.origen,
    fecha: log.fecha,
    total: log.total,
    puerta: log.puerta,
    idEvents: log.idEvents,
    idPayment: log.idPayment,
    usuario:
      log.usuario && log.idUser !== null
        ? {
            id: log.idUser,
            nombre:
              `${log.usuario.name ?? ''} ${log.usuario.lastName ?? ''}`.trim(),
          }
        : null,
    deshecho: !!log.undoneAt,
    deshechoEn: log.undoneAt,
    entradas: agruparLineas(log.detalles ?? []),
  };
}

/** El INSERT choco con el indice unico de scanId. */
function esScanIdDuplicado(error: unknown): boolean {
  const e = error as {
    code?: string;
    sqlMessage?: string;
    driverError?: { code?: string; sqlMessage?: string };
  };
  const code = e?.code ?? e?.driverError?.code;
  const mensaje = e?.sqlMessage ?? e?.driverError?.sqlMessage ?? '';
  return code === 'ER_DUP_ENTRY' && mensaje.includes('uq_scan_log_scanId');
}

@Injectable()
export class CodeService {
  private readonly logger = new Logger(CodeService.name);

  constructor(
    @InjectRepository(Code)
    private readonly codeRepository: Repository<Code>,

    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,

    private readonly mailService: MailService,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Crea la entrada de un pago aprobado y la envia por correo.
   *
   * Es idempotente: si el pago ya tiene entrada se reutiliza, para que
   * reaprobar un pago no invalide el QR que el comprador ya recibio.
   */
  async issueForPayment(idPayment: number): Promise<Code> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment, isDeleted: false },
      relations: ['idUser', 'idEvents'],
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const existing = await this.codeRepository.findOne({
      where: { payment: { idPayment } },
      relations: ['payment'],
    });
    if (existing) {
      return existing;
    }

    // Token opaco: no lleva ningun dato del comprador ni del evento, asi que
    // fotografiar el QR de otra persona no revela nada.
    const token = crypto.randomBytes(24).toString('hex');

    const code = await this.codeRepository.save(
      this.codeRepository.create({ QR: token, payment }),
    );

    const email = payment.idUser?.email;
    if (email) {
      await this.mailService.sendEntryPass({
        userEmail: email,
        userName: payment.idUser?.name,
        eventName: payment.idEvents?.name,
        eventDate: payment.idEvents?.date,
        eventTime: payment.idEvents?.time,
        eventRoom: payment.idEvents?.room,
        token,
      });
    } else {
      this.logger.warn(
        `El pago ${idPayment} no tiene correo asociado; la entrada se creo pero no se envio.`,
      );
    }

    return code;
  }

  /**
   * POST /code/lookup: estado del QR sin gastar nada, con sus ultimos
   * escaneos. Un QR agotado no es un error aqui: vuelve con `agotada: true`
   * para que la app muestre los datos del comprador en la pantalla de rechazo.
   */
  async lookup(
    token: string,
    idEvents: number,
    requester: AuthenticatedUser,
  ): Promise<LookupResult> {
    const ctx: ScanContext = {
      idUser: requester.userId,
      origen: 'app',
      idEvents,
    };
    const manager = this.dataSource.manager;
    const payment = await this.cargarPago(manager, token, ctx);
    this.asegurarPagoValido(payment, ctx);
    this.asegurarEvento(payment, ctx);
    const details = await this.lineas(manager, payment.idPayment, false);

    const consumo = await manager.getRepository(ConsumeDetails).find({
      where: { idPayment: { idPayment: payment.idPayment } },
      relations: ['idFood', 'idDrinks'],
    });

    return {
      ...construirEstado(payment, details),
      historial: await this.historial(manager, payment.idPayment),
      buyerCedula: payment.idUser?.cedula ?? null,
      buyerPhone: payment.idUser?.phone ?? null,
      montoPagado: Number(payment.totalGeneral ?? 0),
      consumo: consumo.map((c) => ({
        nombre: c.idFood?.description ?? c.idDrinks?.description ?? 'Producto',
        cantidad: (c.foodAmount || 0) + (c.drinksAmount || 0),
        total: Number(c.totalConsume),
      })),
    };
  }

  /**
   * POST /code/redeem: deja pasar las entradas que confirma el personal.
   * Todo o nada: si en algun tipo se piden mas de las que quedan, no se gasta
   * ninguna.
   */
  async redeem(
    token: string,
    pedidas: Pedido[],
    ctx: SpendContext,
  ): Promise<RedeemResult> {
    // Si la app manda dos lineas del mismo tipo, se suman.
    const agrupadas = sumQuantitiesBy(pedidas, (p) => p.idTicket).sort(
      (a, b) => a.idTicket - b.idTicket,
    );
    const firma = huella({
      token,
      idUser: ctx.idUser,
      idEvents: ctx.idEvents,
      origen: ctx.origen,
      pedidas: agrupadas.map((p) => [p.idTicket, p.cantidad]),
    });
    return this.gastar(token, () => agrupadas, ctx, firma);
  }

  /**
   * POST /code/validate (escaneo de un solo paso): deja pasar todas las
   * entradas que quedan. Mismas garantias que redeem.
   */
  async validate(token: string, ctx: SpendContext): Promise<RedeemResult> {
    const firma = huella({
      token,
      idUser: ctx.idUser,
      idEvents: ctx.idEvents,
      origen: ctx.origen,
      pedidas: 'todo',
    });
    return this.gastar(
      token,
      (estado) =>
        estado.entradas
          .filter((e) => e.restantes > 0)
          .map((e) => ({ idTicket: e.idTicket, cantidad: e.restantes })),
      ctx,
      firma,
    );
  }

  /**
   * POST /code/scans/:idScan/undo: devuelve las entradas de un escaneo.
   *
   * - El personal solo deshace sus propios escaneos y dentro del plazo
   *   (SCAN_UNDO_MINUTES); el admin, cualquiera y cuando sea.
   * - Deshacer dos veces responde lo mismo con `repetido: true`: un reintento
   *   de la app no devuelve entradas dos veces.
   * - Las correcciones manuales del admin no se deshacen aqui.
   */
  async undo(
    idScan: number,
    requester: AuthenticatedUser,
  ): Promise<UndoResult> {
    const plazo = plazoDeshacerMinutos();

    return this.dataSource.transaction('READ COMMITTED', async (manager) => {
      const repoLog = manager.getRepository(ScanLog);

      const inicial = await repoLog.findOne({ where: { idScan } });
      if (!inicial) {
        throw new NotFoundException('Escaneo no encontrado');
      }
      if (inicial.origen === 'manual') {
        throw new BadRequestException(
          'Las correcciones manuales del admin no se deshacen aqui: vuelve a cambiar la marca de la linea',
        );
      }
      if (requester.role !== 'admin' && inicial.idUser !== requester.userId) {
        throw new ForbiddenException(
          'Solo puedes deshacer tus propios escaneos',
        );
      }

      // Mismo orden de bloqueo que redeem (primero las lineas del pago, despues
      // el registro), asi deshacer y escanear a la vez no se interbloquean.
      const details = await this.lineas(
        manager,
        inicial.idPayment,
        true,
        false,
      );
      const log = await repoLog
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.detalles', 'd')
        .where('s.idScan = :idScan', { idScan })
        .setLock('pessimistic_write')
        .getOneOrFail();
      const payment = await manager.getRepository(Payment).findOneOrFail({
        where: { idPayment: log.idPayment },
        relations: ['idUser', 'idEvents'],
      });
      const devueltas = agruparLineas(log.detalles);

      if (log.undoneAt) {
        return {
          ...construirEstado(payment, details),
          idScan,
          devueltas,
          totalDevueltas: log.total,
          repetido: true,
        };
      }

      if (requester.role !== 'admin') {
        // El plazo se calcula con el reloj de la BD, el mismo que puso la
        // fecha del escaneo: no depende de la zona horaria del servidor.
        const [fila] = await manager.query<Array<{ dentro: number }>>(
          'SELECT fecha >= NOW() - INTERVAL ? MINUTE AS dentro FROM scan_log WHERE idScan = ?',
          [plazo, idScan],
        );
        if (!Number(fila?.dentro)) {
          throw new ForbiddenException(
            `Pasaron mas de ${plazo} minutos: solo un admin puede deshacer este escaneo`,
          );
        }
      }

      // Todo o nada: si el admin desmarco la linea despues del escaneo, esas
      // entradas ya se devolvieron y devolverlas otra vez descuadraria el
      // contador con el registro.
      const lineasDeshacer = log.detalles.map((detalle) => ({
        detalle,
        linea: details.find(
          (d) => d.idPaymentDetails === detalle.idPaymentDetails,
        ),
      }));
      if (
        lineasDeshacer.some(
          ({ detalle, linea }) => !linea || linea.usadas < detalle.cantidad,
        )
      ) {
        throw new ConflictException(
          'No se puede deshacer: esas entradas ya se liberaron despues del escaneo',
        );
      }

      const repoLineas = manager.getRepository(PaymentDetails);
      for (const { detalle, linea } of lineasDeshacer) {
        if (!linea) continue;
        linea.usadas -= detalle.cantidad;
        linea.checked = linea.usadas >= compradas(linea);
        await repoLineas.update(linea.idPaymentDetails, {
          usadas: linea.usadas,
          checked: linea.checked,
        });
      }

      await repoLog.update(idScan, {
        undoneAt: () => 'CURRENT_TIMESTAMP',
        undoneBy: requester.userId,
      });
      this.logger.log(
        `Escaneo ${idScan} deshecho por el usuario ${requester.userId}: ${log.total} entradas devueltas al pago ${log.idPayment}`,
      );

      return {
        ...construirEstado(payment, details),
        idScan,
        devueltas,
        totalDevueltas: log.total,
        repetido: false,
      };
    });
  }

  /**
   * GET /code/scans. El personal ve solo sus escaneos (la lista de la app para
   * deshacer); el admin, todos, filtrando por evento o pago.
   */
  async listScans(
    filtros: { idEvents?: number; idPayment?: number; limit?: number },
    requester: AuthenticatedUser,
  ): Promise<EscaneoResumen[]> {
    const query = this.dataSource
      .getRepository(ScanLog)
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.detalles', 'd')
      .leftJoin('s.usuario', 'u')
      .addSelect(['u.id', 'u.name', 'u.lastName'])
      .orderBy('s.fecha', 'DESC')
      .addOrderBy('s.idScan', 'DESC')
      .take(filtros.limit ?? 20);

    if (requester.role !== 'admin') {
      query.andWhere('s.idUser = :yo', { yo: requester.userId });
    }
    if (filtros.idEvents) {
      query.andWhere('s.idEvents = :idEvents', { idEvents: filtros.idEvents });
    }
    if (filtros.idPayment) {
      query.andWhere('s.idPayment = :idPayment', {
        idPayment: filtros.idPayment,
      });
    }

    return (await query.getMany()).map(resumirEscaneo);
  }

  /**
   * Registra la marca manual del admin (PATCH /payment-details/:id/status) en
   * el registro de escaneos, para que registro y contadores cuadren. Se llama
   * dentro de la transaccion que cambia la linea.
   */
  async registrarCorreccionManual(
    manager: EntityManager,
    linea: PaymentDetails,
    usadasAntes: number,
    usadasDespues: number,
    idUser: number,
  ): Promise<void> {
    const delta = usadasDespues - usadasAntes;
    if (delta === 0) return;

    const scanId = crypto.randomUUID();
    const repoLog = manager.getRepository(ScanLog);
    await repoLog.save(
      repoLog.create({
        scanId,
        requestHash: huella({ manual: scanId }),
        origen: 'manual',
        idPayment: linea.payment.idPayment,
        idUser,
        idEvents: linea.idEvent?.idEvents ?? null,
        puerta: null,
        total: delta,
        detalles: [
          manager.getRepository(ScanLogDetail).create({
            idPaymentDetails: linea.idPaymentDetails,
            idTicket: linea.idTicket,
            tipo: linea.ticket?.name ?? 'Entrada',
            cantidad: delta,
          }),
        ],
      }),
    );
  }

  /**
   * Descuenta entradas del QR en una transaccion.
   *
   * Las lineas del pago se bloquean (FOR UPDATE) hasta el final: si dos
   * puertas escanean a la vez capturas del mismo QR, la segunda espera y ve lo
   * que gasto la primera. Con READ COMMITTED esa lectura bloqueante ve el
   * ultimo valor confirmado, asi que nunca pasan 16 personas con 15 entradas.
   *
   * El scanId se busca DESPUES del bloqueo: un reintento que llega mientras
   * el primer intento sigue en curso espera y despues encuentra su fila. Sin
   * scanId de la app no hay reintento que reconocer: cada peticion es un
   * escaneo nuevo.
   */
  private async gastar(
    token: string,
    pedir: (estado: EstadoEntrada) => Pedido[],
    ctx: SpendContext,
    firma: string,
  ): Promise<RedeemResult> {
    const scanId = ctx.scanId ?? crypto.randomUUID();

    try {
      return await this.dataSource.transaction(
        'READ COMMITTED',
        async (manager) => {
          const payment = await this.cargarPago(manager, token, ctx);
          const details = await this.lineas(manager, payment.idPayment, true);

          const previo = await manager
            .getRepository(ScanLog)
            .findOne({ where: { scanId }, relations: ['detalles'] });
          if (previo) {
            // Un reintento se responde aunque el pago o el evento hayan
            // cambiado despues: el escaneo original ya fue valido.
            return this.respuestaRepetida(previo, firma, payment, details, ctx);
          }

          this.asegurarPagoValido(payment, ctx);
          this.asegurarEvento(payment, ctx);

          const estado = construirEstado(payment, details);
          if (estado.agotada) {
            throw this.rechazo(
              new ConflictException('Esta entrada ya se uso'),
              ctx,
              payment,
            );
          }

          const pedidas = pedir(estado);
          const porTipo = new Map(estado.entradas.map((e) => [e.idTicket, e]));
          for (const pedida of pedidas) {
            const tipo = porTipo.get(pedida.idTicket);
            if (!tipo) {
              throw this.rechazo(
                new BadRequestException(
                  `Este QR no incluye entradas del tipo ${pedida.idTicket}`,
                ),
                ctx,
                payment,
              );
            }
            if (pedida.cantidad > tipo.restantes) {
              throw this.rechazo(
                new ConflictException(
                  tipo.restantes === 0
                    ? `No quedan entradas ${tipo.tipo} en este QR`
                    : `Solo quedan ${tipo.restantes} entradas ${tipo.tipo} en este QR`,
                ),
                ctx,
                payment,
              );
            }
          }

          // Se reparte lo pedido entre las lineas de cada tipo, llenando en orden.
          const repoLineas = manager.getRepository(PaymentDetails);
          const repoDetalle = manager.getRepository(ScanLogDetail);
          const tocadas: ScanLogDetail[] = [];
          for (const pedida of pedidas) {
            let pendiente = pedida.cantidad;
            for (const detail of details) {
              if (pendiente === 0) break;
              if (detail.idTicket !== pedida.idTicket) continue;
              const libres = compradas(detail) - detail.usadas;
              if (libres <= 0) continue;

              const usar = Math.min(libres, pendiente);
              detail.usadas += usar;
              // `checked` se mantiene porque el panel de admin lo lee:
              // una linea esta "escaneada" cuando ya no le queda nada.
              detail.checked = detail.usadas >= compradas(detail);
              pendiente -= usar;
              await repoLineas.update(detail.idPaymentDetails, {
                usadas: detail.usadas,
                checked: detail.checked,
              });
              tocadas.push(
                repoDetalle.create({
                  idPaymentDetails: detail.idPaymentDetails,
                  idTicket: detail.idTicket,
                  tipo: detail.ticket?.name ?? 'Entrada',
                  cantidad: usar,
                }),
              );
            }
          }

          const repoLog = manager.getRepository(ScanLog);
          const log = await repoLog.save(
            repoLog.create({
              scanId,
              requestHash: firma,
              origen: ctx.origen,
              idPayment: payment.idPayment,
              idUser: ctx.idUser,
              idEvents: ctx.idEvents,
              puerta: ctx.puerta ?? null,
              total: tocadas.reduce((s, t) => s + t.cantidad, 0),
              detalles: tocadas,
            }),
          );

          const aprobadas = agruparLineas(tocadas);
          return {
            ...construirEstado(payment, details),
            aprobadas,
            totalAprobadas: log.total,
            idScan: log.idScan,
            scanId,
            repetido: false,
          };
        },
      );
    } catch (error) {
      // Dos intentos con el mismo scanId sobre QR distintos no comparten
      // bloqueo; el indice unico frena al segundo y aqui se le responde.
      if (ctx.scanId && esScanIdDuplicado(error)) {
        return this.dataSource.transaction(
          'READ COMMITTED',
          async (manager) => {
            const payment = await this.cargarPago(manager, token, ctx);
            const details = await this.lineas(
              manager,
              payment.idPayment,
              false,
            );
            const previo = await manager
              .getRepository(ScanLog)
              .findOneOrFail({ where: { scanId }, relations: ['detalles'] });
            return this.respuestaRepetida(previo, firma, payment, details, ctx);
          },
        );
      }
      throw error;
    }
  }

  /** Respuesta a un reintento: lo del escaneo original, sin descontar nada. */
  private respuestaRepetida(
    previo: ScanLog,
    firma: string,
    payment: Payment,
    details: PaymentDetails[],
    ctx: ScanContext,
  ): RedeemResult {
    if (previo.requestHash !== firma) {
      throw this.rechazo(
        new ConflictException(
          'Este scanId ya se uso para otro escaneo: la app debe generar uno nuevo por escaneo',
        ),
        ctx,
        payment,
      );
    }
    return {
      ...construirEstado(payment, details),
      aprobadas: agruparLineas(previo.detalles ?? []),
      totalAprobadas: previo.total,
      idScan: previo.idScan,
      scanId: previo.scanId,
      repetido: true,
      deshecho: !!previo.undoneAt,
    };
  }

  private async cargarPago(
    manager: EntityManager,
    token: string,
    ctx: ScanContext,
  ): Promise<Payment> {
    const code = await manager.getRepository(Code).findOne({
      where: { QR: token },
      relations: ['payment', 'payment.idUser', 'payment.idEvents'],
    });
    if (!code) {
      throw this.rechazo(new NotFoundException('Entrada no valida'), ctx);
    }
    return code.payment;
  }

  /** Si el pago se rechazo o se anulo despues de emitir la entrada, no da acceso. */
  private asegurarPagoValido(payment: Payment, ctx: ScanContext): void {
    if (payment.isDeleted) {
      throw this.rechazo(
        new ConflictException('El pago de esta entrada fue anulado'),
        ctx,
        payment,
      );
    }
    if (payment.status !== PaymentStatus.Aprobado) {
      throw this.rechazo(
        new ConflictException(
          `El pago de esta entrada no esta aprobado (estado: ${payment.status})`,
        ),
        ctx,
        payment,
      );
    }
  }

  /**
   * El QR debe ser del evento activo en la app. El mensaje dice de que evento
   * es, para que el personal pueda orientar a la persona.
   */
  private asegurarEvento(payment: Payment, ctx: ScanContext): void {
    if (payment.idEvents?.idEvents !== ctx.idEvents) {
      throw this.rechazo(
        new ConflictException(
          `Este QR es del evento "${payment.idEvents?.name ?? '?'}" del ${formatDateOnly(payment.idEvents?.date) ?? '?'}, no del evento activo en la app`,
        ),
        ctx,
        payment,
      );
    }
  }

  /** Lineas de entradas del pago; con `bloquear`, FOR UPDATE hasta el commit. */
  private async lineas(
    manager: EntityManager,
    idPayment: number,
    bloquear: boolean,
    exigir = true,
  ): Promise<PaymentDetails[]> {
    const query = manager
      .getRepository(PaymentDetails)
      .createQueryBuilder('pd')
      // El nombre del tipo de entrada (General, VIP...) vive en `ticket`.
      .leftJoinAndSelect('pd.ticket', 'ticket')
      .innerJoin('pd.payment', 'p')
      .where('p.idPayment = :idPayment', { idPayment })
      .andWhere('pd.isDeleted = 0')
      .orderBy('pd.idPaymentDetails', 'ASC');
    if (bloquear) {
      query.setLock('pessimistic_write');
    }
    const details = await query.getMany();

    // Un pago sin lineas no da acceso a nada.
    if (exigir && details.length === 0) {
      throw new BadRequestException('Esta entrada no tiene tickets asociados');
    }
    return details;
  }

  private async historial(
    manager: EntityManager,
    idPayment: number,
  ): Promise<EscaneoResumen[]> {
    const logs = await manager
      .getRepository(ScanLog)
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.detalles', 'd')
      .leftJoin('s.usuario', 'u')
      .addSelect(['u.id', 'u.name', 'u.lastName'])
      .where('s.idPayment = :idPayment', { idPayment })
      .orderBy('s.fecha', 'DESC')
      .addOrderBy('s.idScan', 'DESC')
      .take(HISTORIAL_LIMITE)
      .getMany();
    return logs.map(resumirEscaneo);
  }

  /**
   * Deja constancia de un escaneo rechazado en el log del servidor. Nunca se
   * escribe el token: es lo que da acceso al evento.
   */
  private rechazo<T extends HttpException>(
    error: T,
    ctx: ScanContext,
    payment?: Payment,
  ): T {
    this.logger.warn(
      `Escaneo rechazado (${error.getStatus()}): ${error.message} | pago=${payment?.idPayment ?? '-'} evento=${ctx.idEvents ?? '-'} puerta=${ctx.puerta ?? '-'} usuario=${ctx.idUser} origen=${ctx.origen}`,
    );
    return error;
  }
}
