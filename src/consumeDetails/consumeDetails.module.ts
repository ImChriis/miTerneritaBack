import { Module } from '@nestjs/common';
import { ConsumeDetailsService } from './consumeDetails.service';
import { ConsumeDetailsController } from './consumeDetails.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumeDetails } from './entities/consumeDetail.entity';
import { Food } from '../food/entities/food.entity';
import { Drink } from '../drinks/entities/drink.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConsumeDetails, Food, Drink, Payment])],
  providers: [ConsumeDetailsService],
  controllers: [ConsumeDetailsController],
  exports: [ConsumeDetailsService, TypeOrmModule],
})
export class ConsumeDetailsModule {}
