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
import { diskStorage } from 'multer';
import { existsSync } from 'fs';
import { basename, extname, join } from 'path';

const uploadsDir = join(process.cwd(), 'src', 'assets', 'img');

const getSafeBaseName = (value: string, fallback: string) => {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  return normalized || fallback;
};

const getUniqueFilename = (base: string, ext: string) => {
  let candidate = `${base}${ext}`;
  let index = 1;

  while (existsSync(join(uploadsDir, candidate))) {
    candidate = `${base}_${index}${ext}`;
    index += 1;
  }

  return candidate;
};

const webpFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const isWebp =
    file.mimetype === 'image/webp' &&
    file.originalname.toLowerCase().endsWith('.webp');

  if (!isWebp) {
    return callback(
      new BadRequestException('El archivo debe ser formato .webp'),
      false,
    );
  }

  return callback(null, true);
};

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
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_req, file, callback) => {
          const ext = extname(file.originalname).toLowerCase();
          const fallbackBase = basename(file.originalname, ext);
          const description =
            typeof (_req as { body?: { description?: string } }).body
              ?.description === 'string'
              ? (_req as { body?: { description?: string } }).body
                  ?.description ?? ''
              : '';
          const base = getSafeBaseName(description, fallbackBase);
          callback(null, getUniqueFilename(base, ext));
        },
      }),
      fileFilter: webpFileFilter,
    }),
  )
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFoodDto: UpdateFoodDto,
  ) {
    return this.foodService.update(id, updateFoodDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.foodService.remove(id);
    return { message: 'Alimento eliminado correctamente' };
  }
}
