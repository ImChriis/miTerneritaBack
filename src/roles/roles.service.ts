import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  async findByName(name: string): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { name } });
  }

  async findById(id: number): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { idRol: id } });
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existing = await this.findByName(createRoleDto.name);
    if (existing) {
      throw new BadRequestException('El rol ya existe');
    }
    const role = this.rolesRepository.create(createRoleDto);
    return this.rolesRepository.save(role);
  }

  // Método para inicializar roles 'user' y 'admin' si no existen
  async initializeRoles(): Promise<void> {
    const roles = ['user', 'admin'];
    for (const roleName of roles) {
      const exists = await this.findByName(roleName);
      if (!exists) {
        await this.create({ name: roleName });
      }
    }
  }
}
