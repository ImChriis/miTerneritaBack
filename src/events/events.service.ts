import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  discardUploadedFiles,
  removeImageIfUnused,
} from '../common/uploads/upload-cleanup';
import { UPLOADS_DIR } from '../common/uploads/webp-upload';
import { join } from 'path';
import { Event } from './entities/event.entity';
import { EventPhoto } from './entities/event-photo.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { exigirConfirmacion } from '../common/confirmar-borrado';

const EVENT_IMAGES = ['flyer', 'image1', 'image2', 'image3'] as const;

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,

    @InjectRepository(EventPhoto)
    private photosRepository: Repository<EventPhoto>,
  ) {}

  /** Galeria del evento, en el orden en que se subio. */
  async photos(idEvents: number): Promise<EventPhoto[]> {
    return this.photosRepository.find({
      where: { idEvents },
      order: { idPhoto: 'ASC' },
    });
  }

  async addPhotos(
    idEvents: number,
    files: Express.Multer.File[],
  ): Promise<EventPhoto[]> {
    await this.findOne(idEvents);
    return this.photosRepository.save(
      files.map((file) =>
        this.photosRepository.create({
          idEvents,
          image: `galeria/${file.filename}`,
        }),
      ),
    );
  }

  async removePhoto(idEvents: number, idPhoto: number): Promise<void> {
    const foto = await this.photosRepository.findOne({
      where: { idPhoto, idEvents },
    });
    if (!foto) {
      throw new NotFoundException('Foto no encontrada');
    }
    await this.photosRepository.remove(foto);
    await this.borrarArchivos([foto]);
  }

  /** Las fotos de la galeria no se comparten con otros registros: se borran sin mas. */
  private borrarArchivos(fotos: EventPhoto[]) {
    return discardUploadedFiles(
      fotos.map((f) => ({ path: join(UPLOADS_DIR, f.image) })),
    );
  }

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const event = this.eventsRepository.create(createEventDto);
    return this.eventsRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    return this.eventsRepository.find({ where: { activo: 1 } });
  }

  // async findTicketOptions(): Promise<
  //   Array<{ idTicket: number; name: string; price: number; status: number }>
  // > {
  //   return this.eventsRepository.manager.query(
  //     'SELECT idTicket, name, price, status FROM ticket WHERE status = 1 ORDER BY idTicket',
  //   );
  // }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { idEvents: id, activo: 1 },
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }
    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);
    const anteriores = EVENT_IMAGES.map((campo) => event[campo]);
    Object.assign(event, updateEventDto);
    const saved = await this.eventsRepository.save(event);

    // Las imagenes reemplazadas se borran del disco cuando ya no las usa
    // ningun otro registro.
    for (const [i, campo] of EVENT_IMAGES.entries()) {
      if (anteriores[i] !== saved[campo]) {
        await removeImageIfUnused(this.eventsRepository.manager, anteriores[i]);
      }
    }
    return saved;
  }

  /** true si se borro; false si tenia ventas y solo se oculto (activo 0). */
  async remove(id: number, confirmar = false): Promise<boolean> {
    const event = await this.findOne(id);
    // Con ventas no se borra: los pagos y tickets dependen del evento (FK en MySQL; en TiDB quedarian huerfanos).
    // SQL directo sobre la columna: no depende de como TypeORM resuelva la relacion.
    const [{ n }] = await this.eventsRepository.manager.query<{ n: string }[]>(
      'SELECT COUNT(*) AS n FROM payment WHERE idEvents = ?',
      [id],
    );
    const ventas = Number(n);
    if (ventas > 0) {
      exigirConfirmacion(
        confirmar,
        `"${event.name}" tiene ${ventas} venta(s). Se ocultará de la cartelera y del panel; sus pagos y entradas se conservan.`,
      );
      // status 0 tambien cierra la venta (assertVentaAbierta).
      await this.eventsRepository.update(
        { idEvents: id },
        { status: 0, activo: 0 },
      );
      return false;
    }
    const imagenes = EVENT_IMAGES.map((campo) => event[campo]);
    const fotos = await this.photos(id);
    // Primero el evento: si tiene pagos la FK lo impide y la galeria sigue intacta.
    try {
      await this.eventsRepository.remove(event);
    } catch (error: unknown) {
      // Otra tabla aun apunta al evento (FK): se oculta igual que con ventas.
      if ((error as { code?: string }).code !== 'ER_ROW_IS_REFERENCED_2') {
        throw error;
      }
      exigirConfirmacion(
        confirmar,
        `"${event.name}" tiene datos asociados. Se ocultará de la cartelera y del panel; se conservan.`,
      );
      await this.eventsRepository.update(
        { idEvents: id },
        { status: 0, activo: 0 },
      );
      return false;
    }
    // En MySQL ya lo hizo el ON DELETE CASCADE; en TiDB sin FKs, no.
    await this.photosRepository.delete({ idEvents: id });
    await this.borrarArchivos(fotos);
    for (const imagen of imagenes) {
      await removeImageIfUnused(this.eventsRepository.manager, imagen);
    }
    return true;
  }
}
