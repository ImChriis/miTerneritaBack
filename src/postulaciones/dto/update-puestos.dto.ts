import { IsArray, IsIn } from 'class-validator';
import { PUESTOS } from '../entities/postulacion.entity';

export class UpdatePuestosDto {
  @IsArray()
  @IsIn(PUESTOS, {
    each: true,
    message: `puesto debe ser uno de: ${PUESTOS.join(', ')}`,
  })
  readonly abiertos: string[];
}
