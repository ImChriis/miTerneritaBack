import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email);
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
      id: user.id,
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
    const existingUserByEmail = await this.usersService.findByEmail(
      registerUserDto.email,
    );
    if (existingUserByEmail) {
      throw new BadRequestException(
        'El correo electrónico ya está registrado. Por favor, utiliza otro.',
      );
    }

    // Validar cédula duplicada
    const existingUserByCedula = await this.usersService.findByCedula(
      registerUserDto.cedula,
    );
    if (existingUserByCedula) {
      throw new BadRequestException(
        'La cédula ya está registrada. Por favor, verifica los datos ingresados.',
      );
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
      throw new BadRequestException(
        'Ocurrió un error al registrar el usuario. Por favor, intenta nuevamente o contacta al soporte.',
      );
    }
  }

  /**
   * Paso 1: el usuario ingresa su correo.
   * Generamos un token, lo guardamos (hasheado) con expiración,
   * y enviamos el enlace de recuperación por correo.
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    // Respuesta genérica siempre, exista o no el correo (evita enumeración de usuarios)
    const genericResponse = {
      message:
        'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
    };

    if (!user) {
      return genericResponse;
    }

    // Código de 6 dígitos que se muestra al usuario (texto plano, va en el correo)
    const code = crypto.randomInt(100000, 1000000).toString();
    // Lo que guardamos en BD (nunca el código en texto plano)
    const hashedToken = crypto.createHash('sha256').update(code).digest('hex');
    // Vida corta: un código de 6 dígitos es más fácil de adivinar que un token largo,
    // así que expira rápido (15 min) y además hay que combinarlo con el email al validar.
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.usersService.setResetToken(user.id!, hashedToken, expiresAt);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Código para recuperar tu contraseña',
        template: './forgot-password',
        context: {
          name: user.name,
          code,
          expiresInMinutes: 15,
        },
      });
    } catch (error) {
      console.error('Error al enviar el correo de recuperación:', error);
      throw new BadRequestException(
        'No se pudo enviar el correo de recuperación. Intenta nuevamente más tarde.',
      );
    }

    return genericResponse;
  }

  /**
   * Paso 2: el usuario llega desde el link del correo con el token
   * y envía su nueva contraseña.
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetPasswordDto.code)
      .digest('hex');

    const user = await this.usersService.findByResetToken(hashedToken);

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException(
        'El código es inválido o ha expirado. Solicita uno nuevo.',
      );
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.usersService.updatePasswordAndClearToken(
      user.id!,
      hashedPassword,
    );

    return { message: 'Tu contraseña ha sido actualizada correctamente.' };
  }
}
