import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const food = this.foodRepository.create({
      description: createFoodDto.description,
      price: createFoodDto.price,
      status: 1, // o createFoodDto.status si lo envías desde el frontend
      image: createFoodDto.image, // aquí ya viene el nombre del archivo subido
    });
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
    Object.assign(food, updateFoodDto);
    return this.foodRepository.save(food);
  }

  async remove(id: number): Promise<void> {
    const food = await this.findOne(id);
    await this.foodRepository.remove(food);
  }
}
