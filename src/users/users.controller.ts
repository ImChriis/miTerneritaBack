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
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Alta de cuentas de personal (rol `user`). Solo admin.
   *
   * Mismo cuerpo y mismas reglas que POST /auth/register; cambia el rol. Los
   * clientes se siguen registrando solos por /auth/register con rol `client`.
   */
  @Post()
  @Roles('admin')
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createAccount(createUserDto, 'user');
  }

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
  async getProfile(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findByIdWithRoleName(req.user.userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return UserResponseDto.fromUser(user);
  }

  // Va despues de new-today y profile: Express resuelve las rutas en orden de
  // declaracion, y declarada antes ':cedula' se quedaba con esas dos.
  @Get(':cedula')
  @Roles('admin')
  async findByCedula(
    @Param('cedula') cedula: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findByCedula(cedula);
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
