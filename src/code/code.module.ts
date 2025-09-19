import { Module, forwardRef } from '@nestjs/common';
import { CodeService } from './code.service';
import { CodeController } from './code.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Code } from './entities/code.entity';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [TypeOrmModule.forFeature([Code]), 
  forwardRef(() => PaymentsModule)],
  
  providers: [CodeService],
  controllers: [CodeController],
  exports: [CodeService, TypeOrmModule],
})
export class CodeModule {}
