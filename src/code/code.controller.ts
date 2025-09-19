import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CodeService } from './code.service';
import { CreateCodeDto } from './dto/create-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('codes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  @Get()
  @Roles('admin')
  async findAll() {
    return this.codeService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.codeService.findOne(id);
  }

  @Post()
  @Roles('admin')
  async create(@Body() createCodeDto: CreateCodeDto) {
    return this.codeService.create(createCodeDto);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.codeService.remove(id);
    return { message: 'Código eliminado correctamente' };
  }
}
