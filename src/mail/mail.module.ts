import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService, templateDir } from './mail.service';
import { ConfigModule } from '@nestjs/config';
import { HandlebarsAdapter } from './handlebars.adapter';
import { MailController } from './mail.controller';
import { resendTransport } from './resend.transport';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailerModule.forRoot({
      // MAIL_PROVIDER=resend envia por la API HTTPS de Resend (Railway bloquea
      // SMTP); sin definir sigue el SMTP de siempre.
      transport:
        process.env.MAIL_PROVIDER === 'resend'
          ? resendTransport(process.env.RESEND_API_KEY ?? '')
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
        from:
          process.env.MAIL_FROM ||
          `"Mi Ternerita House" <${process.env.MAIL_USER}>`,
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
