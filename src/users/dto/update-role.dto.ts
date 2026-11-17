import { IsIn } from 'class-validator';

export class UpdateRoleDto {
  @IsIn(['admin', 'user', 'client'])
  readonly role: 'admin' | 'user' | 'client';
}
