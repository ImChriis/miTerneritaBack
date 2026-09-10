import { Request } from 'express';

/**
 * Lo que JwtStrategy.validate() deja en req.user.
 *
 * Los controladores usaban `@Request() req` sin tipo, asi que req.user.userId
 * y req.user.role eran `any`: cualquier error de nombre pasaba desapercibido.
 */
export interface AuthenticatedUser {
  userId: number;
  email?: string;
  role: string | null;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
