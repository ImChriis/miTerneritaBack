import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { Event } from '../events/entities/event.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { exigirConfirmacion } from '../common/confirmar-borrado';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,

    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const ticket = this.ticketsRepository.create(createTicketDto);

    return this.ticketsRepository.save(ticket);
  }

  async findAll(): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: { activo: 1 },
      relations: ['events'],
    });
  }

  async findTicketsGroupedByEvent() {
    const tickets = await this.ticketsRepository.find({
      where: { activo: 1 },
      relations: ['events'],
    });
    const groupedData = tickets.reduce(
      (acc, ticket) => {
        const event = ticket.events;

        // Si el ticket no tiene un evento asignado, lo ignoramos para este endpoint
        if (!event) return acc;

        if (!acc[event.idEvents]) {
          acc[event.idEvents] = {
            ...event,
            tickets: [], // Inicializamos el arreglo de tickets para este evento
          };
        }

        const { events: _events, ...ticketInfo } = ticket;
        acc[event.idEvents].tickets.push(ticketInfo);
        return acc;
      },
      {} as Record<number, any>,
    );
    return Object.values(groupedData);
  }

  async findTicketsByEvent(eventId: number): Promise<Ticket[]> {
    const tickets = await this.ticketsRepository.find({
      where: { idEvents: eventId, activo: 1 },
      // Puedes descomentar la siguiente línea si también quieres que te devuelva
      // los datos del evento junto con cada ticket:
      // relations: ['events'],
    });

    if (!tickets || tickets.length === 0) {
      throw new NotFoundException(
        `No se encontraron tickets para el evento con ID ${eventId}`,
      );
    }

    return tickets;
  }

  async findOne(id: number): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { idTicket: id },
      relations: ['events'],
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
      ticket.events = event;
    }

    Object.assign(ticket, updateTicketDto);

    return this.ticketsRepository.save(ticket);
  }

  async remove(id: number, confirmar = false): Promise<void> {
    const ticket = await this.findOne(id);
    // paymentdetails.idTicket es FK: con ventas el DELETE fallaba con un 500.
    const ventas = await this.ticketsRepository.manager
      .getRepository(PaymentDetails)
      .count({ where: { idTicket: id } });
    if (ventas > 0) {
      exigirConfirmacion(
        confirmar,
        `"${ticket.name}" tiene ${ventas} venta(s). Se ocultará y dejará de venderse; las entradas vendidas siguen válidas.`,
      );
      await this.ticketsRepository.update(id, { status: 0, activo: 0 });
      return;
    }
    await this.ticketsRepository.remove(ticket);
  }
}
