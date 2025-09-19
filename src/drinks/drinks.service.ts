import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Drink } from './entities/drink.entity';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';

@Injectable()
export class DrinksService {
  constructor(
    @InjectRepository(Drink)
    private drinksRepository: Repository<Drink>,
  ) {}

  async create(createDrinkDto: CreateDrinkDto): Promise<Drink> {
    const drink = this.drinksRepository.create(createDrinkDto);
    return this.drinksRepository.save(drink);
  }

  async findAll(): Promise<Drink[]> {
    return this.drinksRepository.find();
  }

  async findOne(id: number): Promise<Drink> {
    const drink = await this.drinksRepository.findOne({ where: { id } });
    if (!drink) {
      throw new NotFoundException('Bebida no encontrada');
    }
    return drink;
  }

  async update(id: number, updateDrinkDto: UpdateDrinkDto): Promise<Drink> {
    const drink = await this.findOne(id);
    Object.assign(drink, updateDrinkDto);
    return this.drinksRepository.save(drink);
  }

  async remove(id: number): Promise<void> {
    const drink = await this.findOne(id);
    await this.drinksRepository.remove(drink);
  }
}
