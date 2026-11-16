import { Module } from '@nestjs/common';
import { VisitasService } from './visitas.service';
import { VisitasController } from './visitas.controller';

@Module({
  providers: [VisitasService],
  controllers: [VisitasController],
})
export class VisitasModule {}
