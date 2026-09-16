import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { removeImageIfUnused } from '../common/uploads/upload-cleanup';
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
    const drink = await this.drinksRepository.findOne({
      where: { idDrinks: id },
    });
    if (!drink) {
      throw new NotFoundException('Bebida no encontrada');
    }
    return drink;
  }

  async update(id: number, updateDrinkDto: UpdateDrinkDto): Promise<Drink> {
    const drink = await this.findOne(id);
    const imagenAnterior = drink.image;
    Object.assign(drink, updateDrinkDto);
    const saved = await this.drinksRepository.save(drink);

    // Si se reemplazo la imagen, la anterior se borra del disco cuando ya no
    // la usa ningun otro registro.
    if (imagenAnterior !== saved.image) {
      await removeImageIfUnused(this.drinksRepository.manager, imagenAnterior);
    }
    return saved;
  }

  async remove(id: number): Promise<void> {
    const drink = await this.findOne(id);
    const imagen = drink.image;
    await this.drinksRepository.remove(drink);
    await removeImageIfUnused(this.drinksRepository.manager, imagen);
  }
}
