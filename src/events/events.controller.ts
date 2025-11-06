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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFiles } from '@nestjs/common';
import { diskStorage } from 'multer';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'flyer', maxCount: 2 },
      { name: 'image1', maxCount: 2 },
      { name: 'image2', maxCount: 2 },
      { name: 'image3', maxCount: 2 },
    ], {
      storage: diskStorage({
        destination: './assets',
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
    }),
  )
  async create(
    @Body() createEventDto: CreateEventDto,
    @UploadedFiles() files: {
      flyer?: Express.Multer.File[],
      image1?: Express.Multer.File[],
      image2?: Express.Multer.File[],
      image3?: Express.Multer.File[],
    } = {},
  ) {
    files = files || {};
    return this.eventsService.create({
      ...createEventDto,
      flyer: files.flyer?.[0]?.originalname,
      image1: files.image1?.[0]?.originalname,
      image2: files.image2?.[0]?.originalname,
      image3: files.image3?.[0]?.originalname,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'flyer', maxCount: 2 },
      { name: 'image1', maxCount: 2 },
      { name: 'image2', maxCount: 2 },
      { name: 'image3', maxCount: 2 },
    ], {
      storage: diskStorage({
        destination: './assets',
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
    @UploadedFiles() files: {
      flyer?: Express.Multer.File[],
      image1?: Express.Multer.File[],
      image2?: Express.Multer.File[],
      image3?: Express.Multer.File[],
    } = {},
  ) {
    files = files || {};
    const updateData = {
      ...updateEventDto,
      ...(files.flyer && { flyer: files.flyer[0].originalname }),
      ...(files.image1 && { image1: files.image1[0].originalname }),
      ...(files.image2 && { image2: files.image2[0].originalname }),
      ...(files.image3 && { image3: files.image3[0].originalname }),
    };
    return this.eventsService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.eventsService.remove(id);
    return { message: 'Evento eliminado correctamente' };
  }
}
