import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Min } from 'class-validator';

/** POST /code/buscar: la puerta busca la entrada por cedula o numero de compra. */
export class BuscarEntradaDto {
  @IsString()
  @Length(1, 30)
  readonly q: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idEvents: number;
}
