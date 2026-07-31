import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private async findRoleByName(name: string): Promise<{ idRol: number; name: string } | null> {
    const rows = await this.usersRepository.manager.query(
      'SELECT idRol, name FROM Roles WHERE name = ? LIMIT 1',
      [name],
    );
    return rows[0] ?? null;
  }

  private async findRoleById(idRol: number): Promise<{ idRol: number; name: string } | null> {
    const rows = await this.usersRepository.manager.query(
      'SELECT idRol, name FROM Roles WHERE idRol = ? LIMIT 1',
      [idRol],
    );
    return rows[0] ?? null;
  }

  async getRoleNameByIdRol(idRol?: number): Promise<string | null> {
    if (!idRol) {
      return null;
    }
    const role = await this.findRoleById(idRol);
    return role ? role.name : null;
  }

  async getRoleByName(name: string): Promise<{ idRol: number; name: string } | null> {
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
  const user = await this.usersRepository.findOne({ where: { id } });
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

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findAllWithRoleName(): Promise<Array<User & { roleName: string | null }>> {
    const rows = await this.usersRepository.manager.query(
      `SELECT
        u.idUser as id,
        u.name,
        u.lastName,
        u.cedula,
        u.email,
        u.phone,
        u.status,
        u.fechaRegistro,
        u.idRol,
        r.name as roleName
      FROM Users u
      LEFT JOIN Roles r ON r.idRol = u.idRol`,
    );
    return rows;
  }

  async findByIdWithRoleName(id: number): Promise<(User & { roleName: string | null }) | null> {
    const rows = await this.usersRepository.manager.query(
      `SELECT
        u.idUser as id,
        u.name,
        u.lastName,
        u.cedula,
        u.email,
        u.phone,
        u.status,
        u.fechaRegistro,
        u.idRol,
        r.name as roleName
      FROM Users u
      LEFT JOIN Roles r ON r.idRol = u.idRol
      WHERE u.idUser = ?
      LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }
  async setResetToken(userId: number, hashedToken: string, expiresAt: Date) {
  return this.usersRepository.update(userId, {
    resetPasswordToken: hashedToken,
    resetPasswordExpires: expiresAt,
  });
}

async findByResetToken(hashedToken: string) {
  return this.usersRepository.findOne({
    where: { resetPasswordToken: hashedToken },
  });
}

async updatePasswordAndClearToken(userId: number, hashedPassword: string) {
  return this.usersRepository.update(userId, {
    password: hashedPassword,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  });
  }
}
