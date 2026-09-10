import { IsEnum } from 'class-validator';
import { PaymentStatus } from '../enums/payment-status.enum';

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus, {
    message: `status debe ser uno de: ${Object.values(PaymentStatus).join(', ')}`,
  })
  readonly status: PaymentStatus;
}
