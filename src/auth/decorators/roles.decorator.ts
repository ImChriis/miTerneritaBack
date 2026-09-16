import { SetMetadata } from '@nestjs/common';

/**
 * Roles de la aplicacion (tabla `roles`):
 * - admin:  todo, incluido el CRUD de usuarios. Aparece en todas las rutas
 *           protegidas.
 * - user:   personal. Crea eventos, entradas, comidas y bebidas, y escanea
 *           entradas en puerta. No edita ni borra, ni gestiona pagos o usuarios.
 *           Sus cuentas las crea un admin con POST /users.
 * - client: clientes que se registran solos (POST /auth/register). Compran y
 *           ven sus propios pagos.
 */
export type AppRole = 'admin' | 'user' | 'client';

// Tipado: un nombre mal escrito ('clients') falla al compilar en vez de dar
// un 403 silencioso en produccion.
export const Roles = (...roles: AppRole[]) => SetMetadata('roles', roles);
