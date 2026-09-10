import { User } from '../entities/user.entity';

/**
 * Forma publica de un usuario. Nunca incluye password ni los campos de
 * recuperacion de contrasena.
 */
export class UserResponseDto {
  id?: number;
  name?: string;
  lastName?: string;
  cedula?: string;
  email?: string;
  phone?: string;
  status?: number;
  fechaRegistro?: Date;
  roleName?: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }

  /**
   * Construye la respuesta a partir de la entidad. Este mapeo estaba repetido
   * cuatro veces en UsersController.
   */
  static fromUser(user: User & { roleName?: string | null }): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      cedula: user.cedula,
      email: user.email,
      phone: user.phone,
      status: user.status,
      fechaRegistro: user.fechaRegistro,
      roleName: user.roleName ?? '',
    });
  }
}
