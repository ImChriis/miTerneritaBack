import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asiento } from './entities/asiento.entity';
import { MesaZona } from './entities/mesa-zona.entity';
import { SalonService } from './salon.service';
import { SalonController } from './salon.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Asiento, MesaZona])],
  providers: [SalonService],
  controllers: [SalonController],
  exports: [SalonService],
})
export class SalonModule {}
