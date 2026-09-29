import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Payment,
  PaymentStatus,
} from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  private payments: Payment[] = [];
  private nextId = 1;

  create(createPaymentDto: CreatePaymentDto): Payment {
    const now = new Date();

    const payment: Payment = {
      id: this.nextId++,
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      status: createPaymentDto.status ?? PaymentStatus.PENDING,
      description: createPaymentDto.description,
      createdAt: now,
      updatedAt: now,
    };

    this.payments.push(payment);

    return payment;
  }

  findAll(): Payment[] {
    return this.payments;
  }

  findOne(id: number): Payment {
    const payment = this.payments.find((payment) => payment.id === id);

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return payment;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto): Payment {
    const payment = this.findOne(id);

    Object.assign(payment, updatePaymentDto);
    payment.updatedAt = new Date();

    return payment;
  }

  remove(id: number): void {
    const index = this.payments.findIndex((payment) => payment.id === id);

    if (index === -1) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    this.payments.splice(index, 1);
  }
}
