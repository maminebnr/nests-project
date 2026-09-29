export enum PaymentStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded',
  }
  
  export class Payment {
    id: number;
    amount: number;
    currency: string;
    status: PaymentStatus;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
  }
  