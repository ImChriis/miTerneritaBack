import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Food } from '../food/entities/food.entity';
import { Drink } from '../drinks/entities/drink.entity';
import { ConsumeDetails } from '../consumeDetails/entities/consumeDetail.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Code } from '../code/entities/code.entity';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import { PaymentMethod } from '../payment-method/entities/paymentMethod.entity';
import { Configuration } from '../configuration/entities/configuration.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [
          User,
          Event,
          Food,
          Drink,
          Ticket,
          ConsumeDetails,
          Payment,
          Code,
          PaymentDetails,
          PaymentMethod,
          Configuration,
        ],
        synchronize: false, // En producción debe ser false, en dev true si quieres auto crear tablas
        logging: configService.get<string>('NODE_ENV') === 'development',
        
        //Config para TiDB
        ssl: {
          rejectUnauthorized: true,
        },
        extra: {
          ssl: {
            rejectUnauthorized: true,
          },
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}