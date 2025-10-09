import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { Event } from '../events/entities/event.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,

    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const event = await this.eventsRepository.findOne({
      where: { idEvents: createTicketDto.idEvents },
    });
    if (!event) {
      throw new BadRequestException('Evento no encontrado');
    }

    const ticket = this.ticketsRepository.create({
      name: createTicketDto.name,
      price: createTicketDto.price,
      status: createTicketDto.status,
      event: event,
    });

    return this.ticketsRepository.save(ticket);
  }

  async findAll(): Promise<Ticket[]> {
    return this.ticketsRepository.find({ relations: ['event'] });
  }

  async findOne(id: number): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { idTicket: id },
      relations: ['event'],
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    return ticket;
  }

  async update(id: number, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);

    if (updateTicketDto.idEvents) {
      const event = await this.eventsRepository.findOne({
        where: { idEvents: updateTicketDto.idEvents },
      });
      if (!event) {
        throw new BadRequestException('Evento no encontrado');
      }
      ticket.event = event;
    }

    Object.assign(ticket, updateTicketDto);

    return this.ticketsRepository.save(ticket);
  }

  async remove(id: number): Promise<void> {
    const ticket = await this.findOne(id);
    await this.ticketsRepository.remove(ticket);
  }
}
