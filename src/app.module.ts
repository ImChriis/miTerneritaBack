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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TicketsModule } from './tickets/tickets.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
    }),
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
    MailModule,
    TicketsModule,
  ],
})
export class AppModule {}
