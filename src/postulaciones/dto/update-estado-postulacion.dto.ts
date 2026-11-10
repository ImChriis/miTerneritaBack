import { IsIn } from 'class-validator';
import { ESTADOS_POSTULACION } from '../entities/postulacion.entity';

export class UpdateEstadoPostulacionDto {
  @IsIn(ESTADOS_POSTULACION, {
    message: `estado debe ser uno de: ${ESTADOS_POSTULACION.join(', ')}`,
  })
  readonly estado: string;
}
