import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { ConsumeDetailsModule } from '../consumeDetails/consumeDetails.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule } from '@nestjs/config';
import { PaymentDetailsModule } from '../payment-details/payment-details.module';
import { CodeModule } from '../code/code.module';

@Module({
  imports: [
    // La entidad PaymentDetails vive en PaymentDetailsModule (importado abajo).
    // Antes habia una segunda clase PaymentDetails en este modulo mapeando la
    // misma tabla, con columnas distintas y sin estar registrada en el DataSource.
    TypeOrmModule.forFeature([Payment]),
    forwardRef(() => UsersModule),
    forwardRef(() => EventsModule),
    forwardRef(() => ConsumeDetailsModule),
    PaymentDetailsModule,
    CodeModule,
    MailerModule,
    ConfigModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService, TypeOrmModule],
})
export class PaymentsModule {}
