import { Controller, Get, Header, Redirect } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';

const SITIO = 'https://miternerita.app';
const FIJAS = [
  '/',
  '/home/contact',
  '/trabaja-con-nosotros',
  '/legal/terminos',
  '/legal/privacidad',
  '/legal/aviso-legal',
];

/**
 * Sitemap para Google: paginas fijas y la ficha de cada evento activo. Lo
 * enlaza el robots.txt del front (Search Console acepta el subdominio api
 * porque la propiedad es de dominio).
 */
@Controller()
export class SitemapController {
  constructor(
    @InjectRepository(Event) private readonly events: Repository<Event>,
  ) {}

  /** La raiz de la API no es una pagina: Google la reportaba como 404. Se manda a la web. */
  @Get()
  @Redirect(SITIO, 301)
  raiz() {}

  /**
   * La API no se indexa (sus respuestas son JSON); solo las imagenes de los
   * eventos, que la web enlaza desde /assets/img y salen en Google Imagenes.
   */
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  robots(): string {
    return 'User-agent: *\nAllow: /assets/img/\nAllow: /sitemap.xml\nDisallow: /\n';
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap(): Promise<string> {
    const eventos = await this.events.find({
      where: { status: 1 },
      select: { idEvents: true },
    });
    const urls = [
      ...FIJAS.map((p) => `${SITIO}${p}`),
      ...eventos.map((e) => `${SITIO}/home/event/${e.idEvents}`),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
  }
}
