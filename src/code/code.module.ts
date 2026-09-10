import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Code } from './entities/code.entity';
import { CodeService } from './code.service';
import { CodeController } from './code.controller';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  // Se registran solo las entidades, no PaymentsModule: PaymentsModule importa
  // este modulo, y depender de el en ambos sentidos obligaria a un forwardRef.
  imports: [
    TypeOrmModule.forFeature([Code, Payment, PaymentDetails]),
    MailModule,
  ],
  providers: [CodeService],
  controllers: [CodeController],
  exports: [CodeService],
})
export class CodeModule {}
