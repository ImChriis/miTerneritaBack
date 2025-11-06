import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsOptional()
  readonly description?: string;

  @IsDateString()
  readonly date: string;

  @IsString()
  @Matches(/^([0][1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, {
    message: 'La hora debe estar en formato 12 horas (hh:mm AM/PM)',
  })
  readonly time: string;

  @IsString()
  @IsOptional()
  readonly room?: string;

  @IsInt()
  @Min(1)
  readonly capacity: number;

  @IsString()
  @IsOptional()
  readonly flyer?: string;

  @IsString()
  @IsOptional()
  readonly image1?: string;

  @IsString()
  @IsOptional()
  readonly image2?: string;

  @IsString()
  @IsOptional()
  readonly image3?: string;

  @IsInt()
  readonly status: number;
}
