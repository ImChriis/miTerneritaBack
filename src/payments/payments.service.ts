import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { ConsumeDetails } from '../consumeDetails/entities/consumeDetail.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDetailsService } from '../payment-details/payment-details.service';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { MailService } from '../mail/mail.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,

    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,

    @InjectRepository(ConsumeDetails)
    private consumeDetailsRepository: Repository<ConsumeDetails>,

    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,

    @InjectRepository(PaymentDetails)
    private paymentDetailsRepository: Repository<PaymentDetails>,

    private readonly dataSource: DataSource,

    private readonly paymentDetailsService: PaymentDetailsService,

    private readonly mailService: MailService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, file?: Express.Multer.File): Promise<Payment> {
    if (!createPaymentDto) {
      throw new BadRequestException('No se recibió el body de la petición o está vacío');
    }
    const {
      idUser,
      idEvents,
      idConsumeDetails,
      idTicket,
      ticketNum,
      noDocumento,
      date,
      totalGeneral,
      tasaDolar,
      montoDolar,
      comprobante,
      banco,
      referencia,
      fechaTransferencia,
      status,
    } = createPaymentDto;

    // Garantizar que sean arrays (defensa contra problemas de transformación)
    const ticketsIds = Array.isArray(idTicket) ? idTicket : [idTicket];
    const ticketsQuantities = Array.isArray(ticketNum) ? ticketNum : [ticketNum];

    // Validar arrays
    // if (ticketsIds.length !== ticketsQuantities.length) {
    //   throw new BadRequestException('La cantidad de tickets y cantidades no coinciden');
    // }

    const totalTickets = ticketsQuantities.reduce((a, b) => Number(a) + Number(b), 0);

    // Validar cantidad de tickets
    if (totalTickets < 1 || totalTickets > 10) {
      throw new BadRequestException('Solo puedes comprar entre 1 y 10 entradas');
    }

    // Validar y obtener entidades relacionadas
    const user = await this.usersRepository.findOneBy({ id: idUser });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const event = await this.eventsRepository.findOneBy({ idEvents });
    if (!event) throw new NotFoundException('Evento no encontrado');

    const tickets = await this.ticketsRepository.find({
      where: { idTicket: In(ticketsIds), event: { idEvents } },
      relations: ['event'],
    });

    const ticketsMap = new Map(tickets.map(t => [t.idTicket, t]));

    let consumeDetails: ConsumeDetails | undefined;
    if (idConsumeDetails) {
      const found = await this.consumeDetailsRepository.findOneBy({ idConsumeDetails });
      if (!found) throw new NotFoundException('ConsumeDetails no encontrado');
      consumeDetails = found;
    }

    // Transacción para crear Payment y PaymentDetails
    return this.dataSource.transaction(async (manager) => {
      // Sanitizar y preparar valores opcionales/fechas
      const parseDateSafe = (val: any): Date => {
        if (!val) return new Date();
        if (val instanceof Date && !isNaN(val.getTime())) return val;
        if (typeof val === 'string') {
          const parsed = Date.parse(val);
          if (!isNaN(parsed)) return new Date(parsed);
          const parts = val.split('-');
          if (parts.length === 3) {
            const [y, m, d] = parts.map((p) => parseInt(p, 10));
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m - 1, d);
          }
        }
        return new Date();
      };
      const toOptionalString = (v: any): string | null => {
        if (v == null) return null;
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return String(v);
        return null;
      };

      let safeNoDocumento = toOptionalString(noDocumento);
      if (!safeNoDocumento) {
        // Buscar el último payment con noDocumento no vacío
        const lastPayment = await manager.findOne(Payment, {
          where: { noDocumento: Not('') },
          order: { idPayment: 'DESC' },
        });
        let lastNoDoc = 0;
        if (lastPayment && lastPayment.noDocumento && !isNaN(Number(lastPayment.noDocumento))) {
          lastNoDoc = Number(lastPayment.noDocumento);
        }
        safeNoDocumento = String(lastNoDoc + 1);
      }
      const safeDate = parseDateSafe(date);
      let safeComprobante = toOptionalString(comprobante);
      const safeBanco = toOptionalString(banco);
      const safeReferencia = toOptionalString(referencia);
      const safeFechaTransferencia = fechaTransferencia ? parseDateSafe(fechaTransferencia) : null;

      // Manejo del archivo de comprobante
      if (file) {
        const fileExt = path.extname(file.originalname);
        const fileName = `${user.name}_${user.lastName}_${user.cedula}_${event.name}${fileExt}`.replace(/\s+/g, '_');
        const uploadDir = path.join(process.cwd(), 'assets', 'img');
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, file.buffer);
        
        safeComprobante = fileName;
      }

      // Crear Payment
      const paymentData: any = {
        idUser: user,
        idEvents: event,
        idConsumeDetails: consumeDetails ?? null,
        noDocumento: safeNoDocumento,
        date: safeDate,
        totalGeneral,
        tasaDolar,
        montoDolar,
        comprobante: safeComprobante,
        banco: safeBanco,
        referencia: safeReferencia,
        fechaTransferencia: safeFechaTransferencia,
        status: PaymentStatus.PENDING,
      };
      const payment = manager.create(Payment, paymentData);

      const savedPayment = await manager.save(payment);

      let calculatedTotal = 0;
      for (let i = 0; i < ticketsIds.length; i++) {
        const tId = ticketsIds[i];
        const qty = ticketsQuantities[i];
        const ticket = ticketsMap.get(tId);
        if (ticket) {
          calculatedTotal += ticket.price * qty;
        }
      }

      const ratio = (totalGeneral && calculatedTotal > 0) ? totalGeneral / calculatedTotal : 1;
      const tasaDolarEvento = tasaDolar ?? 0;
      const totalDolarEventoPorTicket = (montoDolar && totalTickets > 0) ? montoDolar / totalTickets : 0;

      const paymentDetailsToSave: PaymentDetails[] = [];
      let currentTicketSeq = 1;

      for (let i = 0; i < ticketsIds.length; i++) {
        const tId = ticketsIds[i];
        const qty = ticketsQuantities[i];
        const ticket = ticketsMap.get(tId);

        if (!ticket) continue;

        const precioPorTicket = ticket.price;
        const totalBasePorTicket = precioPorTicket * ratio;
        const impuestoCalculadoPorTicket = 0; 
        const totalPorTicket = precioPorTicket; // Debería ser precioPorTicket * ratio si totalGeneral es diferente? Asumimos precio lista.

        for (let k = 0; k < qty; k++) {
          const paymentDetail = manager.create(PaymentDetails, {
            payment: savedPayment,
            idEvent: event,
            idUser: user,
            ticketNum: currentTicketSeq++, 
            precio: precioPorTicket,
            totalBase: totalBasePorTicket,
            impuestoCalculado: impuestoCalculadoPorTicket,
            total: totalPorTicket,
            tasaDolarEvento: tasaDolarEvento,
            totalDolarEvento: totalDolarEventoPorTicket,
            idTicket: ticket,
            idConsumeDetails: consumeDetails,
            status: PaymentStatus.PENDING, 
            checked: false,
          });
          paymentDetailsToSave.push(paymentDetail);
        }
      }

      await manager.save(PaymentDetails, paymentDetailsToSave);

      this.logger.log(
        `Payment ID ${savedPayment.idPayment} creado con ${totalTickets} PaymentDetails`,
      );

      // Adjuntar detalles en la respuesta para que el frontend vea ticketNum y cantidad de tickets
      savedPayment.paymentDetails = paymentDetailsToSave;

      // Agregar ticketNum y cantidad de tickets a la respuesta
      // ticketNum: arreglo de los ticketNum generados
      const ticketNums = paymentDetailsToSave.map(pd => pd.ticketNum);
      // cantidadTickets: total de tickets comprados
      const cantidadTickets = ticketNums.length;

      // Devolver el payment con los campos extra para el frontend
      return {
        ...savedPayment,
        ticketNum: ticketNums,
        cantidadTickets,
        noDocumento: savedPayment.noDocumento,
      };
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment: id, isDeleted: false },
      relations: ['idUser', 'idEvents', 'consumeDetails', 'paymentDetails'],
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where : { isDeleted: false },
      relations: ['idUser', 'idEvents', 'consumeDetails', 'paymentDetails'],
    });
  }

  async updateStatus(id: number, updatePaymentStatusDto: UpdatePaymentStatusDto): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment: id, isDeleted: false },
      relations: ['idUser', 'idEvents', 'idConsumeDetails', 'paymentDetails', 'paymentDetails.idTicket', 'paymentDetails.idUser', 'paymentDetails.idEvent'],
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const prevStatus = payment.status;
    payment.status = updatePaymentStatusDto.status;

    const updatedPayment = await this.paymentsRepository.save(payment);

    this.logger.log(`Actualizando estado de pago ${id}. Anterior: ${prevStatus}, Nuevo: ${updatePaymentStatusDto.status}`);

    // Si el status cambió a 'Aprobado' (desde cualquier estado, o restringir si es necesario)
    // Antes era solo desde PENDING, pero si se reactiva un pago rechazado, también debería enviarse?
    // Por ahora mantenemos la lógica de PENDING -> APPROVED, pero agregamos logs.
    if (updatePaymentStatusDto.status === PaymentStatus.APPROVED) {
       if (prevStatus !== PaymentStatus.APPROVED) {
          // Actualizar estado de los detalles y enviar correo con QRs
          if (payment.paymentDetails && payment.paymentDetails.length > 0) {
            this.logger.log(`Enviando correo de confirmación para pago ${id} con ${payment.paymentDetails.length} detalles`);
            for (const detail of payment.paymentDetails) {
              detail.status = PaymentStatus.APPROVED;
            }
            await this.paymentDetailsRepository.save(payment.paymentDetails);
            
            // Enviar correo con todos los tickets
            await this.mailService.sendTicketScannedConfirmation(payment);
          } else {
             this.logger.warn(`Pago ${id} aprobado pero no tiene detalles de pago (tickets) asociados.`);
          }
       }
    }

    // Si el status cambió de 'Pendiente' a 'Aprobado' (Lógica original para crear el detalle resumen)
    if (prevStatus === PaymentStatus.PENDING && updatePaymentStatusDto.status === PaymentStatus.APPROVED) {

      // Obtén datos de ConsumeDetails si existen
      const consumeDetails = payment.idConsumeDetails;

      // Construye el DTO para PaymentDetails
      // NOTA: Esto crea un registro "resumen" o adicional. Verificar si es redundante con los creados en create().
      const paymentDetailsDto = {
        idPayment: payment.idPayment,
        idEvents: payment.idEvents.idEvents,
        idUser: payment.idUser.id,
        ticketNum: 0, 
        precio: payment.totalGeneral ?? 0, 
        totalBase: payment.totalBaseImponible ?? 0,
        impuestoCalculado: payment.impuestoBaseImponible ?? 0,
        total: payment.totalGeneral ?? 0,
        tasaDolarEvento: payment.tasaDolar ?? 0,
        totalDolarEvento: payment.montoDolar ?? 0,
        idTicket: 0, // No hay relación directa, asigna 0
        idConsumeDetails: consumeDetails?.idConsumeDetails ?? 0,
        status: PaymentStatus.APPROVED, 
        checked: false,
        quantity: 1, 
      };

      await this.paymentDetailsService.create(paymentDetailsDto);
      this.logger.log(`Detalles de pago insertados para el pago aprobado ID ${id}`);
    }

    return updatedPayment;
  }

  async softDelete(id: number): Promise<void> {
    const payment = await this.paymentsRepository.findOne({ 
      where: { idPayment: id, isDeleted: false } 
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    payment.isDeleted = true;
    await this.paymentsRepository.save(payment);
    this.logger.log(`Pago ID ${id} marcado como eliminado`);
  }
}
