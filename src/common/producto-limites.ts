/**
 * Limites de comidas y bebidas, segun las columnas reales: description y
 * detalle varchar(255), price decimal(10,2). En TiDB (modo estricto) pasarse
 * daria un 500 en vez de recortar en silencio.
 */
export const MAX_DESCRIPCION_PRODUCTO = 150;
export const MAX_DETALLE_PRODUCTO = 150;
export const MAX_PRECIO_PRODUCTO = 99_999_999.99;

/**
 * Secciones de bebidas en la carta, en el orden en que se muestran. Para
 * anadir una (p. ej. 'Cocteles') basta con agregarla aqui.
 */
export const CATEGORIAS_BEBIDA = ['Con alcohol', 'Sin alcohol'] as const;
