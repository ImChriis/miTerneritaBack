import type { Transport } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

type Address = { name?: string; address: string };

const fmt = (a: Address | string) =>
  typeof a === 'string' ? a : a.name ? `${a.name} <${a.address}>` : a.address;

/**
 * Transporte de nodemailer que envia por la API HTTPS de Resend. Railway Hobby
 * bloquea el SMTP saliente, asi que en produccion el correo va por aqui.
 * Las plantillas Handlebars ya llegan renderizadas en mail.data.html (paso
 * 'compile' del MailerModule), por eso los servicios no cambian.
 */
export function resendTransport(apiKey: string): Transport {
  return {
    name: 'resend',
    version: '1.0.0',
    send(mail, callback) {
      // normalize deja html como string, adjuntos en base64 y direcciones como objetos.
      mail.normalize((err, data?: Mail.Options) => {
        if (err || !data)
          return callback(err ?? new Error('Correo vacio'), null);
        const list = (v: unknown) =>
          v
            ? ([] as (Address | string)[]).concat(v as Address).map(fmt)
            : undefined;

        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fmt(data.from as Address),
            to: list(data.to),
            cc: list(data.cc),
            bcc: list(data.bcc),
            reply_to: list(data.replyTo),
            subject: data.subject,
            html: data.html,
            text: data.text,
            attachments: data.attachments?.map((a) => ({
              filename: a.filename,
              content: a.content,
              content_type: a.contentType,
              // Imagen en linea: la plantilla la referencia como cid:<content_id>.
              content_id: a.cid,
            })),
          }),
        })
          .then(async (res) => {
            const body = await res.text();
            if (!res.ok) throw new Error(`Resend ${res.status}: ${body}`);
            callback(null, JSON.parse(body));
          })
          .catch((e: unknown) =>
            callback(e instanceof Error ? e : new Error(String(e)), null),
          );
      });
    },
  };
}
