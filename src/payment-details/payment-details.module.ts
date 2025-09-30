import { Module, forwardRef } from '@nestjs/common';
import { PaymentDetailsService } from './payment-details.service';
import { PaymentDetailsController } from './payment-details.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentDetails } from './entities/paymentDetail.entity';
import { PaymentsModule } from '../payments/payments.module';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ConsumeDetailsModule } from '../consumeDetails/consumeDetails.module';
import { MailModule } from '../mail/mail.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentDetails]),
    forwardRef(() => PaymentsModule),
    forwardRef(() => EventsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TicketsModule),
    forwardRef(() => ConsumeDetailsModule),
    MailModule, 
  ],
  providers: [PaymentDetailsService],
  controllers: [PaymentDetailsController],
  exports: [PaymentDetailsService, TypeOrmModule],
})
export class PaymentDetailsModule {}
