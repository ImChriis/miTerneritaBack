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
import { R2_ACTIVO } from './common/uploads/r2';
import { ImagenesController } from './common/uploads/imagenes.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { TicketsModule } from './tickets/tickets.module';
import { MailModule } from './mail/mail.module';
import { PostulacionesModule } from './postulaciones/postulaciones.module';
import { SalonModule } from './salon/salon.module';
import { VisitasModule } from './visitas/visitas.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { validateEnv } from './config/env.validation';
import { REPO_IMAGES_DIR, UPLOADS_DIR } from './common/uploads/webp-upload';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    // Se sirve únicamente la carpeta de imágenes. Antes se exponía todo
    // src/assets, que incluía el volcado de la base de datos (ternera.sql).
    // Las URLs públicas no cambian: siguen siendo /assets/img/<archivo>.
    // Primero las subidas (IMAGES_DIR, el volumen en Railway) y luego las
    // imagenes del repo. `exclude` evita que el 404 de la primera entrada
    // responda antes de mirar en la segunda.
    ServeStaticModule.forRoot(
      {
        rootPath: UPLOADS_DIR,
        serveRoot: '/assets/img',
        exclude: ['/assets/img/{*any}'],
      },
      {
        rootPath: REPO_IMAGES_DIR,
        serveRoot: '/assets/img',
        // Con R2, lo que no esta en disco lo redirige ImagenesController al bucket.
        ...(R2_ACTIVO && { exclude: ['/assets/img/{*any}'] }),
      },
    ),
    // Tareas programadas (tasa BCV).
    ScheduleModule.forRoot(),
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
            ttl: Number(configService.get<string>('THROTTLE_TTL') ?? 60) * 1000,
            limit: Number(configService.get<string>('THROTTLE_LIMIT') ?? 30),
          },
        ],
      }),
    }),
    MailModule,
    TicketsModule,
    PostulacionesModule,
    SalonModule,
    VisitasModule,
  ],
  controllers: [ImagenesController],
  providers: [
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
