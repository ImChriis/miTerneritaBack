import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TicketsModule } from './tickets/tickets.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from './mail/mail.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    // Se sirve únicamente la carpeta de imágenes. Antes se exponía todo
    // src/assets, que incluía el volcado de la base de datos (ternera.sql).
    // Las URLs públicas no cambian: siguen siendo /assets/img/<archivo>.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'src', 'assets', 'img'),
      serveRoot: '/assets/img',
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
            // THROTTLE_TTL se expresa en segundos en el .env, pero
            // @nestjs/throttler v6 espera milisegundos. Sin esta conversion
            // la ventana duraba 60 ms y el limite no se alcanzaba nunca.
            ttl: Number(configService.get<string>('THROTTLE_TTL') ?? 60) * 1000,
            limit: Number(configService.get<string>('THROTTLE_LIMIT') ?? 30),
          },
        ],
      }),
    }),
    MailModule,
    TicketsModule,
  ],
  providers: [
    // ThrottlerModule ya estaba configurado, pero el guard nunca se registró,
    // así que el rate limiting no se aplicaba a ninguna ruta (incluido /auth/login).
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
  }
}
