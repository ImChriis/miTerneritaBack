import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { ConsumeDetails } from '../consumeDetails/entities/consumeDetail.entity';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { ConsumeDetailsModule } from '../consumeDetails/consumeDetails.module';
import { TicketsModule } from '../tickets/tickets.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule } from '@nestjs/config';
import { PaymentDetailsModule } from '../payment-details/payment-details.module';

@Module({
  imports: [
  TypeOrmModule.forFeature([Payment, PaymentDetails, Ticket, User, Event, ConsumeDetails]),
    forwardRef(() => UsersModule),
    forwardRef(() => EventsModule),
    forwardRef(() => ConsumeDetailsModule),
    forwardRef(() => TicketsModule),
    PaymentDetailsModule,
    MailerModule,
    ConfigModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService, TypeOrmModule],
})
export class PaymentsModule {}
