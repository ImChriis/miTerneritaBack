import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Alta de un cliente por el personal (registro asistido): sin contraseña y con el
 * correo opcional, para personas que no usan la web. Si algún día quieren entrar,
 * usan "¿Olvidaste tu contraseña?" con su correo.
 */
export class ClienteRapidoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(25)
  readonly name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(25)
  readonly lastName: string;

  /** "V-12345678", "E-..." o "J-...". */
  @Matches(/^[VEJ]-\d{5,10}$/, {
    message: 'La cédula debe tener el formato V-12345678',
  })
  readonly cedula: string;

  @IsString()
  @Matches(/^[0-9+\s-]{7,15}$/, { message: 'Teléfono no válido' })
  readonly phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'Correo no válido' })
  @MaxLength(80)
  readonly email?: string;
}
