import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
} from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Asiento } from './entities/asiento.entity';
import { MesaZona } from './entities/mesa-zona.entity';
import { MESA_DE_ASIENTO, PLANO } from './plano';
import { ZonaMesaDto } from './dto/update-zonas.dto';

export type EstadoAsiento = 'vendido' | 'apartado';

export interface EstadoSalon {
  /** { [mesa]: idTicket } de las mesas a la venta. */
  zonas: Record<number, number>;
  /** Puestos que no puede tomar quien consulta. */
  ocupados: Record<string, EstadoAsiento>;
  /** Puestos que tiene apartados quien consulta (para retomar la compra). */
  mios: string[];
}

/** Una linea de entradas de la compra: tipo y cantidad. */
type LineaEntradas = { ticket: { idTicket?: number }; cantidad: number };

@Injectable()
export class SalonService {
  constructor(private readonly dataSource: DataSource) {}

  plano() {
    return PLANO;
  }

  async zonas(
    manager: EntityManager,
    idEvents: number,
  ): Promise<Map<number, number>> {
    const filas = await manager
      .getRepository(MesaZona)
      .find({ where: { idEvents } });
    return new Map(filas.map((f) => [f.mesa, f.idTicket]));
  }

  async estado(idEvents: number, idUser: number): Promise<EstadoSalon> {
    const manager = this.dataSource.manager;
    const zonas = await this.zonas(manager, idEvents);
    const ahora = new Date();
    const filas = await manager
      .getRepository(Asiento)
      .find({ where: { idEvents } });
    const ocupados: Record<string, EstadoAsiento> = {};
    const mios: string[] = [];
    for (const f of filas) {
      if (f.idPayment) ocupados[f.asiento] = 'vendido';
      else if (f.vence && f.vence > ahora) {
        if (f.idUser === idUser) mios.push(f.asiento);
        else ocupados[f.asiento] = 'apartado';
      }
    }
    return { zonas: Object.fromEntries(zonas), ocupados, mios };
  }

  /** El admin asigna la zona de cada mesa; reemplaza la asignacion anterior. */
  async guardarZonas(
    idEvents: number,
    zonas: ZonaMesaDto[],
  ): Promise<EstadoSalon> {
    const mesas = new Set(PLANO.mesas.map((m) => m.mesa));
    const desconocidas = zonas
      .filter((z) => !mesas.has(z.mesa))
      .map((z) => z.mesa);
    if (desconocidas.length) {
      throw new BadRequestException(
        `Mesas que no existen: ${desconocidas.join(', ')}`,
      );
    }
    await this.dataSource.transaction(async (manager) => {
      const tickets = await manager
        .getRepository(Ticket)
        .find({ where: { idEvents }, select: { idTicket: true } });
      if (!tickets.length) {
        throw new NotFoundException('El evento no existe o no tiene entradas');
      }
      const validos = new Set(tickets.map((t) => t.idTicket));
      const ajenos = zonas.filter((z) => !validos.has(z.idTicket));
      if (ajenos.length) {
        throw new BadRequestException(
          'Cada mesa debe tener una entrada de este evento (General, VIP, Palco...)',
        );
      }
      const repo = manager.getRepository(MesaZona);
      await repo.delete({ idEvents });
      if (zonas.length) {
        await repo.insert(
          zonas.map((z) => ({ idEvents, mesa: z.mesa, idTicket: z.idTicket })),
        );
      }
    });
    return this.estado(idEvents, 0);
  }

  /** Puestos validos del evento: existen en el plano y su mesa esta a la venta. */
  private asientosDeZona(
    asientos: string[],
    zonas: Map<number, number>,
  ): Map<string, number> {
    const ticketDe = new Map<string, number>();
    const malos: string[] = [];
    for (const a of asientos) {
      const mesa = MESA_DE_ASIENTO.get(a);
      const idTicket = mesa ? zonas.get(mesa) : undefined;
      if (idTicket) ticketDe.set(a, idTicket);
      else malos.push(a);
    }
    if (malos.length) {
      throw new BadRequestException(
        `Estos puestos no estan a la venta: ${malos.join(', ')}`,
      );
    }
    return ticketDe;
  }

  /** Puestos que alguien mas tiene vendidos o apartados (vigentes). */
  private async tomados(
    manager: EntityManager,
    idEvents: number,
    idUser: number,
    asientos: string[],
  ): Promise<string[]> {
    if (!asientos.length) return [];
    const ahora = new Date();
    const filas = await manager
      .getRepository(Asiento)
      .find({ where: { idEvents, asiento: In(asientos) } });
    return filas
      .filter(
        (f) =>
          f.idPayment || (f.idUser !== idUser && f.vence && f.vence > ahora),
      )
      .map((f) => f.asiento);
  }

