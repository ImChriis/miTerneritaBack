import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { HandlebarsAdapter } from './handlebars.adapter';
import { MailController } from './mail.controller';

const templateDir =
  process.env.NODE_ENV === 'production'
    ? join(__dirname, 'templates')
    : join(process.cwd(), 'src', 'mail', 'templates');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
        secure: false, // true for 465, false for other ports
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000, // 10 seconds
        socketTimeout: 10000, // 10 seconds
      },
      defaults: {
        from: `"No Reply" <${process.env.MAIL_USER}>`,
      },
      template: {
        dir:
          process.env.NODE_ENV === 'production'
            ? join(__dirname, 'templates') // cuando corre desde dist/mail
            : join(process.cwd(), 'src', 'mail', 'templates'), // en dev lee desde src
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
