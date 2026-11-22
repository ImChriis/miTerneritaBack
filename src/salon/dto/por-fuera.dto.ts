import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsString,
  MaxLength,
} from 'class-validator';

/** Puestos ("5A") que el admin marca como vendidos por fuera, o libera. */
export class PorFueraDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(400)
  @IsString({ each: true })
  @MaxLength(5, { each: true })
  readonly asientos: string[];

  @IsBoolean()
  readonly vendido: boolean;
}
