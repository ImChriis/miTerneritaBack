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
import { webpUploadOptions } from '../common/uploads/webp-upload';


@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll() {
    return this.eventsService.findAll();
  }

  // @Get('tickets')
  // async findTicketOptions() {
  //   return this.eventsService.findTicketOptions();
  // }

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
      webpUploadOptions({ maxFiles: 6, suffixWithFieldName: true }),
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
      webpUploadOptions({ maxFiles: 6, suffixWithFieldName: true }),
    ),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles()
    files: {
      flyer?: Express.Multer.File[];
      image1?: Express.Multer.File[];
      image2?: Express.Multer.File[];
      image3?: Express.Multer.File[];
      imageL?: Express.Multer.File[];
      imageS?: Express.Multer.File[];
    },
    @Body() updateEventDto: UpdateEventDto,
  ) {
    const flyer = files?.flyer?.[0]?.filename ?? updateEventDto.flyer;
    const image1 = files?.image1?.[0]?.filename ?? updateEventDto.image1;
    const image2 = files?.image2?.[0]?.filename ?? updateEventDto.image2;
    const image3 = files?.image3?.[0]?.filename ?? updateEventDto.image3;

    return this.eventsService.update(id, {
      ...updateEventDto,
      ...(flyer && { flyer }),
      ...(image1 && { image1 }),
      ...(image2 && { image2 }),
      ...(image3 && { image3 }),
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.eventsService.remove(id);
    return { message: 'Evento eliminado correctamente' };
  }
}
