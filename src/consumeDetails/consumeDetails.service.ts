import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { ConsumeDetails } from './entities/consumeDetail.entity';
import { Food } from '../food/entities/food.entity';
import { Drink } from '../drinks/entities/drink.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Event } from '../events/entities/event.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { recalculatePaymentTotals } from '../payments/payment-totals';
import { CreateConsumeDetailDto } from './dto/create-consumeDetail.dto';
import { CreatePaymentConsumoDto } from '../payments/dto/create-payment-consumo.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request';
import { fromCents, toCents } from '../common/money';
import { sumQuantitiesBy } from '../common/merge-lines';

/** Una linea de consumo ya validada, con el precio sacado de la BD. */
export interface ConsumoLine {
  food?: Food;
  drink?: Drink;
  cantidad: number;
  total: number;
}

@Injectable()
export class ConsumeDetailsService {
  constructor(
    @InjectRepository(ConsumeDetails)
    private consumeDetailsRepository: Repository<ConsumeDetails>,

    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Valida las lineas de consumo contra la BD y les pone precio. Lo usan la
   * compra (PaymentsService.create) y la correccion del admin, para que las
   * reglas sean las mismas en los dos caminos.
   */
  async resolveLines(
    manager: EntityManager,
    event: Event,
    consumos: CreatePaymentConsumoDto[],
  ): Promise<ConsumoLine[]> {
    if (consumos.length === 0) {
      return [];
    }

    if (!event.consumo) {
      throw new BadRequestException('Este evento no admite consumo');
    }

    for (const consumo of consumos) {
      if (consumo.idFood !== undefined && consumo.idDrinks !== undefined) {
        throw new BadRequestException(
          'Cada consumo debe ser una comida o una bebida, no las dos',
        );
      }
    }

    // Mismo producto en varias lineas: se juntan sumando cantidades, igual
    // que las entradas repetidas en PaymentsService.create.
    const lineas = sumQuantitiesBy(consumos, (c) =>
      c.idFood !== undefined ? `food:${c.idFood}` : `drink:${c.idDrinks}`,
    );

    const foodIds = lineas.flatMap((c) =>
      c.idFood !== undefined ? [c.idFood] : [],
    );
    const drinkIds = lineas.flatMap((c) =>
      c.idDrinks !== undefined ? [c.idDrinks] : [],
    );

    const foods = foodIds.length
      ? await manager.getRepository(Food).findBy({ idFood: In(foodIds) })
      : [];
    const drinks = drinkIds.length
      ? await manager.getRepository(Drink).findBy({ idDrinks: In(drinkIds) })
      : [];
    const foodsById = new Map(foods.map((f) => [f.idFood, f]));
    const drinksById = new Map(drinks.map((d) => [d.idDrinks, d]));

    return lineas.map((consumo) => {
      const esComida = consumo.idFood !== undefined;
      const producto = esComida
        ? foodsById.get(consumo.idFood)
        : drinksById.get(consumo.idDrinks);

      if (!producto) {
        throw new NotFoundException(
          esComida
            ? `La comida ${consumo.idFood} no existe`
            : `La bebida ${consumo.idDrinks} no existe`,
        );
      }
      if (producto.status !== 1) {
        throw new BadRequestException(
          `"${producto.description}" no esta disponible`,
        );
      }

      return {
        food: esComida ? (producto as Food) : undefined,
        drink: esComida ? undefined : (producto as Drink),
        cantidad: consumo.cantidad,
        total: fromCents(toCents(producto.price) * consumo.cantidad),
      };
    });
  }

  /** Guarda las lineas de consumo de un pago, dentro de su transaccion. */
  async createForPayment(
    manager: EntityManager,
    payment: Payment,
    lines: ConsumoLine[],
  ): Promise<ConsumeDetails[]> {
    if (lines.length === 0) {
      return [];
    }

    const repository = manager.getRepository(ConsumeDetails);
    const rows = lines.map((line) =>
      repository.create({
        idPayment: payment,
        idFood: line.food,
        idDrinks: line.drink,
        foodAmount: line.food ? line.cantidad : 0,
        drinksAmount: line.drink ? line.cantidad : 0,
        totalConsume: line.total,
      }),
    );

    return repository.save(rows);
  }

  /**
   * Correccion del admin: anade una linea de consumo a un pago que todavia
   * esta Pendiente. Antes el total lo mandaba quien llamaba (se aceptaban
   * 0,01 y valores negativos) y, sin idPayment, el consumo se pegaba a la
   * primera fila de la tabla de pagos.
   */
  async create(dto: CreateConsumeDetailDto): Promise<ConsumeDetails> {
    const { idPayment, ...consumo } = dto;

    const id = await this.dataSource.transaction(
      'READ COMMITTED',
      async (manager) => {
        const payment = await this.findEditablePayment(manager, idPayment);
        const lines = await this.resolveLines(manager, payment.idEvents, [
          consumo,
        ]);
        const [row] = await this.createForPayment(manager, payment, lines);
        await recalculatePaymentTotals(manager, payment.idPayment);
        return row.idConsumeDetails;
      },
    );

    return this.consumeDetailsRepository.findOneOrFail({
      where: { idConsumeDetails: id },
      relations: ['idFood', 'idDrinks'],
    });
  }

  async findAll(): Promise<ConsumeDetails[]> {
    return this.consumeDetailsRepository.find({
      relations: ['idFood', 'idDrinks', 'idPayment'],
    });
  }

  /**
   * Consumo de un pago. Un usuario con rol `user` solo ve el de sus pagos.
   *
   * Antes esta consulta devolvia siempre una lista vacia: la relacion se llama
   * igual que la columna (idPayment) y TypeORM mandaba el objeto
   * { idPayment: 1 } como parametro en vez del numero.
   */
  async findByPayment(
    idPayment: number,
    requester: AuthenticatedUser,
  ): Promise<ConsumeDetails[]> {
    const payment = await this.paymentRepository.findOne({
      where: { idPayment, isDeleted: false },
      relations: ['idUser'],
    });
    if (
      !payment ||
      (requester.role !== 'admin' && payment.idUser?.id !== requester.userId)
    ) {
      // 404 y no 403, para no confirmar que el pago existe.
      throw new NotFoundException('Pago no encontrado');
    }

    return this.consumeDetailsRepository
      .createQueryBuilder('cd')
      .leftJoinAndSelect('cd.idFood', 'food')
      .leftJoinAndSelect('cd.idDrinks', 'drink')
      .innerJoin('cd.idPayment', 'p')
      .where('p.idPayment = :idPayment', { idPayment })
      .orderBy('cd.idConsumeDetails', 'ASC')
      .getMany();
  }

  /** Quita una linea de consumo de un pago Pendiente y recalcula su total. */
  async remove(id: number): Promise<void> {
    await this.dataSource.transaction('READ COMMITTED', async (manager) => {
      const row = await manager.getRepository(ConsumeDetails).findOne({
        where: { idConsumeDetails: id },
        relations: ['idPayment'],
      });
      if (!row) {
        throw new NotFoundException('Detalle de consumo no encontrado');
      }

      const payment = await this.findEditablePayment(
        manager,
        row.idPayment.idPayment,
      );
      await manager.getRepository(ConsumeDetails).remove(row);
      await recalculatePaymentTotals(manager, payment.idPayment);
    });
  }

  /**
   * Carga y bloquea un pago cuyo consumo se puede corregir. Una vez aprobado,
   * la factura queda cerrada: el comprador ya transfirio ese importe.
   */
  private async findEditablePayment(
    manager: EntityManager,
    idPayment: number,
  ): Promise<Payment> {
    const payment = await manager.getRepository(Payment).findOne({
      where: { idPayment, isDeleted: false },
      relations: ['idEvents'],
      // Sin la opcion `tables` (FOR UPDATE OF ...): solo existe en PostgreSQL
      // y en MariaDB TypeORM lanza "Lock tables not supported".
      lock: { mode: 'pessimistic_write' },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    if (payment.status !== PaymentStatus.Pendiente) {
      throw new ConflictException(
        'Solo se puede corregir el consumo de un pago Pendiente',
      );
    }
    return payment;
  }
}
