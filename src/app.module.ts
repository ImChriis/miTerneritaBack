import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { FoodModule } from './food/food.module';
import { DrinksModule } from './drinks/drinks.module';
import { ConsumeDetailsModule } from './consumeDetails/consumeDetails.module';
import { PaymentsModule } from './payments/payments.module';
import { PaymentDetailsModule } from './payment-details/payment-details.module';
import { PaymentMethodModule } from './payment-method/payment-method.module';
import { CodeModule } from './code/code.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { MailService } from './mail/mail.service';
import { MailController } from './mail/mail.controller'; 
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [ ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'src', 'assets'),
      serveRoot: '/assets',
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    EventsModule,
    FoodModule,
    DrinksModule,
    ConsumeDetailsModule,
    PaymentsModule,
    PaymentDetailsModule,
    PaymentMethodModule,
    CodeModule,
    ConfigurationModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(configService.get<string>('THROTTLE_TTL') ?? 60),
            limit: Number(configService.get<string>('THROTTLE_LIMIT') ?? 30),
          },
        ],
      }),
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,  
        port: Number(process.env.MAIL_PORT),               
        secure: false, // true para puerto 465 (SSL), false para 587 (TLS)
        auth: {
          user: process.env.MAIL_USER, // josecaherofficial@gmail.com
          pass: process.env.MAIL_PASSWORD, // smvt qult bmel uigc
        },
      },
      defaults: {
        from: '"Mi Ternerita House" <${process.env.MAIL_FROM}>',  // From amigable para inbox
      },
      //
    }),
  ],
  controllers: [MailController],
  providers: [
    MailService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [MailService],
})
export class AppModule {}