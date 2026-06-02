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
  UploadedFiles,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll() {
    return this.eventsService.findAll();
  }

  @Get('tickets')
  async findTicketOptions() {
    return this.eventsService.findTicketOptions();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id);
  }


  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'flyer', maxCount: 1 },
        { name: 'image1', maxCount: 1 },
        { name: 'image2', maxCount: 1 },
        { name: 'image3', maxCount: 1 },
        { name: 'imageL', maxCount: 1 },
        { name: 'imageS', maxCount: 1 },
      ],
      {
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
            const compositeBase = `${base}-${file.fieldname}`;
            callback(null, getUniqueFilename(compositeBase, ext));
          },
        }),
        fileFilter: webpFileFilter,
      },
    ),
  )
  async create(
    @UploadedFiles()
    files: {
      flyer?: Express.Multer.File[];
      image1?: Express.Multer.File[];
      image2?: Express.Multer.File[];
      image3?: Express.Multer.File[];
      imageL?: Express.Multer.File[];
      imageS?: Express.Multer.File[];
    },
    @Body() createEventDto: CreateEventDto,
  ) {
    const flyer = files?.flyer?.[0]?.filename ?? createEventDto.flyer;
    const image1 = files?.image1?.[0]?.filename ?? createEventDto.image1;
    const image2 = files?.image2?.[0]?.filename ?? createEventDto.image2;
    const image3 = files?.image3?.[0]?.filename ?? createEventDto.image3;

    if (!flyer || !image1 || !image2 || !image3) {
      throw new BadRequestException(
        'Todas las imagenes y el flyer son obligatorios',
      );
    }

    return this.eventsService.create({
      ...createEventDto,
      flyer,
      image1,
      image2,
      image3,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.eventsService.remove(id);
    return { message: 'Evento eliminado correctamente' };
  }
}
