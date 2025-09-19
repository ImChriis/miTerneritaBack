import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Code } from './entities/code.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CreateCodeDto } from './dto/create-code.dto';

@Injectable()
export class CodeService {
  constructor(
    @InjectRepository(Code)
    private codeRepository: Repository<Code>,

    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async create(createCodeDto: CreateCodeDto): Promise<Code> {
    const payment = await this.paymentRepository.findOne({
      where: { id: createCodeDto.idPayment },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const code = this.codeRepository.create({
      QR: createCodeDto.QR,
      payment,
    });

    return this.codeRepository.save(code);
  }

  async findAll(): Promise<Code[]> {
    return this.codeRepository.find({ relations: ['payment'] });
  }

  async findOne(id: number): Promise<Code> {
    const code = await this.codeRepository.findOne({
      where: { id },
      relations: ['payment'],
    });
    if (!code) {
      throw new NotFoundException('Código no encontrado');
    }
    return code;
  }

  async remove(id: number): Promise<void> {
    const code = await this.findOne(id);
    await this.codeRepository.remove(code);
  }
}
