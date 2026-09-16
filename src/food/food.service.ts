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

  async findAll(): Promise<Food[]> {
    return this.foodRepository.find();
  }

  async findOne(id: number): Promise<Food> {
    const food = await this.foodRepository.findOne({ where: { idFood: id } });
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

  async remove(id: number): Promise<void> {
    const food = await this.findOne(id);
    const imagen = food.image;
    await this.foodRepository.remove(food);
    await removeImageIfUnused(this.foodRepository.manager, imagen);
  }
}
