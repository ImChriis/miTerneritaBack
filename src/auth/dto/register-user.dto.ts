import { CreateUserDto } from '../../users/dto/create-user.dto';

/**
 * Registro publico de clientes. Mismas reglas que el alta de personal que
 * hace un admin (POST /users); el rol `client` lo asigna AuthService.
 */
export class RegisterUserDto extends CreateUserDto {}
