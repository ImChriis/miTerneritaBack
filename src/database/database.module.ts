import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Event } from '../events/entities/event.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Food } from '../food/entities/food.entity';
import { Drink } from '../drinks/entities/drink.entity';
import { ConsumeDetails } from '../consumeDetails/entities/consumeDetail.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Code } from '../code/entities/code.entity';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import { PaymentMethod } from '../payment-method/entities/paymentMethod.entity';
import { Configuration } from '../configuration/entities/configuration.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mariadb',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [
          User,
          Role,
          Event,
          Ticket,
          Food,
          Drink,
          ConsumeDetails,
          Payment,
          Code,
          PaymentDetails,
          PaymentMethod,
          Configuration,
        ],
        synchronize: false, // En producción. debe ser false, en dev true si quieres auto crear tablas
        logging: true,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
