import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentDetails } from './entities/paymentDetails.entity';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { ConsumeDetailsModule } from '../consumeDetails/consumeDetails.module';
import { TicketsModule } from '../tickets/tickets.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule } from '@nestjs/config';
import { PaymentDetailsModule } from 'src/payment-details/payment-details.module';

@Module({
  imports: [
  TypeOrmModule.forFeature([Payment, PaymentDetails]),
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
