import { Injectable } from '@nestjs/common';
import { DataSource, MoreThanOrEqual } from 'typeorm';
import { Visita } from './entities/visita.entity';
import {
  PASOS_EMBUDO,
  PasoEmbudo,
  VisitaPaso,
} from './entities/visita-paso.entity';
import { RegistrarVisitaDto } from './dto/registrar-visita.dto';

const HORA = 3_600_000;
const DIA = 24 * HORA;
/** Venezuela: UTC-4 todo el ano (sin horario de verano). */
const OFFSET_VE = 4 * HORA;
/** Una visita esta activa si dio senal en los ultimos 2 min (latido: 1 min). */
const ACTIVA_MS = 2 * 60_000;
/** Compras de mas de un dia no son una compra continua: se descartan. */
const MAX_COMPRA_MS = DIA;
// Robots que ejecutan JS y no dicen "bot": Search Console (Google-InspectionTool), Vercel, redes, monitores.
const BOT =
  /bot|crawl|spider|slurp|preview|headless|lighthouse|google|inspection|vercel|facebookexternalhit|whatsapp|python|curl|uptime|monitor|pingdom/i;
const MOVIL = /mobi|android|iphone|ipad/i;

/** La misma hora en Venezuela; se lee con getUTC*. */
const enVe = (d: Date) => new Date(d.getTime() - OFFSET_VE);
const fechaVe = (d: Date) => enVe(d).toISOString().slice(0, 10);

const promedio = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
const mediana = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};

@Injectable()
export class VisitasService {
  constructor(private readonly dataSource: DataSource) {}

  /** Navegacion (con `paso`) o latido del sitio publico. Los bots no cuentan. */
  async registrar(dto: RegistrarVisitaDto, userAgent = ''): Promise<void> {
    if (BOT.test(userAgent)) return;
    const ahora = new Date();
    await this.dataSource.query(
      `INSERT INTO visita (sesion, visitante, dispositivo, inicio, ultimo, paginas)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE ultimo = VALUES(ultimo), paginas = paginas + VALUES(paginas)`,
      [
        dto.sesion,
        dto.visitante,
        MOVIL.test(userAgent) ? 'movil' : 'escritorio',
        ahora,
        ahora,
        dto.paso ? 1 : 0,
      ],
    );
    if (PASOS_EMBUDO.includes(dto.paso as PasoEmbudo)) {
      await this.dataSource.query(
        'INSERT IGNORE INTO visita_paso (sesion, paso, idEvents, creado) VALUES (?, ?, ?, ?)',
        [dto.sesion, dto.paso, dto.idEvents ?? 0, ahora],
      );
    }
  }

  /** Visitas activas ahora y cuantas estan en medio de una compra. */
  async activas() {
    const desde = new Date(Date.now() - ACTIVA_MS);
    const activas = await this.dataSource
      .getRepository(Visita)
      .count({ where: { ultimo: MoreThanOrEqual(desde) } });
    const [{ n }] = await this.dataSource.query<{ n: string | number }[]>(
      `SELECT COUNT(DISTINCT v.sesion) n FROM visita v
       JOIN visita_paso p ON p.sesion = v.sesion AND p.paso IN ('entradas', 'consumo', 'datos', 'pago')
       WHERE v.ultimo >= ?
         AND NOT EXISTS (SELECT 1 FROM visita_paso q WHERE q.sesion = v.sesion AND q.paso = 'pagado')`,
      [desde],
    );
    return { activas, comprando: Number(n) };
  }

