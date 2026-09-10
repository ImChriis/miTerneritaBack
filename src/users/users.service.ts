import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  /**
   * Carga usuarios con su rol y aplana el nombre en `roleName`, que es la
   * forma que espera UserResponseDto.
   */
  private async findUsersWithRoleName(
    where?: (qb: SelectQueryBuilder<User>) => void,
  ): Promise<Array<User & { roleName: string | null }>> {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.id', 'ASC');

    where?.(qb);

    const users = await qb.getMany();

    return users.map((user) =>
      Object.assign(user, { roleName: user.role?.name ?? null }),
    );
  }

  private async findRoleByName(name: string): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { name } });
  }

  private async findRoleById(idRol: number): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { idRol } });
  }

  async getRoleNameByIdRol(idRol?: number): Promise<string | null> {
    if (!idRol) {
      return null;
    }
    const role = await this.findRoleById(idRol);
    return role ? role.name : null;
  }

  async getRoleByName(name: string): Promise<Role | null> {
    return this.findRoleByName(name);
  }

  async findByCedula(cedula: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { cedula },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  /**
   * Igual que findByEmail pero trayendo el hash de la contrasena, que la
   * entidad marca con select: false. Solo para el login.
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  async create(
    createUserDto: CreateUserDto & { roleName?: string; status?: number },
  ): Promise<User> {
    let roleId: number | undefined;
    if (createUserDto.roleName) {
      const role = await this.findRoleByName(createUserDto.roleName);
      if (!role) {
        throw new BadRequestException('Rol no encontrado');
      }
      roleId = role.idRol;
    } else if (createUserDto.idRol) {
      const role = await this.findRoleById(createUserDto.idRol);
      if (!role) {
        throw new BadRequestException('Rol no encontrado');
      }
      roleId = role.idRol;
    } else {
      throw new BadRequestException('Rol es requerido');
    }

    const { roleName, ...userData } = createUserDto;
    const user = this.usersRepository.create({
      ...userData,
      idRol: roleId,
      status: userData.status ?? 1,
    });

    return this.usersRepository.save(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
  // Se carga con la contrasena incluida: save() actualiza las columnas
  // cargadas y no conviene dejarla fuera del ciclo de persistencia.
  const user = await this.usersRepository
    .createQueryBuilder('user')
    .addSelect('user.password')
    .where('user.idUser = :id', { id })
    .getOne();
  if (!user) {
    throw new NotFoundException('Usuario no encontrado');
  }

  if (updateUserDto.idRol) {
    const role = await this.findRoleById(updateUserDto.idRol);
    if (!role) {
      throw new BadRequestException('Rol no encontrado');
    }
  }

  const { id: _ignoredId, password, ...safeUpdateData } = updateUserDto;
  Object.assign(user, safeUpdateData);

  if (password) {
    user.password = await bcrypt.hash(password, 10);
  }

  try {
    return await this.usersRepository.save(user);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.sqlMessage?.includes('cedula')) {
        throw new ConflictException('Ya existe un usuario con esa cédula');
      }
      if (error.sqlMessage?.includes('email')) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      throw new ConflictException('Ese dato ya está en uso por otro usuario');
    }
    throw error;
  }
}

  async remove(id: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.usersRepository.remove(user);
  }

  // Encontrar todos los usuarios, incluyendo el nombre del rol
  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  // Usuarios registrados el día de hoy, con el nombre del rol incluido
  async findNewUsersToday(): Promise<Array<User & { roleName: string | null }>> {
    // Rango de fechas en vez de DATE(fechaRegistro) = CURDATE(): asi MySQL
    // puede usar un indice sobre la columna en lugar de recorrer la tabla.
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.findUsersWithRoleName((qb) =>
      qb.where('user.fechaRegistro >= :start AND user.fechaRegistro < :end', {
        start,
        end,
      }),
    );
  }

  async findAllWithRoleName(): Promise<Array<User & { roleName: string | null }>> {
    return this.findUsersWithRoleName();
  }

  async findByIdWithRoleName(
    id: number,
  ): Promise<(User & { roleName: string | null }) | null> {
    const [user] = await this.findUsersWithRoleName((qb) =>
      qb.where('user.id = :id', { id }),
    );
    return user ?? null;
  }

  async setResetToken(userId: number, hashedToken: string, expiresAt: Date) {
  return this.usersRepository.update(userId, {
    resetPasswordToken: hashedToken,
    resetPasswordExpires: expiresAt,
  });
}

async findByResetToken(hashedToken: string) {
  // resetPasswordExpires es select: false, hay que pedirla explicitamente
  // porque resetPassword() necesita comprobar la caducidad.
  return this.usersRepository
    .createQueryBuilder('user')
    .addSelect(['user.resetPasswordToken', 'user.resetPasswordExpires'])
    .where('user.resetPasswordToken = :hashedToken', { hashedToken })
    .getOne();
}

async updatePasswordAndClearToken(userId: number, hashedPassword: string) {
  return this.usersRepository.update(userId, {
    password: hashedPassword,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  });
  }
}