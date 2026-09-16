import { IsString, IsEmail, MinLength, MaxLength } from 'class-validator';

/**
 * Datos para crear una cuenta. Lo usan los dos caminos de alta:
 * - POST /auth/register: clientes que se registran solos (via RegisterUserDto)
 * - POST /users: un admin da de alta una cuenta de personal (rol `user`)
 *
 * El rol y el estado no se reciben: los pone el backend. Con el
 * ValidationPipe global (forbidNonWhitelisted), mandar idRol o status da 400,
 * asi nadie puede crearse una cuenta de admin por esta via.
 *
 * Los MaxLength son los de las columnas reales de `users`. El servidor MySQL
 * corre sin modo estricto y recortaba en silencio lo que no cabia: un email
 * de mas de 80 caracteres se guardaba cortado y ya no se podia iniciar sesion.
 */
export class CreateUserDto {
  @IsString()
  @MaxLength(15)
  readonly phone?: string;

  @IsString()
  @MaxLength(25)
  readonly name: string;

  @IsString()
  @MaxLength(25)
  readonly lastName: string;

  @IsString()
  @MaxLength(13)
  readonly cedula: string;

  @IsEmail()
  @MaxLength(80)
  readonly email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  readonly password: string;
}
