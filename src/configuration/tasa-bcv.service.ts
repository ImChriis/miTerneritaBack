import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { Configuration } from './entities/configuration.entity';

/** Tasas de DolarApi; la de fuente "oficial" es la del BCV. */
const URL_TASAS = 'https://ve.dolarapi.com/v1/dolares';

/** 'AAAA-MM-DD' en hora de Venezuela. */
const diaCaracas = (fecha: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(
    fecha,
  );

/**
 * Mantiene configuration.BCV al dia sin saturar a nadie: el BCV publica una
 * tasa por dia habil, asi que se revisa cada 3 horas y solo se llama a la API
 * mientras no se tenga la de hoy (en la practica, 1 o 2 llamadas al dia). Los
 * clientes leen la tasa guardada con GET /configuration; nunca llaman a la API
 * externa. Si la API falla, se conserva la ultima tasa.
 */
@Injectable()
export class TasaBcvService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TasaBcvService.name);

  constructor(
    @InjectRepository(Configuration)
    private readonly configurationRepository: Repository<Configuration>,
  ) {}

  onApplicationBootstrap(): void {
    void this.actualizar();
  }

  @Cron('0 */3 * * *', { timeZone: 'America/Caracas' })
  async actualizar(): Promise<void> {
    const [config] = await this.configurationRepository.find({
      order: { idConfiguration: 'ASC' },
      take: 1,
    });
    if (!config) return;
    if (
      config.BCV &&
      config.fechaBCV &&
      diaCaracas(config.fechaBCV) >= diaCaracas(new Date())
    ) {
      return;
    }

    try {
      const respuesta = await fetch(URL_TASAS, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const tasas = (await respuesta.json()) as Array<{
        fuente?: string;
        promedio?: number;
        fechaActualizacion?: string;
      }>;
      const oficial = tasas.find((t) => t.fuente === 'oficial');
      const valor = Number(oficial?.promedio);
      if (!Number.isFinite(valor) || valor <= 0) {
        throw new Error('la respuesta no trae la tasa oficial');
      }
      const fecha = new Date(oficial?.fechaActualizacion ?? Date.now());
      await this.configurationRepository.update(config.idConfiguration, {
        BCV: Math.round(valor * 10_000) / 10_000,
        fechaBCV: Number.isNaN(fecha.getTime()) ? new Date() : fecha,
      });
      this.logger.log(`Tasa BCV ${valor} (${diaCaracas(fecha)})`);
    } catch (error) {
      this.logger.warn(
        `No se pudo actualizar la tasa BCV, se mantiene ${config.BCV ?? 'la anterior'}: ${(error as Error).message}`,
      );
    }
  }
}
