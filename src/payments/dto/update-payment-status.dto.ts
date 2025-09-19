import { IsString, IsEnum } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsEnum(['pending', 'completed', 'cancelled'])
  readonly status: 'pending' | 'completed' | 'cancelled';
}
