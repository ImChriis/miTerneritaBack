import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Code } from './entities/code.entity';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [TypeOrmModule.forFeature([Code]), 
  forwardRef(() => PaymentsModule)],
  
  providers: [],
  controllers: [],
  exports: [TypeOrmModule],
})
export class CodeModule {}
