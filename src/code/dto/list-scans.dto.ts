import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * GET /code/scans. El personal solo ve sus propios escaneos (la lista de
 * "ultimos escaneos" de la app, para deshacer); el admin ve todos.
 */
export class ListScansQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idEvents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idPayment?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  readonly limit?: number;
}
