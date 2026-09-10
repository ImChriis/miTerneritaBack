import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ConsumeDetails } from './entities/consumeDetail.entity';
import { Food } from '../food/entities/food.entity';
import { Drink } from '../drinks/entities/drink.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CreateConsumeDetailDto } from './dto/create-consumeDetail.dto';

@Injectable()
export class ConsumeDetailsService {
  constructor(
    @InjectRepository(ConsumeDetails)
    private consumeDetailsRepository: Repository<ConsumeDetails>,

    @InjectRepository(Food)
    private foodRepository: Repository<Food>,

    @InjectRepository(Drink)
    private drinkRepository: Repository<Drink>,

    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async create(
    createConsumeDetailDto: CreateConsumeDetailDto,
    manager?: EntityManager,
  ): Promise<ConsumeDetails> {
    const { idFood, idDrinks, idPayment, totalConsume } =
      createConsumeDetailDto;

    const consumeDetailsRepository = manager
      ? manager.getRepository(ConsumeDetails)
      : this.consumeDetailsRepository;
    const foodRepository = manager
      ? manager.getRepository(Food)
      : this.foodRepository;
    const drinkRepository = manager
      ? manager.getRepository(Drink)
      : this.drinkRepository;
    const paymentRepository = manager
      ? manager.getRepository(Payment)
      : this.paymentRepository;

    // Es completamente opcional tener idFood o idDrink

    if (idFood && idDrinks) {
      throw new BadRequestException(
        'No puede especificar idFood y idDrink al mismo tiempo',
      );
    }

    const payment = await paymentRepository.findOne({
      where: { idPayment: idPayment },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    let food: Food | null = null;
    let drink: Drink | null = null;

    if (idFood) {
      food = await foodRepository.findOne({ where: { idFood: idFood } });
      if (!food) {
        throw new NotFoundException('Alimento no encontrado');
      }
    }

    if (idDrinks) {
      drink = await drinkRepository.findOne({ where: { idDrinks: idDrinks } });
      if (!drink) {
        throw new NotFoundException('Bebida no encontrada');
      }
    }

    const consumeDetails = consumeDetailsRepository.create({
      idFood: food ?? undefined,
      idDrinks: drink ?? undefined,
      idPayment: payment,
      foodAmount: createConsumeDetailDto.foodAmount ?? 0,
      drinksAmount: createConsumeDetailDto.drinksAmount ?? 0,
      totalConsume: totalConsume ?? 0,
    });

    return consumeDetailsRepository.save(consumeDetails);
  }

  async findAll(): Promise<ConsumeDetails[]> {
    return this.consumeDetailsRepository.find({
      relations: ['idFood', 'idDrinks', 'idPayment'],
    });
  }

  async findByPayment(idPayment: number): Promise<ConsumeDetails[]> {
    return this.consumeDetailsRepository.find({
      where: { idPayment: { idPayment: idPayment } },
      relations: ['idFood', 'idDrinks', 'idPayment'],
    });
  }

  async remove(id: number): Promise<void> {
    const consumeDetails = await this.consumeDetailsRepository.findOne({
      where: { idConsumeDetails: id },
    });
    if (!consumeDetails) {
      throw new NotFoundException('Detalle de consumo no encontrado');
    }
    await this.consumeDetailsRepository.remove(consumeDetails);
  }
}
