import { Food } from '../food/entities/food.entity';
import { Drink } from '../drinks/entities/drink.entity';

/**
 * Cuando se puede pre-ordenar un producto. Es la unica definicion: la usan el
 * menu que ve el cliente (GET /events/:id/menu) y la compra, para que nunca se
 * pueda comprar algo que el menu no ofrece.
 *
 * - status: lo cambia el admin para marcarlo agotado o no disponible.
 * - activo: 0 cuando el admin lo borra. No se borra la fila porque las
 *   facturas de compras anteriores siguen apuntando a ella.
 */
export const PRODUCTO_DISPONIBLE = { status: 1, activo: 1 } as const;

export const productoDisponible = (producto: Food | Drink) =>
  producto.status === PRODUCTO_DISPONIBLE.status &&
  producto.activo === PRODUCTO_DISPONIBLE.activo;

/** Una tarjeta del menu: lo justo para pintarla y anadirla al carrito. */
export interface ProductoMenu {
  /**
   * Solo viene uno de los dos. Al pagar se copia tal cual en `consumos`:
   * { idFood, cantidad } o { idDrinks, cantidad }.
   */
  idFood?: number;
  idDrinks?: number;
  nombre: string;
  /** Descripcion corta o variante; null si no tiene. */
  descripcion: string | null;
  precioUsd: number;
  /** Archivo en /assets/img; null si no tiene foto. */
  imagen: string | null;
  /** Botellas: personas a las que da acceso General. 0 = no incluye acceso. */
  personas: number;
}

export interface SeccionMenu {
  nombre: string;
  productos: ProductoMenu[];
}

/** Lo que el cliente puede pre-ordenar en un evento. */
export interface MenuEvento {
  idEvents: number;
  /** El admin activo el consumo para este evento. */
  consumo: boolean;
  /** 'Comidas' y luego una por categoria de bebida, sin secciones vacias. */
  secciones: SeccionMenu[];
}
