/**
 * Limites de comidas y bebidas, segun las columnas reales: description
 * varchar(255) y price decimal(10,2). En TiDB (modo estricto) pasarse daria un
 * 500 en vez de recortar en silencio.
 */
export const MAX_DESCRIPCION_PRODUCTO = 150;
export const MAX_PRECIO_PRODUCTO = 99_999_999.99;
