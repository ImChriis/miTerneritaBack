import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Como JwtAuthGuard, pero sin token deja pasar con `req.user` vacio. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    return user;
  }
}
