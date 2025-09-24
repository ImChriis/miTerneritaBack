import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { last } from 'rxjs';

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
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return user;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role.name };
    return {
      name: user.name,
      email: user.email,
      role: user.role.name,
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
    const existingUserByCedula = await this.usersService['usersRepository'].findOne({ where: { cedula: registerUserDto.cedula } });
    if (existingUserByCedula) {
      throw new BadRequestException('La cédula ya está registrada. Por favor, verifica los datos ingresados.');
    }

    try {
      const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);
      const user = await this.usersService.create({
        ...registerUserDto,
        password: hashedPassword,
        roleName: 'user', // asigna rol 'user' por defecto
        status: 1,
        idRol: 1, // Asegura que el idRol sea 1 para 'user'
      });
      return user;
    } catch (error) {
      // Manejo profesional de errores inesperados
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Ocurrió un error al registrar el usuario. Por favor, intenta nuevamente o contacta al soporte.');
    }
  }

  // Aquí puedes agregar métodos para recuperación de contraseña
}
