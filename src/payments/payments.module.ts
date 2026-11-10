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
import { MailModule } from '../mail/mail.module';
import { Reserva } from './entities/reserva.entity';
import { ReservasController } from './reservas.controller';

@Module({
  imports: [
    // La entidad PaymentDetails vive en PaymentDetailsModule (importado abajo).
    // Antes habia una segunda clase PaymentDetails en este modulo mapeando la
    // misma tabla, con columnas distintas y sin estar registrada en el DataSource.
    TypeOrmModule.forFeature([Payment, Reserva]),
    forwardRef(() => UsersModule),
    forwardRef(() => EventsModule),
    forwardRef(() => ConsumeDetailsModule),
    PaymentDetailsModule,
    CodeModule,
    MailModule,
    MailerModule,
    ConfigModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController, ReservasController],
  exports: [PaymentsService, TypeOrmModule],
})
export class PaymentsModule {}
