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

  /**
   * Todo lo que no esta borrado, a la venta o no: el panel de admin necesita
   * ver tambien lo agotado para volver a activarlo. El menu que ve el cliente
   * es GET /events/:id/menu, que solo trae lo disponible.
   */
  async findAll(): Promise<Drink[]> {
    return this.drinksRepository.find({
      where: { activo: 1 },
      order: { idDrinks: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Drink> {
    const drink = await this.drinksRepository.findOne({
      where: { idDrinks: id, activo: 1 },
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

  /**
   * Borrado logico. Antes se borraba la fila: si la bebida ya se habia
   * vendido, la FK de consumedetails lo impedia (500), y de no impedirlo, las
   * facturas anteriores se quedaban sin el nombre del producto. La imagen se
   * conserva porque la fila la sigue referenciando.
   */
  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.drinksRepository.update(id, { activo: 0 });
  }
}
