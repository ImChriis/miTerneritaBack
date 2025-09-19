import { IsBoolean } from 'class-validator';

export class UpdatePaymentDetailsStatusDto {
  @IsBoolean()
  readonly scanned: boolean;
}
