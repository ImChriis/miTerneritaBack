import {
  Controller,
  Get,
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
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Solo admin puede listar todos los usuarios
  @Get()
  @Roles('admin')
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAllWithRoleName();
    return users.map((user) => UserResponseDto.fromUser(user));
  }

  // Solo admin puede ver los usuarios registrados hoy
  @Get('new-today')
  @Roles('admin')
  async findNewToday(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findNewUsersToday();
    return users.map((user) => UserResponseDto.fromUser(user));
  }

  // Usuario puede ver su propio perfil
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest): Promise<UserResponseDto> {
    const user = await this.usersService.findByIdWithRoleName(req.user.userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return UserResponseDto.fromUser(user);
  }

  // Admin puede actualizar cualquier usuario
  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    await this.usersService.update(id, updateUserDto);
    const user = await this.usersService.findByIdWithRoleName(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return UserResponseDto.fromUser(user);
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
