import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync, promises as fs } from 'fs';
import { Postulacion, PUESTOS } from './entities/postulacion.entity';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { Configuration } from '../configuration/entities/configuration.entity';
import { cvPath } from '../common/uploads/comprobante-upload';

@Injectable()
export class PostulacionesService {
  constructor(
    @InjectRepository(Postulacion)
    private readonly repo: Repository<Postulacion>,
    @InjectRepository(Configuration)
    private readonly configRepo: Repository<Configuration>,
  ) {}

  private async config(): Promise<Configuration | null> {
    const [config] = await this.configRepo.find({
      order: { idConfiguration: 'ASC' },
      take: 1,
    });
    return config ?? null;
  }

  /** Todos los puestos y los que el admin tiene abiertos ahora. */
  async puestos(): Promise<{ puestos: readonly string[]; abiertos: string[] }> {
    const guardados = (await this.config())?.puestosAbiertos ?? '';
    const abiertos = guardados.split(',').map((p) => p.trim());
    return {
      puestos: PUESTOS,
      abiertos: PUESTOS.filter((p) => abiertos.includes(p)),
    };
  }

  async setPuestos(abiertos: string[]) {
    const config = await this.config();
    if (!config) throw new NotFoundException('Configuración no encontrada');
    config.puestosAbiertos = PUESTOS.filter((p) => abiertos.includes(p)).join(
      ',',
    );
    await this.configRepo.save(config);
    return this.puestos();
  }

  async create(
    dto: CreatePostulacionDto,
    cv?: string,
  ): Promise<{ message: string }> {
    const { abiertos } = await this.puestos();
    if (!abiertos.includes(dto.puesto)) {
      throw new BadRequestException(
        `Por ahora no buscamos ${dto.puesto}. Puestos abiertos: ${abiertos.join(', ') || 'ninguno'}`,
      );
    }
    await this.repo.save(
      this.repo.create({
        ...dto,
        mensaje: dto.mensaje || null,
        cv: cv ?? null,
      }),
    );
    // No se devuelve la fila: el formulario es público.
    return { message: 'Postulación recibida' };
  }

  findAll(): Promise<Postulacion[]> {
    return this.repo.find({ order: { fecha: 'DESC' } });
  }

  private async findOne(id: number): Promise<Postulacion> {
    const postulacion = await this.repo.findOne({
      where: { idPostulacion: id },
    });
    if (!postulacion) throw new NotFoundException('Postulación no encontrada');
    return postulacion;
  }

  async updateEstado(id: number, estado: string): Promise<Postulacion> {
    const postulacion = await this.findOne(id);
    postulacion.estado = estado;
    return this.repo.save(postulacion);
  }

  async cv(id: number): Promise<string> {
    const path = cvPath((await this.findOne(id)).cv);
    if (!path || !existsSync(path)) {
      throw new NotFoundException('Esta postulación no tiene CV');
    }
    return path;
  }

  async remove(id: number): Promise<void> {
    const postulacion = await this.findOne(id);
    await this.repo.remove(postulacion);
    const path = cvPath(postulacion.cv);
    if (path) await fs.rm(path, { force: true });
  }
}
