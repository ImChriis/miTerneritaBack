import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CodeService } from './code.service';
import { ValidateCodeDto } from './dto/validate-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('code')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  /**
   * Escaneo en puerta: se envia el token que lleva el QR y se marca la
   * entrada como usada. Un segundo intento con el mismo token responde 409.
   */
  @Post('validate')
  @Roles('admin')
  async validate(@Body() validateCodeDto: ValidateCodeDto) {
    return this.codeService.validate(validateCodeDto.token);
  }

  /**
   * Reenvia la entrada de un pago ya aprobado. No genera un token nuevo.
   */
  @Post('payment/:idPayment/resend')
  @Roles('admin')
  async resend(@Param('idPayment', ParseIntPipe) idPayment: number) {
    await this.codeService.issueForPayment(idPayment);
    return { message: 'Entrada enviada correctamente' };
  }
}
