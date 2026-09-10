import { IsString, Length } from 'class-validator';

export class ValidateCodeDto {
  /** El token que lleva codificado el QR de la entrada. */
  @IsString()
  @Length(32, 128)
  readonly token: string;
}
