import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  readonly status?: number;
}
