export enum ReservationStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export class Reservation {
  id: number;
  bookId: number;
  memberName: string;
  startDate: Date;
  endDate: Date;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
