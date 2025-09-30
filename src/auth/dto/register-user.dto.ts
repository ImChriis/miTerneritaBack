import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterUserDto {
  @IsString()
  readonly phone?: string;
  @IsString()
  readonly name: string;

  @IsString()
  readonly lastName: string;

  @IsString()
  readonly cedula: string;

  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  readonly password: string;
}
