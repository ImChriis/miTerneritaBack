import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Solo admin puede listar todos los usuarios
  @Get()
  @Roles('admin')
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map(
      (user) =>
        new UserResponseDto({
          id: user.id,
          name: user.name,
          lastName: user.lastName,
          cedula: user.cedula,
          email: user.email,
          phone: user.phone,
          status: user.status,
          fechaRegistro: user.fechaRegistro,
          roleName: user.role.name,
        }),
    );
  }

  // Usuario puede ver su propio perfil
  @Get('profile')
  async getProfile(@Request() req): Promise<UserResponseDto> {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return new UserResponseDto({
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      cedula: user.cedula,
      email: user.email,
      phone: user.phone,
      status: user.status,
      fechaRegistro: user.fechaRegistro,
      roleName: user.role.name,
    });
  }

  // Admin puede actualizar cualquier usuario
  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, updateUserDto);
    return new UserResponseDto({
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      cedula: user.cedula,
      email: user.email,
      phone: user.phone,
      status: user.status,
      fechaRegistro: user.fechaRegistro,
      roleName: user.role.name,
    });
  }

  // Admin puede eliminar usuario
  @Delete(':id')
  @Roles('admin')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.usersService.remove(id);
    return { message: 'Usuario eliminado correctamente' };
  }
}
