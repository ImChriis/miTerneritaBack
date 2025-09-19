import { PipeTransform, BadRequestException } from '@nestjs/common';

export class WebpFileValidationPipe implements PipeTransform {
  transform(value: any) {
    if (!value) {
      return value;
    }
    const isValid = typeof value === 'string' && /\.webp$/i.test(value);
    if (!isValid) {
      throw new BadRequestException('El archivo debe ser formato .webp');
    }
    return value;
  }
}
