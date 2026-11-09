import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService, templateDir } from './mail.service';
import { ConfigModule } from '@nestjs/config';
import { HandlebarsAdapter } from './handlebars.adapter';
import { MailController } from './mail.controller';
import { ResendTransport } from './resend.transport';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailerModule.forRoot({
      // Con RESEND_API_KEY se envía por la API de Resend; sin ella, por SMTP (MAIL_*).
      transport: process.env.RESEND_API_KEY
        ? new ResendTransport(process.env.RESEND_API_KEY)
        : {
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            auth: {
              user: process.env.MAIL_USER,
              pass: process.env.MAIL_PASSWORD,
            },
            secure: false, // true for 465, false for other ports
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
          },
      defaults: {
        // Remitente: cámbialo en MAIL_FROM cuando tengas dominio verificado en
        // Resend (p. ej. "Mi Ternerita House <no-reply@tudominio.com>").
        // onboarding@resend.dev solo entrega al correo dueño de la cuenta Resend.
        from:
          process.env.MAIL_FROM ??
          (process.env.RESEND_API_KEY
            ? 'Mi Ternerita House <onboarding@resend.dev>'
            : `"Mi Ternerita House" <${process.env.MAIL_USER}>`),
      },
      template: {
        dir: templateDir,
        adapter: new HandlebarsAdapter(templateDir),
        options: {
          strict: true,
        },
      },
    }),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
