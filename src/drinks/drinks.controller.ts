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
import { DrinksService } from './drinks.service';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { webpUploadOptions } from '../common/uploads/webp-upload';

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
  @UseInterceptors(FileInterceptor('image', webpUploadOptions({ maxFiles: 1 })))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() createDrinkDto: CreateDrinkDto,
  ) {
    const image = file?.filename ?? createDrinkDto.image;
    if (!image) {
      throw new BadRequestException('La imagen es obligatoria');
    }
    return this.drinksService.create({
      ...createDrinkDto,
      image,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('image', webpUploadOptions({ maxFiles: 1 })))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() updateDrinkDto: UpdateDrinkDto,
  ) {
    const image = file?.filename;
    return this.drinksService.update(id, {
      ...updateDrinkDto,
      ...(image ? { image } : {}),
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.drinksService.remove(id);
    return { message: 'Bebida eliminada correctamente' };
  }
}
