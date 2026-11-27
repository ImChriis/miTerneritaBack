import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ClienteRapidoDto } from './dto/cliente-rapido.dto';
import { randomBytes } from 'crypto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcrypt';
import { Payment } from '../payments/entities/payment.entity';
import { exigirConfirmacion } from '../common/confirmar-borrado';

const EMAIL_EN_USO =
  'El correo electrónico ya está registrado. Por favor, utiliza otro.';
const CEDULA_EN_USO =
  'La cédula ya está registrada. Por favor, verifica los datos ingresados.';

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

  /**
   * Busqueda del admin por cedula. Las cedulas estan guardadas con y sin
   * prefijo ('31419200', 'V-31262324'): si no hay coincidencia exacta, se
   * compara solo la parte numerica.
   */
  async buscarPorCedula(cedula: string): Promise<User | null> {
    const exacta = await this.findByCedula(cedula);
    const digitos = cedula.replace(/\D/g, '');
    if (exacta || !digitos) return exacta;
    return this.usersRepository
      .createQueryBuilder('u')
      .where("REGEXP_REPLACE(u.cedula, '[^0-9]', '') = :digitos", { digitos })
      .orderBy('u.id', 'ASC')
      .getOne();
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

  /**
   * Crea una cuenta con un rol fijo. Es el camino comun de:
   * - POST /auth/register: clientes que se registran solos (rol `client`)
   * - POST /users: un admin da de alta cuentas de personal (rol `user`)
   *
   * El rol lo decide quien llama, nunca el cuerpo de la peticion, y solo puede
   * ser `client` o `user`: por aqui no se puede crear un admin.
   *
   * Devuelve UserResponseDto y no la entidad. save() devuelve el objeto con la
   * contrasena hasheada que se le acaba de asignar (select: false solo afecta
   * a las lecturas), y /auth/register estaba enviando ese hash en la respuesta.
   */
  async createAccount(
    dto: CreateUserDto,
    roleName: 'client' | 'user',
  ): Promise<UserResponseDto> {
    if (await this.findByEmail(dto.email)) {
      throw new BadRequestException(EMAIL_EN_USO);
    }
    if (await this.findByCedula(dto.cedula)) {
      throw new BadRequestException(CEDULA_EN_USO);
    }

    const role = await this.findRoleByName(roleName);
    if (!role) {
      throw new BadRequestException(`Rol "${roleName}" no encontrado.`);
    }

    const user = this.usersRepository.create({
      ...dto,
      password: await bcrypt.hash(dto.password, 10),
      idRol: role.idRol,
      status: 1,
    });

    try {
      const saved = await this.usersRepository.save(user);
      return UserResponseDto.fromUser({ ...saved, roleName: role.name });
    } catch (error) {
      // Dos altas simultaneas con el mismo email o cedula pasan las
      // comprobaciones de arriba; la restriccion UNIQUE frena la segunda.
      const dbError = error as { code?: string; sqlMessage?: string };
      if (dbError.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException(
          dbError.sqlMessage?.includes('cedula') ? CEDULA_EN_USO : EMAIL_EN_USO,
        );
      }
      throw error;
    }
  }

  /**
   * Registro asistido: el personal da de alta a un cliente sin cuenta (sin contraseña
   * que recordar y con el correo opcional). Se guarda una contraseña aleatoria que
   * nadie conoce; si el cliente tiene correo puede recuperarla.
   */
  async crearClienteRapido(dto: ClienteRapidoDto): Promise<UserResponseDto> {
    if (await this.buscarPorCedula(dto.cedula)) {
      throw new BadRequestException(CEDULA_EN_USO);
    }
    const email = dto.email?.trim().toLowerCase() || undefined;
    if (email && (await this.findByEmail(email))) {
      throw new BadRequestException(EMAIL_EN_USO);
    }
    const role = await this.findRoleByName('client');
    if (!role) throw new BadRequestException('Rol "client" no encontrado.');
    try {
      const saved = await this.usersRepository.save(
        this.usersRepository.create({
          name: dto.name.trim(),
          lastName: dto.lastName.trim(),
          cedula: dto.cedula,
          phone: dto.phone.trim(),
          email,
          password: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
          idRol: role.idRol,
          status: 1,
        }),
      );
      return UserResponseDto.fromUser({ ...saved, roleName: role.name });
    } catch (error) {
      const dbError = error as { code?: string; sqlMessage?: string };
      if (dbError.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException(
          dbError.sqlMessage?.includes('cedula') ? CEDULA_EN_USO : EMAIL_EN_USO,
        );
      }
      throw error;
    }
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

    const { id: _ignoredId, password, ...safeUpdateData } = updateUserDto;
    Object.assign(user, safeUpdateData);

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      const dbError = error as { code?: string; sqlMessage?: string };
      if (dbError.code === 'ER_DUP_ENTRY') {
        if (dbError.sqlMessage?.includes('cedula')) {
          throw new ConflictException('Ya existe un usuario con esa cédula');
        }
        if (dbError.sqlMessage?.includes('email')) {
          throw new ConflictException('Ya existe un usuario con ese email');
        }
        throw new ConflictException('Ese dato ya está en uso por otro usuario');
      }
      throw error;
    }
  }

  /**
   * Cambia el rol de una persona. Un admin no puede cambiar el suyo y el
   * ultimo admin activo no puede dejar de serlo.
   */
  async updateRole(id: number, roleName: string, actorId: number) {
    if (id === actorId) {
      throw new ConflictException('No puedes cambiar tu propio rol');
    }
    const user = await this.findByIdWithRoleName(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const role = await this.findRoleByName(roleName);
    if (!role) {
      throw new BadRequestException('Rol no encontrado');
    }
    if (user.roleName === 'admin' && roleName !== 'admin') {
      // shortcut: contar y luego guardar no es atomico; dos demociones
      // simultaneas podrian dejar 0 admins. Usar transaccion si pasa.
      const admins = await this.usersRepository.count({
        where: { idRol: user.idRol, status: 1 },
      });
      if (admins <= 1) {
        throw new ConflictException(
          'No se puede quitar el rol de admin al último administrador',
        );
      }
    }
    await this.usersRepository.update({ id }, { idRol: role.idRol });
  }

  async remove(id: number, confirmar = false): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    // Con pagos no se borra: se perderian sus facturas (en TiDB sin FKs
    // quedarian huerfanas). Se desactiva: el JwtStrategy rechaza status != 1
    // y la lista lo oculta.
    const pagos = await this.usersRepository.manager.count(Payment, {
      where: { idUser: { id } },
    });
    if (pagos > 0) {
      exigirConfirmacion(
        confirmar,
        `${user.name ?? 'El usuario'} tiene ${pagos} compra(s). Se desactivará: no podrá entrar y se conservan sus facturas.`,
      );
      await this.usersRepository.update({ id }, { status: 0 });
      return;
    }
    await this.usersRepository.remove(user);
  }

  // Encontrar todos los usuarios, incluyendo el nombre del rol
  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  // Usuarios registrados el día de hoy, con el nombre del rol incluido
  async findNewUsersToday(): Promise<
    Array<User & { roleName: string | null }>
  > {
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

  async findAllWithRoleName(): Promise<
    Array<User & { roleName: string | null }>
  > {
    return this.findUsersWithRoleName((qb) => qb.where('user.status = 1'));
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

  async findByResetToken(email: string, hashedToken: string) {
    // resetPasswordExpires es select: false, hay que pedirla explicitamente
    // porque resetPassword() necesita comprobar la caducidad.
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect(['user.resetPasswordToken', 'user.resetPasswordExpires'])
      .where('user.email = :email', { email })
      .andWhere('user.resetPasswordToken = :hashedToken', { hashedToken })
      .getOne();
  }

  /** Invalida el codigo de recuperacion pendiente de una cuenta. */
  async clearResetTokenByEmail(email: string) {
    return this.usersRepository.update(
      { email },
      { resetPasswordToken: null, resetPasswordExpires: null },
    );
  }

  async updatePasswordAndClearToken(userId: number, hashedPassword: string) {
    return this.usersRepository.update(userId, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }
}
