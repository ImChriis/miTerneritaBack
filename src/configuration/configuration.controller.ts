import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { TasaBcvService } from './tasa-bcv.service';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('configuration')
export class ConfigurationController {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly tasaBcvService: TasaBcvService,
  ) {}

  @Get()
  async getConfiguration() {
    return this.configurationService.getConfiguration();
  }

  /** Boton "actualizar tasa" del dashboard: pide la tasa BCV ya, sin esperar al cron. */
  @Post('tasa-bcv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  async refrescarTasa() {
    await this.tasaBcvService.actualizar(true);
    return this.configurationService.getConfiguration();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(@Body() updateConfigurationDto: UpdateConfigurationDto) {
    return this.configurationService.update(updateConfigurationDto);
  }
}
