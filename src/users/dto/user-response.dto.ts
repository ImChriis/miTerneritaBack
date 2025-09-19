export class UserResponseDto {
  id: number;
  name: string;
  lastName: string;
  cedula: string;
  email: string;
  phone?: string;
  status: number;
  fechaRegistro: Date;
  roleName: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
