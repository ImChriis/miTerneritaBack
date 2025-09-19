export class RoleResponseDto {
  id: number;
  name: string;

  constructor(partial: Partial<RoleResponseDto>) {
    Object.assign(this, partial);
  }
}
