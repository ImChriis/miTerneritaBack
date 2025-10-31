import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DrinksService } from './drinks.service';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('drinks')
export class DrinksController {
  constructor(private readonly drinksService: DrinksService) {}

  @Get()
  async findAll() {
    return this.drinksService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.drinksService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './assets',
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
    }),
  )
  async create(
    @Body() createDrinkDto: CreateDrinkDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Pasa todos los datos del DTO y el nombre del archivo al service
    return this.drinksService.create({
      ...createDrinkDto,
      image: file?.originalname, // Sobrescribe el campo image con el nombre real del archivo subido
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
  FileInterceptor('image', {
    storage: diskStorage({
      destination: './assets',
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      },
    }),
  }),
)
async update(
  @Param('id', ParseIntPipe) id: number,
  @Body() updateDrinkDto: UpdateDrinkDto,
  @UploadedFile() file: Express.Multer.File,
) {
  // Si se sube una nueva imagen, actualiza el campo image con el nombre del archivo
  const updateData = {
    ...updateDrinkDto,
    ...(file && { image: file.originalname }),
  };
  return this.drinksService.update(id, updateData);
}

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.drinksService.remove(id);
    return { message: 'Bebida eliminada correctamente' };
  }
}
