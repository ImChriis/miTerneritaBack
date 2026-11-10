import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PUESTOS } from '../entities/postulacion.entity';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Formulario público "Trabaja con nosotros". Los MaxLength son los de la tabla. */
export class CreatePostulacionDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly nombre: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly apellido: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(13)
  readonly cedula: string;

  @Transform(recortar)
  @IsEmail()
  @MaxLength(80)
  readonly email: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly telefono: string;

  @IsIn(PUESTOS, { message: `puesto debe ser uno de: ${PUESTOS.join(', ')}` })
  readonly puesto: string;

  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly mensaje?: string;
}
