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
import { diskStorage } from 'multer';
import { existsSync } from 'fs';
import { basename, extname, join } from 'path';

const uploadsDir = join(process.cwd(), 'src', 'assets', 'img');

// Limite de tamano por archivo. Sin esto multer acepta subidas de cualquier
// tamano y las escribe en disco antes de que el controlador pueda rechazarlas.
const uploadLimits = { fileSize: 5 * 1024 * 1024, files: 1 };

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
      limits: uploadLimits,
    }),
  )
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
      limits: uploadLimits,
    }),
  )
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
