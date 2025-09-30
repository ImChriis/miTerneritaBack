import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { EventsModule } from './events/events.module';
import { TicketsModule } from './tickets/tickets.module';
import { FoodModule } from './food/food.module';
import { DrinksModule } from './drinks/drinks.module';
import { ConsumeDetailsModule } from './consumeDetails/consumeDetails.module';
import { PaymentsModule } from './payments/payments.module';
import { PaymentDetailsModule } from './payment-details/payment-details.module';
import { PaymentMethodModule } from './payment-method/payment-method.module';
import { CodeModule } from './code/code.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { MailService } from './mail/mail.service';  

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',  // Servidor SMTP de Gmail
        port: 587,               
        secure: false,           // true para puerto 465 (SSL), false para 587 (TLS)
        auth: {
          user: process.env.MAIL_FROM,  // vitalsense2025@gmail.com
          pass: process.env.MAIL_PASSWORD,  // ecub jsrn xyct dcne
        },
      },
      defaults: {
        from: '"VitalSense" <vitalsense2025@gmail.com>',  // From amigable para inbox
      },
      template: {
        dir: join(__dirname, 'mail/templates'),  // Carpeta para plantillas Handlebars (opcional)
        adapter: new HandlebarsAdapter(),        // Usa Handlebars para HTML
        options: {
          strict: true,
        },
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    EventsModule,
    TicketsModule,
    FoodModule,
    DrinksModule,
    ConsumeDetailsModule,
    PaymentsModule,
    PaymentDetailsModule,
    PaymentMethodModule,
    CodeModule,
    ConfigurationModule,
  ],
  controllers: [],
  providers: [MailService],
  exports: [MailService],
})
export class AppModule {}
