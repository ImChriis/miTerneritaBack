import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class CreateCodeDto {
  @IsString()
  @IsNotEmpty()
  readonly QR: string;

  @IsInt()
  readonly idPayment: number;
}
