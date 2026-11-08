import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { Configuration } from './entities/configuration.entity';
import { get } from 'https';
import { rootCertificates } from 'tls';
import { SECTIGO_DV_R36 } from './bcv-ca';

/** Web del BCV: la fuente original (DolarApi llega a ir un dia atrasado). */
const URL_BCV = 'https://www.bcv.org.ve/';
/** Respaldo si la web del BCV falla (caida, certificado): la de fuente "oficial". */
const URL_TASAS = 'https://ve.dolarapi.com/v1/dolares';

interface Tasa {
  valor: number;
  /** Fecha valor que publica el BCV. */
  fecha: Date;
}

/**
 * Lee el USD y la "Fecha Valor" del HTML del BCV. Exportada para probarla.
 * shortcut: depende del marcado de bcv.org.ve (id="dolar" y dc:date); si lo
 * cambian, cae al respaldo de DolarApi y queda en el log.
 */
export function leerTasaBcv(html: string): Tasa {
  const valor = html.match(
    /id="dolar"[\s\S]*?<strong[^>]*>\s*([\d.,]+)\s*<\/strong>/,
  )?.[1];
  const fecha = html.match(/property="dc:date"[^>]*content="([^"]+)"/)?.[1];
  // "897,53830000": coma decimal y, si los hubiera, puntos de miles.
  const numero = Number(valor?.replace(/\./g, '').replace(',', '.'));
  const dia = new Date(fecha ?? '');
  if (!Number.isFinite(numero) || numero <= 0 || Number.isNaN(dia.getTime())) {
    throw new Error('la pagina del BCV no trae la tasa del dolar');
  }
  return { valor: numero, fecha: dia };
}

/**
 * HTML de bcv.org.ve. Con https.get y no fetch: hace falta pasar `ca` con el
 * intermedio que el BCV no envia (ver bcv-ca.ts); la verificacion TLS sigue activa.
 */
function htmlBcv(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = get(
      URL_BCV,
      { ca: [...rootCertificates, SECTIGO_DV_R36], timeout: 15_000 },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.setEncoding('utf8');
        let html = '';
        res.on('data', (chunk: string) => (html += chunk));
        res.on('end', () => resolve(html));
      },
    );
    req.on('timeout', () => req.destroy(new Error('tiempo de espera agotado')));
    req.on('error', reject);
  });
}

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

  /**
   * `forzar` (boton del dashboard): consulta aunque ya se tenga la tasa de hoy
   * y, si la API falla, lo dice en vez de callarlo.
   */
  @Cron('0 */3 * * *', { timeZone: 'America/Caracas' })
  async actualizar(forzar = false): Promise<void> {
    const [config] = await this.configurationRepository.find({
      order: { idConfiguration: 'ASC' },
      take: 1,
    });
    if (!config) return;
    if (
      !forzar &&
      config.BCV &&
      config.fechaBCV &&
      diaCaracas(config.fechaBCV) >= diaCaracas(new Date())
    ) {
      return;
    }

    try {
      const { valor, fecha } = await this.consultar();
      await this.configurationRepository.update(config.idConfiguration, {
        BCV: Math.round(valor * 10_000) / 10_000,
        fechaBCV: fecha,
      });
      this.logger.log(`Tasa BCV ${valor} (${diaCaracas(fecha)})`);
    } catch (error) {
      this.logger.warn(
        `No se pudo actualizar la tasa BCV, se mantiene ${config.BCV ?? 'la anterior'}: ${(error as Error).message}`,
      );
      if (forzar) {
        throw new ServiceUnavailableException(
          'No se pudo consultar la tasa del BCV; se mantiene la anterior',
        );
      }
    }
  }

  /** Primero la web del BCV; si falla, DolarApi. */
  private async consultar(): Promise<Tasa> {
    try {
      return leerTasaBcv(await htmlBcv());
    } catch (error) {
      const e = error as Error & { code?: string };
      this.logger.warn(
        `Web del BCV no disponible, se usa DolarApi: ${e.code ?? ''} ${e.message}`,
      );
    }

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
    return { valor, fecha: Number.isNaN(fecha.getTime()) ? new Date() : fecha };
  }
}
