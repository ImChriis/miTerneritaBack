import { PartialType } from '@nestjs/mapped-types';
import { CreateConsumeDetailDto } from './create-consumeDetail.dto';

export class UpdateConsumeDetailDto extends PartialType(
  CreateConsumeDetailDto,
) {}
