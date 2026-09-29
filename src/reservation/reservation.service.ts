import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookService } from '../book/book.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Reservation, ReservationStatus } from './entities/reservation.entity';

@Injectable()
export class ReservationService {
  private reservations: Reservation[] = [];
  private nextId = 1;

  constructor(private readonly bookService: BookService) {}

  create(createReservationDto: CreateReservationDto) {
    const bookId = Number(createReservationDto.bookId);
    const memberName = this.parseMemberName(createReservationDto.memberName);
    const { startDate, endDate } = this.parseDates(
      createReservationDto.startDate,
      createReservationDto.endDate,
    );
    this.ensureBookAvailable(bookId);

    const now = new Date();
    const reservation: Reservation = {
      id: this.nextId++,
      bookId,
      memberName,
      startDate,
      endDate,
      status: ReservationStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.reservations.push(reservation);
    return reservation;
  }

  findAll() {
    return this.reservations.filter((r) => r.deletedAt === null);
  }

  findByBook(bookId: number) {
    return this.findAll().filter((r) => r.bookId === bookId);
  }

  findOne(id: number) {
    const reservation = this.reservations.find(
      (r) => r.id === id && r.deletedAt === null,
    );
    if (!reservation) {
      throw new NotFoundException(`Reservation #${id} not found`);
    }
    return reservation;
  }

  update(id: number, updateReservationDto: UpdateReservationDto) {
    const reservation = this.findActive(id);

    const memberName =
      updateReservationDto.memberName !== undefined
        ? this.parseMemberName(updateReservationDto.memberName)
        : reservation.memberName;
    const { startDate, endDate } = this.parseDates(
      updateReservationDto.startDate ?? reservation.startDate.toISOString(),
      updateReservationDto.endDate ?? reservation.endDate.toISOString(),
    );
    const bookId =
      updateReservationDto.bookId !== undefined
        ? Number(updateReservationDto.bookId)
        : reservation.bookId;
    if (bookId !== reservation.bookId) {
      this.ensureBookAvailable(bookId);
    }

    Object.assign(reservation, {
      bookId,
      memberName,
      startDate,
      endDate,
      updatedAt: new Date(),
    });
    return reservation;
  }

  cancel(id: number) {
    return this.changeStatus(id, ReservationStatus.CANCELLED);
  }

  complete(id: number) {
    return this.changeStatus(id, ReservationStatus.COMPLETED);
  }

  remove(id: number) {
    const reservation = this.findOne(id);
    reservation.deletedAt = new Date();
    return reservation;
  }

  private findActive(id: number) {
    const reservation = this.findOne(id);
    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new BadRequestException(
        `Reservation #${id} is already ${reservation.status}`,
      );
    }
    return reservation;
  }

  private changeStatus(id: number, status: ReservationStatus) {
    const reservation = this.findActive(id);
    reservation.status = status;
    reservation.updatedAt = new Date();
    return reservation;
  }

  private ensureBookAvailable(bookId: number) {
    const book = this.bookService
      .findAll()
      .find((b) => b.id === bookId && b.deletedAt === null);
    if (!book) {
      throw new NotFoundException(`Book #${bookId} not found`);
    }
    const activeCount = this.findByBook(bookId).filter(
      (r) => r.status === ReservationStatus.ACTIVE,
    ).length;
    if (activeCount >= book.quantity) {
      throw new ConflictException(`No copies of book #${bookId} available`);
    }
  }

  private parseMemberName(memberName: string | undefined) {
    if (typeof memberName !== 'string' || !memberName.trim()) {
      throw new BadRequestException('memberName is required');
    }
    return memberName.trim();
  }

  private parseDates(start: string | undefined, end: string | undefined) {
    const startDate = new Date(start ?? '');
    const endDate = new Date(end ?? '');
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException(
        'startDate and endDate must be valid dates',
      );
    }
    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }
    return { startDate, endDate };
  }
}
