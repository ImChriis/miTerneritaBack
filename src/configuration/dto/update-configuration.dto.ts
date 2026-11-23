import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsNumber,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export class DiaHorarioDto {
  @IsBoolean()
  readonly cerrado: boolean;

  @Matches(HORA, { message: 'abre debe tener formato HH:MM' })
  readonly abre: string;

  @Matches(HORA, { message: 'cierra debe tener formato HH:MM' })
  readonly cierra: string;
}

export class UpdateConfigurationDto {
  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsOptional()
  @IsString()
  readonly phone?: string;

  @IsOptional()
  @IsString()
  readonly instagram?: string;

  @IsOptional()
  @IsNumber()
  readonly tasaDolar?: number;

  @IsOptional()
  @IsNumber()
  readonly BCV?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly pmBanco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly pmCedula?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly pmTelefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly zelleTitular?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly zelleTelefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  readonly zelleCorreo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly trBanco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly trCuenta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly trRif?: string;

  /** Los 7 días, de lunes a domingo. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DiaHorarioDto)
  readonly horario?: DiaHorarioDto[];
}
