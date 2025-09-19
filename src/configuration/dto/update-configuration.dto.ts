import {
  IsEmail,
  IsOptional,
  IsString,
  IsDecimal,
  IsNumber,
  Min,
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
  @IsString()
  readonly BCV?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly Dolar?: number;
}
