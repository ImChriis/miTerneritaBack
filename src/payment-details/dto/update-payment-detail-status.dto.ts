import { IsBoolean } from 'class-validator';

export class UpdatePaymentDetailsStatusDto {
  @IsBoolean()
  readonly checked: boolean;
}
