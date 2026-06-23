import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const passwordValid = await bcrypt.compare(password, user.password!);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return user;
  }

  async login(user: any) {
    const roleName = await this.usersService.getRoleNameByIdRol(user.idRol);
    const payload = { email: user.email, sub: user.id, role: roleName };
    return {
      name: user.name,
      email: user.email,
      role: roleName,
      lastName: user.lastName,
      cedula: user.cedula,
      phone: user.phone,
      status: user.status,
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    // Validar correo duplicado
    const existingUserByEmail = await this.usersService.findByEmail(registerUserDto.email);
    if (existingUserByEmail) {
      throw new BadRequestException('El correo electrónico ya está registrado. Por favor, utiliza otro.');
    }

    // Validar cédula duplicada
    const existingUserByCedula = await this.usersService.findByCedula(registerUserDto.cedula);
    if (existingUserByCedula) {
      throw new BadRequestException('La cédula ya está registrada. Por favor, verifica los datos ingresados.');
    }

    try {
      const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);
      // Buscar rol 'user' por nombre
      const userRole = await this.usersService.getRoleByName('user');
      if (!userRole) {
        throw new BadRequestException('Rol "user" no encontrado.');
      }
      const user = await this.usersService.create({
        ...registerUserDto,
        password: hashedPassword,
        roleName: 'user',
        status: 1,
        idRol: userRole.idRol,
      });
      return user;
    } catch (error) {
      console.error('Error al registrar el usuario:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Ocurrió un error al registrar el usuario. Por favor, intenta nuevamente o contacta al soporte.');
    }
  }

  // Aquí puedes agregar métodos para recuperación de contraseña
}
