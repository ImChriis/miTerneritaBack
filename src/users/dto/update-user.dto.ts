import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsInt()
  readonly id?: number;

  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly lastName?: string;

  @IsOptional()
  @IsString()
  readonly cedula?: string;

  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  readonly phone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  readonly status?: number;

  // El rol no va aqui: se cambia con PATCH /users/:id/role, que protege al
  // ultimo admin. Mandar idRol en el PUT da 400 (forbidNonWhitelisted).
}
