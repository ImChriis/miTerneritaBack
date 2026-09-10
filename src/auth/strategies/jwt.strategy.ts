import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { AuthenticatedUser } from '../interfaces/authenticated-request';

interface JwtPayload {
  sub: number;
  email: string;
  role: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    // Un token puede seguir siendo criptograficamente valido despues de que el
    // usuario haya sido eliminado o desactivado, asi que se comprueba contra la
    // base de datos en cada peticion.
    if (!user) {
      throw new UnauthorizedException('El usuario del token ya no existe');
    }
    if (user.status !== 1) {
      throw new UnauthorizedException('La cuenta esta desactivada');
    }

    const roleName = await this.usersService.getRoleNameByIdRol(user.idRol);

    const authenticatedUser: AuthenticatedUser = {
      userId: user.id!,
      email: user.email,
      role: roleName,
    };

    return authenticatedUser;
  }
}