  /** Panel de visitas del dashboard: `dias` = 1 (hoy), 7, 30 o 90. */
  async resumen(dias: number) {
    const hoy = enVe(new Date());
    hoy.setUTCHours(0, 0, 0, 0);
    const desde = new Date(hoy.getTime() + OFFSET_VE - (dias - 1) * DIA);

    const visitas = await this.dataSource
      .getRepository(Visita)
      .find({ where: { inicio: MoreThanOrEqual(desde) } });
    const pasos = await this.dataSource
      .getRepository(VisitaPaso)
      .find({ where: { creado: MoreThanOrEqual(desde) } });

    // ---- Cuando se conectan ----
    const porHora = Array<number>(24).fill(0);
    /** [lunes..domingo][hora] */
    const calor = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    const porDia = new Map<string, number>();
    for (let i = 0; i < dias; i++) {
      porDia.set(fechaVe(new Date(desde.getTime() + i * DIA)), 0);
    }
    const dispositivos = { movil: 0, escritorio: 0 };
    const duraciones: number[] = [];
    const visitantes = new Set<string>();
    let paginas = 0;
    let rebotes = 0;
    for (const v of visitas) {
      const l = enVe(v.inicio);
      const hora = l.getUTCHours();
      porHora[hora]++;
      calor[(l.getUTCDay() + 6) % 7][hora]++;
      const dia = fechaVe(v.inicio);
      porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
      dispositivos[v.dispositivo === 'movil' ? 'movil' : 'escritorio']++;
      visitantes.add(v.visitante);
      paginas += v.paginas;
      const seg = (v.ultimo.getTime() - v.inicio.getTime()) / 1000;
      if (seg > 0) duraciones.push(seg);
      // Rebote: vio una sola pagina y se fue antes de 30 s.
      if (v.paginas <= 1 && seg < 30) rebotes++;
    }
    const pico = Math.max(...porHora);

    const [{ n: recurrentes }] = await this.dataSource.query<
      { n: string | number }[]
    >(
      `SELECT COUNT(*) n FROM (
         SELECT visitante FROM visita GROUP BY visitante
         HAVING MAX(inicio) >= ? AND COUNT(*) > 1
       ) r`,
      [desde],
    );

    // ---- Embudo y tiempo de compra ----
    const sesionesPor = new Map<PasoEmbudo, Set<string>>(
      PASOS_EMBUDO.map((p) => [p, new Set<string>()]),
    );
    /** sesion -> paso -> primera vez (ms) */
    const primera = new Map<string, Map<PasoEmbudo, number>>();
    const vistasEvento = new Map<number, Set<string>>();
    const comprasEvento = new Map<number, number>();
    for (const p of pasos) {
      sesionesPor.get(p.paso)?.add(p.sesion);
      const t = p.creado.getTime();
      const s = primera.get(p.sesion) ?? new Map<PasoEmbudo, number>();
      if (!s.has(p.paso) || t < s.get(p.paso)!) s.set(p.paso, t);
      primera.set(p.sesion, s);
      if (p.idEvents && p.paso === 'evento') {
        const set = vistasEvento.get(p.idEvents) ?? new Set<string>();
        vistasEvento.set(p.idEvents, set.add(p.sesion));
      }
      if (p.idEvents && p.paso === 'pagado') {
        comprasEvento.set(p.idEvents, (comprasEvento.get(p.idEvents) ?? 0) + 1);
      }
    }
    const tiemposCompra: number[] = [];
    for (const s of primera.values()) {
      const inicio = s.get('entradas');
      const fin = s.get('pagado');
      if (inicio && fin && fin > inicio && fin - inicio < MAX_COMPRA_MS) {
        tiemposCompra.push((fin - inicio) / 1000);
      }
    }

    // Solo eventos que siguen existiendo y no estan borrados (activo = 1).
    const nombres = vistasEvento.size
      ? new Map(
          (
            await this.dataSource.query<{ idEvents: number; name: string }[]>(
              'SELECT idEvents, name FROM events WHERE activo = 1 AND idEvents IN (?)',
              [[...vistasEvento.keys()]],
            )
          ).map((e) => [e.idEvents, e.name]),
        )
      : new Map<number, string>();
    const top = [...vistasEvento.entries()]
      .filter(([idEvents]) => nombres.has(idEvents))
      .map(([idEvents, s]) => ({ idEvents, visitas: s.size }))
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, 5);

    // ---- Espera del cliente hasta que el admin revisa su pago ----
    const revisados = await this.dataSource.query<
      { date: Date; revisado: Date }[]
    >(
      'SELECT `date`, revisado FROM payment WHERE revisado >= ? AND isDeleted = 0',
      [desde],
    );
    const esperas = revisados
      .map(
        (r) =>
          (new Date(r.revisado).getTime() - new Date(r.date).getTime()) / 1000,
      )
      .filter((s) => s >= 0);
    const [pend] = await this.dataSource.query<
      { n: string | number; masAntiguo: Date | null }[]
    >(
      "SELECT COUNT(*) n, MIN(`date`) masAntiguo FROM payment WHERE status = 'Pendiente' AND isDeleted = 0",
    );

    return {
      dias,
      desde,
      ...(await this.activas()),
      visitas: visitas.length,
      visitantes: visitantes.size,
      recurrentes: Math.min(Number(recurrentes), visitantes.size),
      paginasPorVisita: visitas.length
        ? Math.round((paginas / visitas.length) * 10) / 10
        : 0,
      rebote: visitas.length ? Math.round((rebotes / visitas.length) * 100) : 0,
      duracionPromedioSeg: promedio(duraciones),
      horaPico: pico > 0 ? porHora.indexOf(pico) : null,
      porHora,
      calor,
      porDia: [...porDia].map(([fecha, n]) => ({ fecha, visitas: n })),
      dispositivos,
      embudo: PASOS_EMBUDO.map((paso) => ({
        paso,
        sesiones: sesionesPor.get(paso)!.size,
      })),
      compra: {
        compras: sesionesPor.get('pagado')!.size,
        promedioSeg: promedio(tiemposCompra),
        medianaSeg: mediana(tiemposCompra),
      },
      verificacion: {
        revisados: esperas.length,
        promedioSeg: promedio(esperas),
        medianaSeg: mediana(esperas),
        pendientes: Number(pend.n),
        esperaMasLargaSeg: pend.masAntiguo
          ? Math.max(
              0,
              Math.round(
                (Date.now() - new Date(pend.masAntiguo).getTime()) / 1000,
              ),
            )
          : null,
      },
      topEventos: top.map((t) => ({
        ...t,
        nombre: nombres.get(t.idEvents)!,
        compras: comprasEvento.get(t.idEvents) ?? 0,
      })),
    };
  }
}
