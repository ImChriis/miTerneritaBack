import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FoodService } from './food.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { webpUploadOptions } from '../common/uploads/webp-upload';

@Controller('food')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get()
  async findAll() {
    return this.foodService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.foodService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('image', webpUploadOptions({ maxFiles: 1 })))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() createFoodDto: CreateFoodDto,
  ) {
    const image = file?.filename ?? createFoodDto.image;
    if (!image) {
      throw new BadRequestException('La imagen es obligatoria');
    }
    return this.foodService.create({
      ...createFoodDto,
      image,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('image', webpUploadOptions({ maxFiles: 1 })))
  async update(
    @Param(
      'id',
      new ParseIntPipe({
        exceptionFactory: () =>
          new BadRequestException(
            'El ID proporcionado en la URL debe ser un número válido',
          ),
      }),
    )
    id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() updateFoodDto: UpdateFoodDto,
  ) {
    const updateData = { ...updateFoodDto };
    if (file) {
      updateData.image = file.filename;
    }
    return this.foodService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.foodService.remove(id);
    return { message: 'Alimento eliminado correctamente' };
  }
}
