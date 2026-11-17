import { Controller, Get, Header } from '@nestjs/common';
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
