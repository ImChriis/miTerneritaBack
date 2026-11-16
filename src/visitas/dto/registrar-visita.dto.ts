import { IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { PASOS_EMBUDO } from '../entities/visita-paso.entity';

/** Latido o navegacion del sitio publico. Sin `paso` = solo latido. */
export class RegistrarVisitaDto {
  @IsUUID()
  readonly visitante: string;

  @IsUUID()
  readonly sesion: string;

  /** Pagina vista: un paso de la compra, el inicio u otra. */
  @IsOptional()
  @IsIn([...PASOS_EMBUDO, 'inicio', 'otra'])
  readonly paso?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly idEvents?: number;
}
