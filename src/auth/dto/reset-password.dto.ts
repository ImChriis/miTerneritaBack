import { IsString, Length, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(6, 6, { message: 'El código debe tener 6 dígitos.' })
  readonly code: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  readonly newPassword: string;
}
