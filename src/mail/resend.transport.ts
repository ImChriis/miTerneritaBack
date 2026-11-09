import { readFile } from 'fs/promises';
import { Resend } from 'resend';

interface Adjunto {
  filename?: string;
  content?: Buffer | string;
  path?: string;
  cid?: string;
}

/** Lo que nodemailer entrega al transporte, ya con la plantilla compilada en `html`. */
interface Correo {
  data: {
    from?: string;
    to?: string | string[];
    subject?: string;
    html?: string | Buffer;
    text?: string;
    attachments?: Adjunto[];
  };
}

const texto = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : []);

/**
 * Transporte de nodemailer que envía por la API HTTPS de Resend en vez de SMTP
 * (Render en plan gratis bloquea los puertos SMTP). MailerModule sigue
 * compilando las plantillas Handlebars; aquí solo se entrega el correo.
 */
export class ResendTransport {
  readonly name = 'resend';
  readonly version = '1';
  private readonly resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  send(mail: Correo, callback: (err: Error | null, info?: unknown) => void) {
    this.enviar(mail).then(
      (info) => callback(null, info),
      (err: unknown) =>
        callback(err instanceof Error ? err : new Error(String(err))),
    );
  }

  private async enviar({ data }: Correo) {
    const attachments = await Promise.all(
      (data.attachments ?? []).map(async (a) => ({
        filename: a.filename,
        content: a.content ?? (a.path ? await readFile(a.path) : undefined),
        // Imágenes en línea: el HTML las referencia como cid:<contentId>.
        contentId: a.cid,
      })),
    );

    const { data: enviado, error } = await this.resend.emails.send({
      from: data.from ?? '',
      to: texto(data.to),
      subject: data.subject ?? '',
      html: data.html?.toString(),
      text: data.text,
      attachments,
    } as Parameters<Resend['emails']['send']>[0]);

    if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
    return { messageId: enviado?.id };
  }
}
