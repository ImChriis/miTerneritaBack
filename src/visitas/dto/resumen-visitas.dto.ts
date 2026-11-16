import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export class ResumenVisitasDto {
  /** 1 = hoy; 7, 30 o 90 = ultimos dias contando hoy. */
  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 7, 30, 90])
  readonly dias: number = 7;
}
