import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Postulacion } from './entities/postulacion.entity';
import { Configuration } from '../configuration/entities/configuration.entity';
import { PostulacionesService } from './postulaciones.service';
import { PostulacionesController } from './postulaciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Postulacion, Configuration])],
  providers: [PostulacionesService],
  controllers: [PostulacionesController],
})
export class PostulacionesModule {}
