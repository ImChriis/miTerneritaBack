import {
  ClassConstructor,
  plainToInstance,
  TransformFnParams,
} from 'class-transformer';

/**
 * Lee un array de objetos que puede llegar de tres formas:
 *
 * - JSON:                          "items": [{ "idTicket": 1, "cantidad": 2 }]
 * - form-data con corchetes:       items[0][idTicket]=1, items[0][cantidad]=2
 *   (multer ya lo convierte en array, pero con los valores como texto)
 * - form-data con el array en JSON: items=[{"idTicket":1,"cantidad":2}]
 *
 * Devuelve instancias de la clase para que @ValidateNested valide cada linea
 * y sus @Type(() => Number) conviertan "1" en 1.
 */
export function formDataArray<T>(cls: ClassConstructor<T>) {
  return ({ obj, key }: TransformFnParams): unknown => {
    let value: unknown = (obj as Record<string, unknown>)[key];

    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        // No es JSON: se deja tal cual y @IsArray lo rechaza con un 400.
        return value;
      }
    }

    return Array.isArray(value)
      ? value.map((item) => plainToInstance(cls, item))
      : value;
  };
}
