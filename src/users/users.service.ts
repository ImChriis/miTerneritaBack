import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
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

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  async create(
    createUserDto: CreateUserDto & { roleName?: string; status?: number },
  ): Promise<User> {
    // Si viene roleName, buscar rol
    let role: Role | null;
    if (createUserDto.roleName) {
      role = await this.rolesRepository.findOne({
        where: { name: createUserDto.roleName },
      });
      if (!role) {
        throw new BadRequestException('Rol no encontrado');
      }
    } else if (createUserDto.idRol) {
      role = await this.rolesRepository.findOne({
        where: { id: createUserDto.idRol },
      });
      if (!role) {
        throw new BadRequestException('Rol no encontrado');
      }
    } else {
      throw new BadRequestException('Rol es requerido');
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      role: role,
      status: createUserDto.status ?? 1,
    });

    return this.usersRepository.save(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.idRol) {
      const role = await this.rolesRepository.findOne({
        where: { id: updateUserDto.idRol },
      });
      if (!role) {
        throw new BadRequestException('Rol no encontrado');
      }
      user.role = role;
    }

    Object.assign(user, updateUserDto);

    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.usersRepository.remove(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['role'] });
  }
}
