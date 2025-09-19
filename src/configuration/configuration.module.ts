import { Module } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { ConfigurationController } from './configuration.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Configuration } from './entities/configuration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Configuration])],
  providers: [ConfigurationService],
  controllers: [ConfigurationController],
  exports: [ConfigurationService, TypeOrmModule],
})
export class ConfigurationModule {}
