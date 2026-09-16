import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { removeImageIfUnused } from '../common/uploads/upload-cleanup';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const EVENT_IMAGES = ['flyer', 'image1', 'image2', 'image3'] as const;

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const event = this.eventsRepository.create(createEventDto);
    return this.eventsRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    return this.eventsRepository.find();
  }

  // async findTicketOptions(): Promise<
  //   Array<{ idTicket: number; name: string; price: number; status: number }>
  // > {
  //   return this.eventsRepository.manager.query(
  //     'SELECT idTicket, name, price, status FROM ticket WHERE status = 1 ORDER BY idTicket',
  //   );
  // }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { idEvents: id },
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }
    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);
    const anteriores = EVENT_IMAGES.map((campo) => event[campo]);
    Object.assign(event, updateEventDto);
    const saved = await this.eventsRepository.save(event);

    // Las imagenes reemplazadas se borran del disco cuando ya no las usa
    // ningun otro registro.
    for (const [i, campo] of EVENT_IMAGES.entries()) {
      if (anteriores[i] !== saved[campo]) {
        await removeImageIfUnused(this.eventsRepository.manager, anteriores[i]);
      }
    }
    return saved;
  }

  async remove(id: number): Promise<void> {
    const event = await this.findOne(id);
    const imagenes = EVENT_IMAGES.map((campo) => event[campo]);
    await this.eventsRepository.remove(event);
    for (const imagen of imagenes) {
      await removeImageIfUnused(this.eventsRepository.manager, imagen);
    }
  }
}
