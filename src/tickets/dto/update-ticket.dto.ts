import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsInt,
} from 'class-validator';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  readonly status?: number;

  @IsOptional()
  @IsInt()
  readonly idEvents?: number;
}