  /**
   * Aparta los puestos elegidos hasta `vence`. Se llama dentro de la
   * transaccion del apartado, con el evento bloqueado: dos clientes no pueden
   * quedarse con el mismo puesto. Reemplaza lo que el cliente tenia apartado.
   */
  async apartar(
    manager: EntityManager,
    idEvents: number,
    idUser: number,
    asientos: string[],
    vence: Date,
  ): Promise<void> {
    const repo = manager.getRepository(Asiento);
    // Apartados vencidos: se liberan. Y lo que este cliente tenia apartado.
    await repo.delete({
      idEvents,
      idPayment: IsNull(),
      vence: LessThanOrEqual(new Date()),
    });
    await repo.delete({ idEvents, idUser, idPayment: IsNull() });
    if (!asientos.length) return;

    this.asientosDeZona(asientos, await this.zonas(manager, idEvents));
    const tomados = await this.tomados(manager, idEvents, idUser, asientos);
    if (tomados.length) {
      throw new ConflictException(
        `${tomados.length === 1 ? 'El puesto' : 'Los puestos'} ${tomados.join(', ')} ya no ${tomados.length === 1 ? 'esta disponible' : 'estan disponibles'}`,
      );
    }
    await repo.insert(
      asientos.map((asiento) => ({
        idEvents,
        asiento,
        idUser,
        idPayment: null,
        vence,
      })),
    );
  }

  /**
   * Antes de crear el pago: las entradas de zonas con mesas deben venir con
   * sus puestos (mismo numero por tipo) y esos puestos deben estar libres o
   * apartados por el mismo cliente.
   */
  async validarCompra(
    manager: EntityManager,
    idEvents: number,
    idUser: number,
    asientos: string[],
    lineas: LineaEntradas[],
  ): Promise<void> {
    const zonas = await this.zonas(manager, idEvents);
    const conMesas = new Set(zonas.values());
    const ticketDe = this.asientosDeZona(asientos, zonas);

    const porTicket = new Map<number, number>();
    for (const idTicket of ticketDe.values())
      porTicket.set(idTicket, (porTicket.get(idTicket) ?? 0) + 1);
    const pedidos = new Map<number, number>();
    for (const l of lineas) {
      const id = l.ticket.idTicket;
      if (id !== undefined && conMesas.has(id)) {
        pedidos.set(id, (pedidos.get(id) ?? 0) + l.cantidad);
      }
    }
    const tickets = new Set([...porTicket.keys(), ...pedidos.keys()]);
    for (const id of tickets) {
      if ((porTicket.get(id) ?? 0) !== (pedidos.get(id) ?? 0)) {
        throw new BadRequestException(
          'Elige en el mapa un puesto por cada entrada con mesa (VIP, Palco...)',
        );
      }
    }

    const tomados = await this.tomados(manager, idEvents, idUser, asientos);
    if (tomados.length) {
      throw new ConflictException(
        `${tomados.join(', ')} ya no ${tomados.length === 1 ? 'esta disponible' : 'estan disponibles'}: elige otro puesto`,
      );
    }
  }

  /**
   * Venta manual del admin (taquilla) sin puestos elegidos: toma los primeros
   * puestos libres de cada entrada con mesa, asi el mapa no vende de mas.
   */
  async asignarLibres(
    manager: EntityManager,
    idEvents: number,
    idUser: number,
    lineas: LineaEntradas[],
  ): Promise<string[]> {
    const zonas = await this.zonas(manager, idEvents);
    const conMesas = new Set(zonas.values());
    const pedidos = new Map<number, number>();
    for (const l of lineas) {
      const id = l.ticket.idTicket;
      if (id !== undefined && conMesas.has(id)) {
        pedidos.set(id, (pedidos.get(id) ?? 0) + l.cantidad);
      }
    }
    if (!pedidos.size) return [];

    const ahora = new Date();
    const tomados = new Set(
      (await manager.getRepository(Asiento).find({ where: { idEvents } }))
        .filter(
          (f) =>
            f.idPayment || (f.idUser !== idUser && f.vence && f.vence > ahora),
        )
        .map((f) => f.asiento),
    );
    const elegidos: string[] = [];
    for (const [idTicket, cantidad] of pedidos) {
      const libres = PLANO.mesas
        .filter((m) => zonas.get(m.mesa) === idTicket)
        .flatMap((m) => m.asientos.map(([letra]) => `${m.mesa}${letra}`))
        .filter((a) => !tomados.has(a));
      if (libres.length < cantidad) {
        throw new ConflictException(
          `Solo quedan ${libres.length} puestos en el mapa para esa entrada`,
        );
      }
      elegidos.push(...libres.slice(0, cantidad));
    }
    return elegidos;
  }

  /** Con el pago creado, los puestos pasan de apartados a vendidos. */
  async marcarVendidos(
    manager: EntityManager,
    idEvents: number,
    idUser: number,
    asientos: string[],
    idPayment: number,
  ): Promise<void> {
    if (!asientos.length) return;
    const repo = manager.getRepository(Asiento);
    // validarCompra ya comprobo que no hay ventas ni apartados ajenos vigentes.
    await repo.delete({ idEvents, asiento: In(asientos), idPayment: IsNull() });
    await repo.insert(
      asientos.map((asiento) => ({
        idEvents,
        asiento,
        idUser,
        idPayment,
        vence: null,
      })),
    );
  }

  /**
   * Pago rechazado o borrado: sus puestos vuelven a estar libres.
   * shortcut: si luego se reactiva el pago no recupera los puestos (otro pudo
   * comprarlos); el admin debe revisarlo a mano.
   */
  async liberar(manager: EntityManager, idPayment: number): Promise<void> {
    await manager.getRepository(Asiento).delete({ idPayment });
  }

  /** Puestos vendidos de un pago, para la app de puerta y el admin. */
  async dePago(idPayment: number): Promise<string[]> {
    const filas = await this.dataSource.getRepository(Asiento).find({
      where: { idPayment },
      select: { asiento: true },
    });
    return filas
      .map((f) => f.asiento)
      .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }
}
