import { IsEnum, IsInt } from 'class-validator';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export class UpdatePaymentStatusDto {
  @IsInt()
  @IsEnum(PaymentStatus)
  readonly status: PaymentStatus;
}
