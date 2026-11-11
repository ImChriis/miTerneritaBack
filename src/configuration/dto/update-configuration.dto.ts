import {
  IsEmail,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
} from 'class-validator';

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
}
