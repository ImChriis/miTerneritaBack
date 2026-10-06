import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { removeImageIfUnused } from '../common/uploads/upload-cleanup';
import { Food } from './entities/food.entity';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';

@Injectable()
export class FoodService {
  constructor(
    @InjectRepository(Food)
    private foodRepository: Repository<Food>,
  ) {}

  async create(createFoodDto: CreateFoodDto): Promise<Food> {
    const food = this.foodRepository.create(createFoodDto);
    return this.foodRepository.save(food);
  }

  /**
   * Todo lo que no esta borrado, a la venta o no: el panel de admin necesita
   * ver tambien lo agotado para volver a activarlo. El menu que ve el cliente
   * es GET /events/:id/menu, que solo trae lo disponible.
   */
  async findAll(): Promise<Food[]> {
    return this.foodRepository.find({
      where: { activo: 1 },
      order: { idFood: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Food> {
    const food = await this.foodRepository.findOne({
      where: { idFood: id, activo: 1 },
    });
    if (!food) {
      throw new NotFoundException('Alimento no encontrado');
    }
    return food;
  }

  async update(id: number, updateFoodDto: UpdateFoodDto): Promise<Food> {
    const food = await this.findOne(id);
    const imagenAnterior = food.image;
    Object.assign(food, updateFoodDto);
    const saved = await this.foodRepository.save(food);

    // Si se reemplazo la imagen, la anterior se borra del disco cuando ya no
    // la usa ningun otro registro.
    if (imagenAnterior !== saved.image) {
      await removeImageIfUnused(this.foodRepository.manager, imagenAnterior);
    }
    return saved;
  }

  /**
   * Borrado logico. Antes se borraba la fila: si la comida ya se habia
   * vendido, la FK de consumedetails lo impedia (500), y de no impedirlo, las
   * facturas anteriores se quedaban sin el nombre del producto. La imagen se
   * conserva porque la fila la sigue referenciando.
   */
  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.foodRepository.update(id, { activo: 0 });
  }
}
