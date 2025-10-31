import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
  const event = this.eventsRepository.create({
    name: createEventDto.name,
    description: createEventDto.description,
    date: createEventDto.date,
    time: createEventDto.time,
    room: createEventDto.room,
    capacity: createEventDto.capacity,
    status: 1, // o createEventDto.status si lo envías desde el frontend
    flyer: createEventDto.flyer,     // nombre del archivo subido
    image1: createEventDto.image1,   // nombre del archivo subido
    image2: createEventDto.image2,   // nombre del archivo subido
    image3: createEventDto.image3,   // nombre del archivo subido
  });
  return this.eventsRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    return this.eventsRepository.find();
  }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { idEvents: id } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }
    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);
    Object.assign(event, updateEventDto);
    return this.eventsRepository.save(event);
  }

  async remove(id: number): Promise<void> {
    const event = await this.findOne(id);
    await this.eventsRepository.remove(event);
  }
}
