import { PaymentStatus } from '../entities/payment.entity';

export class CreatePaymentDto {
  amount: number;
  currency: string;
  status?: PaymentStatus;
  description?: string;
}
