import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuration } from './entities/configuration.entity';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectRepository(Configuration)
    private configurationRepository: Repository<Configuration>,
  ) {}

  async getConfiguration(): Promise<Configuration> {
    // Asumimos que solo hay un registro de configuración
    const config = await this.configurationRepository.findOne({ where: {} });
    if (!config) {
      throw new NotFoundException('Configuración no encontrada');
    }
    return config;
  }

  async update(
    updateConfigurationDto: UpdateConfigurationDto,
  ): Promise<Configuration> {
    let config = await this.configurationRepository.findOne({ where: {} });
    if (!config) {
      // Si no existe, crear uno nuevo
      config = this.configurationRepository.create(updateConfigurationDto);
    } else {
      Object.assign(config, updateConfigurationDto);
    }
    return this.configurationRepository.save(config);
  }
}
